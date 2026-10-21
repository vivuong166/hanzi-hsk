import { randomUUID } from 'node:crypto'
import { scheduleReview } from '../domain/review-scheduler.js'

const ratings = new Set(['again', 'hard', 'good', 'easy'])

export class StudyInputError extends Error {
  constructor(message, status = 400) {
    super(message)
    this.status = status
  }
}

export function parseReviewMutation(body) {
  const sourceIndex = Number(body?.sourceIndex)
  const rating = body?.rating
  const idempotencyKey = typeof body?.idempotencyKey === 'string' ? body.idempotencyKey.trim() : ''
  if (!Number.isInteger(sourceIndex) || sourceIndex < 1 || sourceIndex > 1200) throw new StudyInputError('sourceIndex không hợp lệ.')
  if (!ratings.has(rating)) throw new StudyInputError('Đánh giá ôn tập không hợp lệ.')
  if (!/^[A-Za-z0-9_-]{12,128}$/.test(idempotencyKey)) throw new StudyInputError('idempotencyKey không hợp lệ.')
  return { sourceIndex, rating, idempotencyKey }
}

function resultFromRow(row) {
  return typeof row.result === 'string' ? JSON.parse(row.result) : row.result
}

function asTimestamp(value) {
  return value instanceof Date ? value.getTime() : new Date(value).getTime()
}

export async function recordReview({ pool, userId, mutation, now = () => Date.now() }) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const existing = await client.query(
      'SELECT result FROM review_events WHERE user_id = $1 AND idempotency_key = $2',
      [userId, mutation.idempotencyKey],
    )
    if (existing.rowCount) {
      await client.query('COMMIT')
      return { ...resultFromRow(existing.rows[0]), replayed: true }
    }

    const vocabulary = await client.query(
      `SELECT legacy_id FROM vocabulary_entries
       WHERE curriculum_id = 'hsk-2.0-2015' AND source_index = $1`,
      [mutation.sourceIndex],
    )
    if (!vocabulary.rowCount) throw new StudyInputError('Không tìm thấy mục từ trong curriculum hiện có.', 404)

    const current = await client.query(
      `SELECT due_at, interval_hours, repetitions, lapses, last_rating, last_reviewed_at, version
       FROM review_cards
       WHERE user_id = $1 AND curriculum_id = 'hsk-2.0-2015' AND source_index = $2
       FOR UPDATE`,
      [userId, mutation.sourceIndex],
    )
    const card = current.rows[0]
    const scheduled = scheduleReview(card && {
      intervalHours: Number(card.interval_hours),
      repetitions: Number(card.repetitions),
      lapses: Number(card.lapses),
    }, mutation.rating, now())
    const nextVersion = card ? Number(card.version) + 1 : 1

    if (card) {
      await client.query(
        `UPDATE review_cards SET due_at = $1, interval_hours = $2, repetitions = $3, lapses = $4,
          last_rating = $5, last_reviewed_at = $6, version = $7
         WHERE user_id = $8 AND curriculum_id = 'hsk-2.0-2015' AND source_index = $9`,
        [scheduled.dueAt, scheduled.intervalHours, scheduled.repetitions, scheduled.lapses, scheduled.lastRating, scheduled.lastReviewedAt, nextVersion, userId, mutation.sourceIndex],
      )
    } else {
      await client.query(
        `INSERT INTO review_cards (
          user_id, curriculum_id, source_index, due_at, interval_hours, repetitions, lapses, last_rating, last_reviewed_at, version
        ) VALUES ($1, 'hsk-2.0-2015', $2, $3, $4, $5, $6, $7, $8, $9)`,
        [userId, mutation.sourceIndex, scheduled.dueAt, scheduled.intervalHours, scheduled.repetitions, scheduled.lapses, scheduled.lastRating, scheduled.lastReviewedAt, nextVersion],
      )
    }

    const result = {
      eventId: randomUUID(),
      curriculumId: 'hsk-2.0-2015',
      sourceIndex: mutation.sourceIndex,
      legacyWordId: vocabulary.rows[0].legacy_id,
      rating: mutation.rating,
      dueAt: scheduled.dueAt.toISOString(),
      intervalHours: scheduled.intervalHours,
      repetitions: scheduled.repetitions,
      lapses: scheduled.lapses,
      version: nextVersion,
      replayed: false,
    }
    await client.query(
      `INSERT INTO review_events (
        id, user_id, curriculum_id, source_index, rating, occurred_at, idempotency_key, result
      ) VALUES ($1, $2, 'hsk-2.0-2015', $3, $4, $5, $6, $7::jsonb)`,
      [result.eventId, userId, mutation.sourceIndex, mutation.rating, scheduled.lastReviewedAt, mutation.idempotencyKey, JSON.stringify(result)],
    )
    await client.query('COMMIT')
    return result
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export async function listDueReviews({ pool, userId, limit }) {
  const result = await pool.query(
    `SELECT card.source_index, card.due_at, card.interval_hours, card.repetitions, card.lapses, card.version,
            entry.legacy_id, entry.hanzi, entry.official_label, entry.introduced_level
     FROM review_cards card
     JOIN vocabulary_entries entry
       ON entry.curriculum_id = card.curriculum_id AND entry.source_index = card.source_index
     WHERE card.user_id = $1 AND card.curriculum_id = 'hsk-2.0-2015' AND card.due_at <= NOW()
     ORDER BY card.due_at ASC
     LIMIT $2`,
    [userId, limit],
  )
  return result.rows.map((row) => ({
    sourceIndex: row.source_index,
    legacyWordId: row.legacy_id,
    hanzi: row.hanzi,
    officialLabel: row.official_label,
    introducedLevel: row.introduced_level,
    dueAt: new Date(row.due_at).toISOString(),
    intervalHours: Number(row.interval_hours),
    repetitions: Number(row.repetitions),
    lapses: Number(row.lapses),
    version: Number(row.version),
  }))
}
