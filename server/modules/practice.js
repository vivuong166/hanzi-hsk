import { randomUUID } from 'node:crypto'
import { getPracticeExercises } from '../content/practice.js'
import { StudyInputError } from './study.js'

const contentRelease = 'hsk-2.0-2015.r1'

export function parsePracticeMutation(body) {
  const exerciseId = typeof body?.exerciseId === 'string' ? body.exerciseId.trim() : ''
  const idempotencyKey = typeof body?.idempotencyKey === 'string' ? body.idempotencyKey.trim() : ''
  const answer = typeof body?.answer === 'string'
    ? body.answer
    : Array.isArray(body?.answer) && body.answer.every((item) => typeof item === 'string') ? body.answer : null
  if (!/^[a-z0-9-]{3,80}$/i.test(exerciseId)) throw new StudyInputError('exerciseId không hợp lệ.')
  if (answer === null || (Array.isArray(answer) && answer.length === 0)) throw new StudyInputError('Câu trả lời không hợp lệ.')
  if (!/^[A-Za-z0-9_-]{12,128}$/.test(idempotencyKey)) throw new StudyInputError('idempotencyKey không hợp lệ.')
  return { exerciseId, answer, idempotencyKey }
}

function correctAnswer(exercise, answer) {
  return Array.isArray(exercise.answer)
    ? Array.isArray(answer) && exercise.answer.length === answer.length && exercise.answer.every((value, index) => value === answer[index])
    : exercise.answer === answer
}

function parseResult(value) {
  return typeof value === 'string' ? JSON.parse(value) : value
}

export async function recordPracticeAttempt({ pool, userId, mutation, now = () => new Date() }) {
  const exercises = await getPracticeExercises()
  const exercise = exercises.find((item) => item.id === mutation.exerciseId)
  if (!exercise) throw new StudyInputError('Bài luyện tập không tồn tại.', 404)
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const existing = await client.query(
      'SELECT result FROM practice_attempts WHERE user_id = $1 AND idempotency_key = $2',
      [userId, mutation.idempotencyKey],
    )
    if (existing.rowCount) {
      await client.query('COMMIT')
      return { ...parseResult(existing.rows[0].result), replayed: true }
    }

    const occurredAt = now()
    const isCorrect = correctAnswer(exercise, mutation.answer)
    const result = {
      attemptId: randomUUID(),
      exerciseId: exercise.id,
      isCorrect,
      occurredAt: new Date(occurredAt).toISOString(),
      explanation: exercise.explanation,
      replayed: false,
    }
    await client.query(
      `INSERT INTO practice_attempts (
        id, user_id, content_release, exercise_id, answer, is_correct, occurred_at, idempotency_key, result
      ) VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8, $9::jsonb)`,
      [result.attemptId, userId, contentRelease, exercise.id, JSON.stringify(mutation.answer), isCorrect, occurredAt, mutation.idempotencyKey, JSON.stringify(result)],
    )
    if (isCorrect) {
      await client.query(
        'DELETE FROM mistake_records WHERE user_id = $1 AND content_release = $2 AND exercise_id = $3',
        [userId, contentRelease, exercise.id],
      )
    } else {
      await client.query(
        `INSERT INTO mistake_records (user_id, content_release, exercise_id, last_answer, incorrect_count, last_occurred_at)
         VALUES ($1, $2, $3, $4::jsonb, 1, $5)
         ON CONFLICT (user_id, content_release, exercise_id) DO UPDATE SET
           last_answer = EXCLUDED.last_answer,
           incorrect_count = mistake_records.incorrect_count + 1,
           last_occurred_at = EXCLUDED.last_occurred_at`,
        [userId, contentRelease, exercise.id, JSON.stringify(mutation.answer), occurredAt],
      )
    }
    await client.query('COMMIT')
    return result
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export async function listMistakes({ pool, userId }) {
  const result = await pool.query(
    `SELECT exercise_id, last_answer, incorrect_count, last_occurred_at
     FROM mistake_records
     WHERE user_id = $1 AND content_release = $2
     ORDER BY last_occurred_at DESC`,
    [userId, contentRelease],
  )
  return result.rows.map((row) => ({
    exerciseId: row.exercise_id,
    answer: typeof row.last_answer === 'string' ? JSON.parse(row.last_answer) : row.last_answer,
    incorrectCount: Number(row.incorrect_count),
    occurredAt: new Date(row.last_occurred_at).toISOString(),
  }))
}
