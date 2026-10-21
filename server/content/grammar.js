import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const grammarSourcePath = path.join(projectRoot, 'src', 'content', 'grammar.ts')
let grammarPromise

export async function loadGrammarPoints(sourcePath = grammarSourcePath) {
  const source = await readFile(sourcePath, 'utf8')
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText
  const module = { exports: {} }
  new Function('exports', 'module', compiled)(module.exports, module)
  const grammar = module.exports.grammar
  if (!Array.isArray(grammar) || grammar.length === 0) throw new Error('Grammar source has no grammar points')
  return grammar
}

export function getGrammarPoints() {
  grammarPromise ??= loadGrammarPoints()
  return grammarPromise
}
