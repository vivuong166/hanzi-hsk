import { describe, expect, it } from 'vitest'
import { exercises, practiceContentValidationReport, validatePracticeContent } from './practice'

describe('practice content', () => {
  it('keeps the seeded exercises valid and addressable by stable IDs', () => {
    expect(practiceContentValidationReport.isValid, JSON.stringify(practiceContentValidationReport.issues)).toBe(true)
    expect(practiceContentValidationReport.exerciseCount).toBe(4)
    expect(new Set(exercises.map((exercise) => exercise.id)).size).toBe(exercises.length)
  })

  it('rejects an answer that a learner cannot select', () => {
    const invalid = [{ ...exercises[0], id: 'invalid-option', answer: 'Không tồn tại' }]
    expect(validatePracticeContent(invalid)).toMatchObject({
      isValid: false,
      issues: [expect.objectContaining({ code: 'answer_not_in_options', exerciseId: 'invalid-option' })],
    })
  })
})
