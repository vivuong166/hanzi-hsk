import { describe, expect, it } from 'vitest'
import { grammar, grammarContentValidationReport, validateGrammarContent } from './grammar'

describe('grammar content', () => {
  it('keeps the seeded grammar collection valid and stable', () => {
    expect(grammarContentValidationReport.isValid, JSON.stringify(grammarContentValidationReport.issues)).toBe(true)
    expect(grammarContentValidationReport.grammarCount).toBe(16)
    expect(grammar.find((point) => point.id === 'suiran-danshi')).toBeDefined()
  })

  it('requires complete bilingual examples', () => {
    const invalid = [{ ...grammar[0], id: 'missing-example', examples: [] }]
    expect(validateGrammarContent(invalid)).toMatchObject({
      isValid: false,
      issues: [expect.objectContaining({ code: 'missing_examples', grammarId: 'missing-example' })],
    })
  })
})
