import { describe, expect, it } from 'vitest'
import { parsePracticeMutation, recordPracticeAttempt } from './practice.js'

describe('practice attempt domain', () => {
  it('only accepts a selectable answer and a safe idempotency key', () => {
    expect(() => parsePracticeMutation({ exerciseId: 'ex-cai-1', answer: [], idempotencyKey: 'attempt_key_123' })).toThrow('Câu trả lời')
    expect(() => parsePracticeMutation({ exerciseId: '!', answer: '才', idempotencyKey: 'attempt_key_123' })).toThrow('exerciseId')
  })

  it('replays an existing attempt without inserting a second record', async () => {
    const calls = []
    const client = {
      async query(sql) {
        calls.push(String(sql))
        if (String(sql).startsWith('SELECT result')) return { rowCount: 1, rows: [{ result: { attemptId: 'saved', replayed: false } }] }
        return { rowCount: 0, rows: [] }
      },
      release() { calls.push('release') },
    }
    const pool = { connect: async () => client }
    await expect(recordPracticeAttempt({
      pool,
      userId: 9,
      mutation: { exerciseId: 'ex-cai-1', answer: '才', idempotencyKey: 'attempt_key_123' },
    })).resolves.toEqual({ attemptId: 'saved', replayed: true })
    expect(calls.some((sql) => sql.includes('INSERT INTO practice_attempts'))).toBe(false)
  })
})
