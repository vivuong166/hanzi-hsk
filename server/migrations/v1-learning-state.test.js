import { describe, expect, it } from 'vitest'
import { checksumV1LearningState, prepareV1LearningStateImport } from './v1-learning-state.js'

const legacyState = {
  goal: 15,
  deckLevel: 4,
  theme: 'dark',
  onboarded: true,
  reviews: {
    'hsk4-jingyan': { dueAt: 1_700_000_000_000, intervalHours: 24, repetitions: 3, lapses: 1, lastRating: 'good', lastReviewedAt: 1_699_900_000_000 },
    'removed-word': { dueAt: 1, intervalHours: 1, repetitions: 1, lapses: 0, lastRating: 'good', lastReviewedAt: 1 },
  },
  favorites: ['hsk4-jingyan', 'hsk4-jingyan'],
  difficult: ['removed-word'],
  mistakes: {
    'ex-suiran-1': { exerciseId: 'ex-suiran-1', answer: '因为', occurredAt: 1_700_000_000_000, count: 2 },
    'hsk4-meaning-hsk4-jingyan': { exerciseId: 'hsk4-meaning-hsk4-jingyan', answer: 'kinh nghiệm', occurredAt: 1_700_000_000_000, count: 1 },
  },
  activity: { '2026-10-20': { cards: 5, exercises: 2, minutes: 7 } },
  completedGrammar: ['suiran-danshi', 'removed-grammar'],
  completedExercises: ['ex-suiran-1', 'hsk4-meaning-hsk4-jingyan'],
  typingAttempts: [{ wordId: 'hsk4-jingyan', answer: 'jingyan', correct: true, elapsedMs: 1200, completedAt: 1_700_000_000_000 }],
  mockExam: { seed: 42 },
  mockExamHistory: [{ id: 42 }],
}

const resolver = (legacyWordId) => legacyWordId === 'hsk4-jingyan'
  ? { curriculumId: 'hsk-2.0-2015', sourceIndex: 601, itemSourceId: 'hsk-2.0-2015:vocabulary:601' }
  : null

describe('V1 learning-state import preparation', () => {
  it('is deterministic, uses idempotency keys, and preserves unknown data as legacy', () => {
    const options = { userId: 7, state: legacyState, resolveVocabularyId: resolver, knownGrammarIds: new Set(['suiran-danshi']), knownExerciseIds: new Set(['ex-suiran-1']) }
    const first = prepareV1LearningStateImport(options)
    const second = prepareV1LearningStateImport(options)

    expect(second).toEqual(first)
    expect(first).toMatchObject({
      source: 'learning_states.state',
      reviewCards: [expect.objectContaining({ legacyWordId: 'hsk4-jingyan', idempotencyKey: expect.stringContaining(':review:hsk4-jingyan') })],
      wordFlags: [expect.objectContaining({ flag: 'favorite' })],
      mistakeRecords: [expect.objectContaining({ exerciseId: 'ex-suiran-1' })],
      activitySummaries: [expect.objectContaining({ source: 'v1_aggregate', minutes: 7 })],
      completions: [
        expect.objectContaining({ domain: 'grammar', contentId: 'suiran-danshi' }),
        expect.objectContaining({ domain: 'exercise', contentId: 'ex-suiran-1' }),
      ],
    })
    expect(first.legacyOnly).toMatchObject({
      completedGrammar: ['removed-grammar'],
      completedExercises: ['hsk4-meaning-hsk4-jingyan'],
      mistakes: [expect.objectContaining({ legacyExerciseId: 'hsk4-meaning-hsk4-jingyan' })],
      typingAttempts: legacyState.typingAttempts,
      mockExam: legacyState.mockExam,
    })
    expect(first.report.unmapped).toEqual(expect.arrayContaining([
      expect.objectContaining({ legacyId: 'removed-word' }),
      expect.objectContaining({ legacyId: 'removed-grammar' }),
    ]))
  })

  it('makes a key-order independent checksum for the source snapshot', () => {
    expect(checksumV1LearningState({ a: 1, b: { x: true } })).toBe(checksumV1LearningState({ b: { x: true }, a: 1 }))
  })

  it('rejects invalid non-object legacy state instead of guessing a mapping', () => {
    expect(() => prepareV1LearningStateImport({ userId: 7, state: [], resolveVocabularyId: resolver })).toThrow('must be a JSON object')
  })
})
