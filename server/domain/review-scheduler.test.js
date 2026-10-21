import { describe, expect, it } from 'vitest'
import { scheduleReview } from './review-scheduler.js'

describe('V2 interval review scheduler', () => {
  const now = Date.UTC(2026, 9, 21, 8, 0, 0)

  it('uses documented first-review intervals with a fake clock', () => {
    expect(scheduleReview(undefined, 'again', now)).toMatchObject({ intervalHours: 0.25, repetitions: 1, lapses: 1 })
    expect(scheduleReview(undefined, 'hard', now)).toMatchObject({ intervalHours: 6, repetitions: 1, lapses: 0 })
    expect(scheduleReview(undefined, 'good', now)).toMatchObject({ intervalHours: 24, repetitions: 1, lapses: 0 })
    expect(scheduleReview(undefined, 'easy', now)).toMatchObject({ intervalHours: 72, repetitions: 1, lapses: 0 })
  })

  it('keeps prior progress while an Again creates a short retry', () => {
    const next = scheduleReview({ intervalHours: 40, repetitions: 4, lapses: 1 }, 'again', now)
    expect(next).toMatchObject({ intervalHours: 0.25, repetitions: 5, lapses: 2, lastRating: 'again' })
    expect(next.dueAt.toISOString()).toBe(new Date(now + 15 * 60 * 1000).toISOString())
  })
})
