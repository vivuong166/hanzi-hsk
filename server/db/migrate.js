import 'dotenv/config'
import { createHash } from 'node:crypto'
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createDatabasePool } from './connection.js'

const moduleDirectory = path.dirname(fileURLToPath(import.meta.url))
export const migrationsDirectory = path.join(moduleDirectory, 'migrations')

export async function loadMigrations(directory = migrationsDirectory) {
  const names = (await readdir(directory)).filter((name) => /^\d{3}_[a-z0-9_]+\.sql$/i.test(name)).sort()
  const ids = new Set()
  const migrations = []
  for (const name of names) {
    const id = name.slice(0, 3)
    if (ids.has(id)) throw new Error(`Duplicate migration ID ${id}`)
    ids.add(id)
    const sql = await readFile(path.join(directory, name), 'utf8')
    migrations.push({ id, name, sql, checksum: createHash('sha256').update(sql).digest('hex') })
  }
  return migrations
}

export async function applyMigrations(client, migrations) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id VARCHAR(32) PRIMARY KEY,
      name TEXT NOT NULL,
      checksum CHAR(64) NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)
  const existingResult = await client.query('SELECT id, checksum FROM schema_migrations')
  const existing = new Map(existingResult.rows.map((row) => [row.id, row.checksum]))
  const applied = []

  for (const migration of migrations) {
    const previousChecksum = existing.get(migration.id)
    if (previousChecksum) {
      if (previousChecksum !== migration.checksum) throw new Error(`Checksum mismatch for applied migration ${migration.name}`)
      continue
    }
    await client.query('BEGIN')
    try {
      await client.query(migration.sql)
      await client.query(
        'INSERT INTO schema_migrations (id, name, checksum) VALUES ($1, $2, $3)',
        [migration.id, migration.name, migration.checksum],
      )
      await client.query('COMMIT')
      applied.push(migration.name)
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    }
  }
  return applied
}

async function main() {
  const pool = createDatabasePool()
  const client = await pool.connect()
  try {
    const applied = await applyMigrations(client, await loadMigrations())
    console.log(applied.length ? `Applied migrations: ${applied.join(', ')}` : 'Database schema is already current.')
  } finally {
    client.release()
    await pool.end()
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => { console.error('Database migration failed:', error); process.exitCode = 1 })
}
