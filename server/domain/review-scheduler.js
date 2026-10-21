const ratings = new Set(['again', 'hard', 'good', 'easy'])

function roundedHours(value) {
  return Math.round(value * 100) / 100
}

/** A documented interval scheduler for the first V2 release; this is not FSRS. */
export function scheduleReview(previous, rating, now = Date.now()) {
  if (!ratings.has(rating)) throw new TypeError('Unsupported review rating')
  const currentInterval = Number(previous?.intervalHours) || 0
  const reviewedAt = new Date(now)
  if (Number.isNaN(reviewedAt.getTime())) throw new TypeError('Review time must be valid')

  let intervalHours
  if (rating === 'again') intervalHours = 0.25
  else if (rating === 'hard') intervalHours = currentInterval ? Math.max(6, currentInterval * 1.25) : 6
  else if (rating === 'good') intervalHours = currentInterval ? Math.max(24, currentInterval * 2.5) : 24
  else intervalHours = currentInterval ? Math.max(72, currentInterval * 4) : 72

  intervalHours = roundedHours(intervalHours)
  return {
    dueAt: new Date(reviewedAt.getTime() + intervalHours * 60 * 60 * 1000),
    intervalHours,
    repetitions: Math.max(0, Number(previous?.repetitions) || 0) + 1,
    lapses: Math.max(0, Number(previous?.lapses) || 0) + (rating === 'again' ? 1 : 0),
    lastRating: rating,
    lastReviewedAt: reviewedAt,
  }
}
