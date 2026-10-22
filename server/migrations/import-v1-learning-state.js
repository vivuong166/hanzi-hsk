import 'dotenv/config'
import { randomUUID } from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createDatabasePool } from '../db/connection.js'
import { getGrammarPoints } from '../content/grammar.js'
import { getPracticeExercises } from '../content/practice.js'
import { checksumV1LearningState, prepareV1LearningStateImport } from './v1-learning-state.js'

function isoTimestamp(value) {
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

/**
 * Read-only handover status. It is safe to call before V2 tables exist and
 * never writes or changes the V1 JSON state.
 */
export async function inspectV1UpgradeStatus(client, userId, { v2SchemaReady }) {
  const sourceResult = await client.query(
    'SELECT state, updated_at FROM learning_states WHERE user_id = $1',
    [userId],
  )
  const source = sourceResult.rows[0]
  if (!source) {
    return {
      v2SchemaReady,
      v1: { exists: false, updatedAt: null, sourceChecksum: null },
      migration: v2SchemaReady ? 'no_v1_state' : 'schema_not_ready',
      lastImport: null,
    }
  }

  const sourceChecksum = checksumV1LearningState(source.state)
  const v1 = { exists: true, updatedAt: isoTimestamp(source.updated_at), sourceChecksum }
  if (!v2SchemaReady) {
    return { v2SchemaReady: false, v1, migration: 'schema_not_ready', lastImport: null }
  }

  const importedResult = await client.query(
    `SELECT id, source_checksum, completed_at, report
     FROM v1_import_runs WHERE user_id = $1
     ORDER BY completed_at DESC LIMIT 1`,
    [userId],
  )
  const imported = importedResult.rows[0]
  if (!imported) return { v2SchemaReady: true, v1, migration: 'not_imported', lastImport: null }
  const lastImport = {
    id: imported.id,
    sourceChecksum: imported.source_checksum,
    completedAt: isoTimestamp(imported.completed_at),
    report: typeof imported.report === 'string' ? JSON.parse(imported.report) : imported.report,
  }
  return {
    v2SchemaReady: true,
    v1,
    migration: imported.source_checksum === sourceChecksum ? 'current' : 'stale',
    lastImport,
  }
}

export async function vocabularyResolver(client) {
  const result = await client.query(`
    SELECT legacy_id, curriculum_id, source_index FROM vocabulary_entries
    UNION ALL
    SELECT legacy_id, curriculum_id, source_index FROM vocabulary_legacy_aliases
  `)
  const identities = new Map(result.rows.map((row) => [row.legacy_id, {
    curriculumId: row.curriculum_id,
    sourceIndex: Number(row.source_index),
    itemSourceId: `${row.curriculum_id}:vocabulary:${row.source_index}`,
  }]))
  return (legacyWordId) => identities.get(legacyWordId) ?? null
}

async function writePlan(client, userId, plan) {
  for (const card of plan.reviewCards) {
    await client.query(
      `INSERT INTO review_cards (
        user_id, curriculum_id, source_index, due_at, interval_hours, repetitions, lapses, last_rating, last_reviewed_at, version
      ) VALUES ($1, $2, $3, to_timestamp($4 / 1000.0), $5, $6, $7, $8, to_timestamp($9 / 1000.0), 1)
      ON CONFLICT (user_id, curriculum_id, source_index) DO NOTHING`,
      [userId, card.curriculumId, card.sourceIndex, card.dueAt, card.intervalHours, card.repetitions, card.lapses, card.lastRating, card.lastReviewedAt],
    )
  }
  for (const event of plan.reviewEvents) {
    await client.query(
      `INSERT INTO review_events (
        id, user_id, curriculum_id, source_index, rating, occurred_at, idempotency_key, result
      ) VALUES ($1, $2, $3, $4, $5, to_timestamp($6 / 1000.0), $7, $8::jsonb)
      ON CONFLICT (user_id, idempotency_key) DO NOTHING`,
      [randomUUID(), userId, event.curriculumId, event.sourceIndex, event.rating, event.occurredAt, event.idempotencyKey, JSON.stringify({ importedFrom: 'v1', legacyWordId: event.legacyWordId })],
    )
  }
  for (const flag of plan.wordFlags) {
    await client.query(
      `INSERT INTO user_word_flags (user_id, curriculum_id, source_index, flag)
       VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`,
      [userId, flag.curriculumId, flag.sourceIndex, flag.flag],
    )
  }
  for (const mistake of plan.mistakeRecords) {
    await client.query(
      `INSERT INTO mistake_records (user_id, content_release, exercise_id, last_answer, incorrect_count, last_occurred_at)
       VALUES ($1, 'hsk-2.0-2015.r1', $2, $3::jsonb, $4, to_timestamp($5 / 1000.0))
       ON CONFLICT (user_id, content_release, exercise_id) DO NOTHING`,
      [userId, mistake.exerciseId, JSON.stringify(mistake.answer), mistake.count, mistake.occurredAt],
    )
  }
  for (const summary of plan.activitySummaries) {
    await client.query(
      `INSERT INTO learning_activity_summaries (user_id, activity_day, cards, exercises, minutes, source)
       VALUES ($1, $2::date, $3, $4, $5, $6)
       ON CONFLICT (user_id, activity_day, source) DO NOTHING`,
      [userId, summary.day, summary.cards, summary.exercises, summary.minutes, summary.source],
    )
  }
  for (const completion of plan.completions) {
    await client.query(
      `INSERT INTO content_completions (user_id, content_release, domain, content_id)
       VALUES ($1, 'hsk-2.0-2015.r1', $2, $3) ON CONFLICT DO NOTHING`,
      [userId, completion.domain, completion.contentId],
    )
  }
  if (plan.userSettings.goal !== null) {
    await client.query(
      `INSERT INTO user_settings (user_id, daily_goal)
       VALUES ($1, $2) ON CONFLICT (user_id) DO NOTHING`,
      [userId, Math.max(1, Math.min(200, Math.round(plan.userSettings.goal)))],
    )
  }
}

export async function importUserV1State(client, userId) {
  await client.query('BEGIN')
  try {
    const stateResult = await client.query('SELECT state FROM learning_states WHERE user_id = $1 FOR UPDATE', [userId])
    if (!stateResult.rowCount) {
      await client.query('COMMIT')
      return { status: 'no_v1_state' }
    }

    const [resolveVocabularyId, grammar, exercises] = await Promise.all([
      vocabularyResolver(client), getGrammarPoints(), getPracticeExercises(),
    ])
    const plan = prepareV1LearningStateImport({
      userId,
      state: stateResult.rows[0].state,
      resolveVocabularyId,
      knownGrammarIds: new Set(grammar.map((point) => point.id)),
      knownExerciseIds: new Set(exercises.map((exercise) => exercise.id)),
    })
    const previous = await client.query(
      `SELECT id, source_checksum FROM v1_import_runs
       WHERE user_id = $1 ORDER BY completed_at DESC LIMIT 1`,
      [userId],
    )
    if (previous.rowCount && previous.rows[0].source_checksum === plan.sourceChecksum) {
      await client.query('COMMIT')
      return { status: 'already_imported', runId: previous.rows[0].id, sourceChecksum: plan.sourceChecksum }
    }
    if (previous.rowCount) {
      await client.query('COMMIT')
      return {
        status: 'v1_state_changed_after_import',
        runId: previous.rows[0].id,
        importedChecksum: previous.rows[0].source_checksum,
        sourceChecksum: plan.sourceChecksum,
      }
    }

    await writePlan(client, userId, plan)
    const runId = randomUUID()
    await client.query(
      `INSERT INTO v1_import_runs (id, user_id, source_checksum, source_snapshot, report)
       VALUES ($1, $2, $3, $4::jsonb, $5::jsonb)`,
      [runId, userId, plan.sourceChecksum, JSON.stringify(stateResult.rows[0].state), JSON.stringify(plan.report)],
    )
    await client.query('COMMIT')
    return {
      status: 'imported',
      runId,
      sourceChecksum: plan.sourceChecksum,
      imported: {
        reviewCards: plan.reviewCards.length,
        reviewEvents: plan.reviewEvents.length,
        wordFlags: plan.wordFlags.length,
        mistakeRecords: plan.mistakeRecords.length,
        activitySummaries: plan.activitySummaries.length,
        completions: plan.completions.length,
      },
      unmapped: plan.report.unmapped,
    }
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  }
}

function parseUserId(argumentsList) {
  const argument = argumentsList.find((item) => item.startsWith('--user-id='))
  const userId = Number(argument?.slice('--user-id='.length))
  if (!Number.isSafeInteger(userId) || userId < 1) throw new Error('Usage: npm run db:import-v1 -- --user-id=<positive integer>')
  return userId
}

async function main() {
  const userId = parseUserId(process.argv.slice(2))
  const pool = createDatabasePool()
  const client = await pool.connect()
  try {
    console.log(JSON.stringify(await importUserV1State(client, userId), null, 2))
  } finally {
    client.release()
    await pool.end()
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => { console.error('V1 import failed:', error); process.exitCode = 1 })
}
