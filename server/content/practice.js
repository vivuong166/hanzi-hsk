import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const practiceSourcePath = path.join(projectRoot, 'src', 'content', 'practice.ts')
let exercisePromise

export async function loadPracticeExercises(sourcePath = practiceSourcePath) {
  const source = await readFile(sourcePath, 'utf8')
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText
  const module = { exports: {} }
  new Function('exports', 'module', compiled)(module.exports, module)
  const exercises = module.exports.exercises
  if (!Array.isArray(exercises) || exercises.length === 0) throw new Error('Practice source has no exercises')
  return exercises
}

export function getPracticeExercises() {
  exercisePromise ??= loadPracticeExercises()
  return exercisePromise
}
