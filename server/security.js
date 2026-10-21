const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

export function parseOrigin(value) {
  try {
    const parsed = new URL(value)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null
    return parsed.origin
  } catch {
    return null
  }
}

export function createOriginGuard({ allowedOrigins, isProduction, allowsDevelopmentOrigin }) {
  const allowed = new Set(allowedOrigins.map(parseOrigin).filter(Boolean))
  const allowsOrigin = (origin) => allowed.has(origin)
    || (!isProduction && typeof allowsDevelopmentOrigin === 'function' && allowsDevelopmentOrigin(origin))

  return (req, res, next) => {
    if (SAFE_METHODS.has(req.method)) return next()

    const origin = req.get('origin')
    if (!origin && !isProduction) return next()
    if (!origin || !allowsOrigin(origin)) {
      return res.status(403).json({ error: 'Yêu cầu không đến từ ứng dụng được phép.' })
    }
    return next()
  }
}

export function createMemoryRateLimiter({ windowMs, maxAttempts, now = () => Date.now() }) {
  const buckets = new Map()

  return (req, res, next) => {
    const currentTime = now()
    if (buckets.size > 10_000) {
      for (const [key, entry] of buckets) {
        if (entry.resetAt <= currentTime) buckets.delete(key)
      }
    }

    const key = req.ip || req.socket?.remoteAddress || 'unknown'
    const existing = buckets.get(key)
    const entry = !existing || existing.resetAt <= currentTime
      ? { attempts: 0, resetAt: currentTime + windowMs }
      : existing

    if (entry.attempts >= maxAttempts) {
      const retryAfterSeconds = Math.max(1, Math.ceil((entry.resetAt - currentTime) / 1000))
      res.set('Retry-After', String(retryAfterSeconds))
      return res.status(429).json({ error: 'Bạn đã thử quá nhiều lần. Vui lòng thử lại sau.' })
    }

    entry.attempts += 1
    buckets.set(key, entry)
    return next()
  }
}

export function securityHeaders({ isProduction }) {
  return (_req, res, next) => {
    res.set('X-Content-Type-Options', 'nosniff')
    res.set('X-Frame-Options', 'DENY')
    res.set('Referrer-Policy', 'strict-origin-when-cross-origin')
    res.set('Permissions-Policy', 'camera=(), geolocation=(), microphone=()')
    res.set('Cross-Origin-Opener-Policy', 'same-origin')
    if (isProduction) res.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
    next()
  }
}
