import { describe, expect, it } from 'vitest'
import { parseReviewMutation, recordReview } from './study.js'

describe('study review event input', () => {
  it('rejects malformed ratings, source identity, and idempotency keys', () => {
    expect(() => parseReviewMutation({ sourceIndex: 0, rating: 'good', idempotencyKey: 'abcdefgh1234' })).toThrow('sourceIndex')
    expect(() => parseReviewMutation({ sourceIndex: 1, rating: 'maybe', idempotencyKey: 'abcdefgh1234' })).toThrow('Đánh giá')
    expect(() => parseReviewMutation({ sourceIndex: 1, rating: 'good', idempotencyKey: 'short' })).toThrow('idempotencyKey')
  })

  it('replays an already committed event without changing a card', async () => {
    const calls = []
    const client = {
      async query(sql) {
        calls.push(String(sql))
        if (String(sql).startsWith('SELECT result')) return { rowCount: 1, rows: [{ result: { eventId: 'saved', replayed: false } }] }
        return { rowCount: 0, rows: [] }
      },
      release() { calls.push('release') },
    }
    const pool = { connect: async () => client }
    await expect(recordReview({
      pool,
      userId: 9,
      mutation: { sourceIndex: 601, rating: 'good', idempotencyKey: 'replay_key_123' },
    })).resolves.toEqual({ eventId: 'saved', replayed: true })
    expect(calls).toEqual(expect.arrayContaining(['BEGIN', 'COMMIT', 'release']))
    expect(calls.some((sql) => sql.includes('UPDATE review_cards') || sql.includes('INSERT INTO review_cards'))).toBe(false)
  })
})
