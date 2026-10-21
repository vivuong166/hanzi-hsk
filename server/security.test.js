import { describe, expect, it } from 'vitest'
import { createMemoryRateLimiter, createOriginGuard, parseOrigin, securityHeaders } from './security.js'

function response() {
  return {
    headers: {},
    set(name, value) { this.headers[name] = value; return this },
    status(code) { this.statusCode = code; return this },
    json(body) { this.body = body; return this },
  }
}

describe('server security controls', () => {
  it('only accepts normalized HTTP(S) origins', () => {
    expect(parseOrigin('https://hanzi.example/path')).toBe('https://hanzi.example')
    expect(parseOrigin('file:///local')).toBeNull()
    expect(parseOrigin('not an origin')).toBeNull()
  })

  it('rejects a cross-origin mutation in production', () => {
    const guard = createOriginGuard({ allowedOrigins: ['https://app.hanzi.example'], isProduction: true })
    const res = response()
    let proceeded = false
    guard({ method: 'POST', get: () => 'https://attacker.example' }, res, () => { proceeded = true })
    expect(proceeded).toBe(false)
    expect(res).toMatchObject({ statusCode: 403, body: { error: expect.any(String) } })
  })

  it('requires an Origin for production mutations but lets same origin proceed', () => {
    const guard = createOriginGuard({ allowedOrigins: ['https://app.hanzi.example'], isProduction: true })
    const missing = response()
    guard({ method: 'POST', get: () => undefined }, missing, () => {})
    expect(missing.statusCode).toBe(403)

    const allowed = response()
    let proceeded = false
    guard({ method: 'POST', get: () => 'https://app.hanzi.example' }, allowed, () => { proceeded = true })
    expect(proceeded).toBe(true)
  })

  it('can admit an explicit local development origin without weakening production', () => {
    const allowsLocalPreview = (origin) => origin === 'http://127.0.0.1:4174'
    const developmentGuard = createOriginGuard({
      allowedOrigins: ['http://127.0.0.1:4173'],
      isProduction: false,
      allowsDevelopmentOrigin: allowsLocalPreview,
    })
    let proceeded = false
    developmentGuard({ method: 'POST', get: () => 'http://127.0.0.1:4174' }, response(), () => { proceeded = true })
    expect(proceeded).toBe(true)

    const productionGuard = createOriginGuard({
      allowedOrigins: ['https://app.hanzi.example'],
      isProduction: true,
      allowsDevelopmentOrigin: () => true,
    })
    const rejected = response()
    productionGuard({ method: 'POST', get: () => 'http://127.0.0.1:4174' }, rejected, () => {})
    expect(rejected.statusCode).toBe(403)
  })

  it('rate limits repeated authentication attempts per client', () => {
    let clock = 0
    const limit = createMemoryRateLimiter({ windowMs: 1_000, maxAttempts: 2, now: () => clock })
    const req = { ip: '203.0.113.25' }
    const pass = () => {}
    limit(req, response(), pass)
    limit(req, response(), pass)
    const rejected = response()
    limit(req, rejected, pass)
    expect(rejected).toMatchObject({ statusCode: 429, headers: { 'Retry-After': '1' } })

    clock = 1_001
    const afterWindow = response()
    let proceeded = false
    limit(req, afterWindow, () => { proceeded = true })
    expect(proceeded).toBe(true)
  })

  it('applies baseline browser security headers', () => {
    const res = response()
    securityHeaders({ isProduction: true })({}, res, () => {})
    expect(res.headers).toMatchObject({
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Strict-Transport-Security': expect.stringContaining('max-age='),
    })
  })
})
