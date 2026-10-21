import { describe, expect, it } from 'vitest'
import { loadPracticeExercises } from './practice.js'

describe('server practice source loader', () => {
  it('uses the same curated exercises as the V2 client', async () => {
    const exercises = await loadPracticeExercises()
    expect(exercises.map((exercise) => exercise.id)).toEqual(['ex-suiran-1', 'ex-jingyan-1', 'ex-ba-1', 'ex-cai-1'])
  })
})
