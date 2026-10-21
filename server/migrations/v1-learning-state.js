import { createHash } from 'node:crypto'

const RATINGS = new Set(['again', 'hard', 'good', 'easy'])

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function finiteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value)
}

function stringItems(value) {
  return Array.isArray(value) ? value.filter((item) => typeof item === 'string' && item.length > 0) : []
}

function stableJson(value) {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return JSON.stringify(value)
  if (typeof value === 'number') return Number.isFinite(value) ? JSON.stringify(value) : 'null'
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`
  if (isRecord(value)) {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`
  }
  return 'null'
}

export function checksumV1LearningState(state) {
  return createHash('sha256').update(stableJson(state)).digest('hex')
}

function canonicalVocabularyIdentity(legacyWordId, resolveVocabularyId, report) {
  const identity = resolveVocabularyId(legacyWordId)
  if (!identity) {
    report.unmapped.push({ domain: 'vocabulary', legacyId: legacyWordId, reason: 'unknown_vocabulary_id' })
    return null
  }
  return identity
}

function uniqueStrings(value) {
  return [...new Set(stringItems(value))]
}

/**
 * Produce a deterministic, write-free import plan for a V1 learning-state JSON
 * blob. The database runner must snapshot the original state and persist this
 * plan transactionally using its idempotency keys; this function never writes.
 */
export function prepareV1LearningStateImport({
  userId,
  state,
  resolveVocabularyId,
  knownGrammarIds = new Set(),
  knownExerciseIds = new Set(),
}) {
  if (!isRecord(state)) throw new TypeError('V1 learning state must be a JSON object')
  if (typeof resolveVocabularyId !== 'function') throw new TypeError('resolveVocabularyId must be a function')

  const importPrefix = `v1:${String(userId)}:${checksumV1LearningState(state)}`
  const report = { sourceChecksum: importPrefix.split(':').at(-1), unmapped: [] }
  const plan = {
    source: 'learning_states.state',
    importPrefix,
    sourceChecksum: report.sourceChecksum,
    reviewCards: [],
    reviewEvents: [],
    wordFlags: [],
    mistakeRecords: [],
    activitySummaries: [],
    completions: [],
    userSettings: {
      goal: finiteNumber(state.goal) ? state.goal : null,
      deckLevel: [1, 2, 3, 4].includes(state.deckLevel) ? state.deckLevel : null,
      theme: state.theme === 'light' || state.theme === 'dark' ? state.theme : null,
      onboarded: typeof state.onboarded === 'boolean' ? state.onboarded : null,
    },
    legacyOnly: {
      mistakes: [],
      completedGrammar: [],
      completedExercises: [],
      typingAttempts: Array.isArray(state.typingAttempts) ? state.typingAttempts : [],
      mockExam: state.mockExam ?? null,
      mockExamHistory: Array.isArray(state.mockExamHistory) ? state.mockExamHistory : [],
    },
    report,
  }

  const reviews = isRecord(state.reviews) ? state.reviews : {}
  for (const legacyWordId of Object.keys(reviews).sort()) {
    const review = reviews[legacyWordId]
    if (!isRecord(review) || !finiteNumber(review.dueAt) || !finiteNumber(review.intervalHours)
      || !finiteNumber(review.repetitions) || !finiteNumber(review.lapses)
      || !finiteNumber(review.lastReviewedAt) || !RATINGS.has(review.lastRating)) {
      report.unmapped.push({ domain: 'review', legacyId: legacyWordId, reason: 'invalid_review_payload' })
      continue
    }
    const vocabulary = canonicalVocabularyIdentity(legacyWordId, resolveVocabularyId, report)
    if (!vocabulary) continue
    const idempotencyKey = `${importPrefix}:review:${legacyWordId}`
    plan.reviewCards.push({
      ...vocabulary,
      legacyWordId,
      dueAt: review.dueAt,
      intervalHours: review.intervalHours,
      repetitions: review.repetitions,
      lapses: review.lapses,
      lastRating: review.lastRating,
      lastReviewedAt: review.lastReviewedAt,
      idempotencyKey,
    })
    plan.reviewEvents.push({
      ...vocabulary,
      legacyWordId,
      eventType: 'v1_import_baseline',
      rating: review.lastRating,
      occurredAt: review.lastReviewedAt,
      idempotencyKey: `${idempotencyKey}:baseline`,
    })
  }

  for (const [flag, legacyWordIds] of [['favorite', state.favorites], ['difficult', state.difficult]]) {
    for (const legacyWordId of uniqueStrings(legacyWordIds).sort()) {
      const vocabulary = canonicalVocabularyIdentity(legacyWordId, resolveVocabularyId, report)
      if (!vocabulary) continue
      plan.wordFlags.push({
        ...vocabulary,
        legacyWordId,
        flag,
        idempotencyKey: `${importPrefix}:flag:${flag}:${legacyWordId}`,
      })
    }
  }

  const mistakes = isRecord(state.mistakes) ? state.mistakes : {}
  for (const legacyExerciseId of Object.keys(mistakes).sort()) {
    const mistake = mistakes[legacyExerciseId]
    if (!knownExerciseIds.has(legacyExerciseId)) {
      report.unmapped.push({ domain: 'mistake', legacyId: legacyExerciseId, reason: 'unknown_exercise_id' })
      plan.legacyOnly.mistakes.push({ legacyExerciseId, payload: mistake })
      continue
    }
    if (!isRecord(mistake) || !finiteNumber(mistake.occurredAt) || !finiteNumber(mistake.count)) {
      report.unmapped.push({ domain: 'mistake', legacyId: legacyExerciseId, reason: 'invalid_mistake_payload' })
      plan.legacyOnly.mistakes.push({ legacyExerciseId, payload: mistake })
      continue
    }
    plan.mistakeRecords.push({
      legacyExerciseId,
      exerciseId: legacyExerciseId,
      answer: typeof mistake.answer === 'string' ? mistake.answer : '',
      occurredAt: mistake.occurredAt,
      count: mistake.count,
      idempotencyKey: `${importPrefix}:mistake:${legacyExerciseId}`,
    })
  }

  const activity = isRecord(state.activity) ? state.activity : {}
  for (const day of Object.keys(activity).sort()) {
    const summary = activity[day]
    if (!isRecord(summary) || !finiteNumber(summary.cards) || !finiteNumber(summary.exercises) || !finiteNumber(summary.minutes)) {
      report.unmapped.push({ domain: 'activity', legacyId: day, reason: 'invalid_activity_summary' })
      continue
    }
    plan.activitySummaries.push({
      day,
      cards: summary.cards,
      exercises: summary.exercises,
      minutes: summary.minutes,
      source: 'v1_aggregate',
      idempotencyKey: `${importPrefix}:activity:${day}`,
    })
  }

  for (const grammarId of uniqueStrings(state.completedGrammar).sort()) {
    if (!knownGrammarIds.has(grammarId)) {
      report.unmapped.push({ domain: 'grammar_completion', legacyId: grammarId, reason: 'unknown_grammar_id' })
      plan.legacyOnly.completedGrammar.push(grammarId)
      continue
    }
    plan.completions.push({ domain: 'grammar', contentId: grammarId, idempotencyKey: `${importPrefix}:completion:grammar:${grammarId}` })
  }
  for (const exerciseId of uniqueStrings(state.completedExercises).sort()) {
    if (!knownExerciseIds.has(exerciseId)) {
      report.unmapped.push({ domain: 'exercise_completion', legacyId: exerciseId, reason: 'unknown_exercise_id' })
      plan.legacyOnly.completedExercises.push(exerciseId)
      continue
    }
    plan.completions.push({ domain: 'exercise', contentId: exerciseId, idempotencyKey: `${importPrefix}:completion:exercise:${exerciseId}` })
  }

  return plan
}
