import 'dotenv/config'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { createDatabasePool } from './connection.js'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
export const inventorySourcePath = path.join(projectRoot, 'src', 'content', 'hsk4-2015.ts')
export const aliasesSourcePath = path.join(projectRoot, 'src', 'content', 'legacy-vocabulary-aliases.ts')
const curriculumId = 'hsk-2.0-2015'
const contentRelease = 'hsk-2.0-2015.r1'

export async function loadHsk2Inventory(sourcePath = inventorySourcePath) {
  const source = await readFile(sourcePath, 'utf8')
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText
  const module = { exports: {} }
  new Function('exports', 'module', compiled)(module.exports, module)
  const inventory = module.exports.hsk2Hsk4Inventory
  if (!Array.isArray(inventory) || inventory.length !== 1200) throw new Error('HSK 2.0 inventory must contain exactly 1,200 items')
  return inventory
}

export async function loadLegacyVocabularyAliases(sourcePath = aliasesSourcePath) {
  const source = await readFile(sourcePath, 'utf8')
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText
  const module = { exports: {} }
  new Function('exports', 'module', compiled)(module.exports, module)
  const aliases = module.exports.legacyVocabularyAliases
  if (!Array.isArray(aliases) || aliases.length !== 11) throw new Error('Expected exactly 11 V1 vocabulary aliases')
  return aliases
}

export async function seedHsk2VocabularyEntries(client, inventory) {
  for (let start = 0; start < inventory.length; start += 200) {
    const batch = inventory.slice(start, start + 200)
    await client.query(
      `INSERT INTO vocabulary_entries (
        curriculum_id, source_index, legacy_id, hanzi, official_label, introduced_level, content_release
      )
      SELECT * FROM UNNEST($1::text[], $2::integer[], $3::text[], $4::text[], $5::text[], $6::smallint[], $7::text[])
      ON CONFLICT (curriculum_id, source_index) DO UPDATE SET
        legacy_id = EXCLUDED.legacy_id,
        hanzi = EXCLUDED.hanzi,
        official_label = EXCLUDED.official_label,
        introduced_level = EXCLUDED.introduced_level,
        content_release = EXCLUDED.content_release`,
      [
        batch.map(() => curriculumId),
        batch.map((item) => item.sourceIndex),
        batch.map((item) => item.id),
        batch.map((item) => item.hanzi),
        batch.map((item) => item.officialLabel),
        batch.map((item) => item.introducedAtLevel),
        batch.map(() => contentRelease),
      ],
    )
  }
}

export async function seedLegacyVocabularyAliases(client, inventory, aliases) {
  const sourceIndexByHanzi = new Map(inventory.map((item) => [item.hanzi, item.sourceIndex]))
  const rows = aliases.map((alias) => {
    const sourceIndex = sourceIndexByHanzi.get(alias.hanzi)
    if (!sourceIndex) throw new Error(`Cannot map V1 alias ${alias.legacyId} to a canonical source index`)
    return { ...alias, sourceIndex }
  })
  await client.query(
    `INSERT INTO vocabulary_legacy_aliases (legacy_id, curriculum_id, source_index)
     SELECT * FROM UNNEST($1::text[], $2::text[], $3::integer[])
     ON CONFLICT (legacy_id) DO UPDATE SET curriculum_id = EXCLUDED.curriculum_id, source_index = EXCLUDED.source_index`,
    [rows.map((row) => row.legacyId), rows.map(() => curriculumId), rows.map((row) => row.sourceIndex)],
  )
}

async function main() {
  const pool = createDatabasePool()
  const client = await pool.connect()
  try {
    const inventory = await loadHsk2Inventory()
    const aliases = await loadLegacyVocabularyAliases()
    await client.query('BEGIN')
    try {
      await seedHsk2VocabularyEntries(client, inventory)
      await seedLegacyVocabularyAliases(client, inventory, aliases)
      await client.query('COMMIT')
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    }
    console.log(`Seeded ${inventory.length} HSK 2.0/2015 vocabulary identities.`)
  } finally {
    client.release()
    await pool.end()
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => { console.error('Content seed failed:', error); process.exitCode = 1 })
}
