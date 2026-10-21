import 'dotenv/config'
import bcrypt from 'bcryptjs'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import express from 'express'
import jwt from 'jsonwebtoken'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createMemoryRateLimiter, createOriginGuard, parseOrigin, securityHeaders } from './security.js'
import { createDatabasePool } from './db/connection.js'
import { listDueReviews, parseReviewMutation, recordReview, StudyInputError } from './modules/study.js'
import { listMistakes, parsePracticeMutation, recordPracticeAttempt } from './modules/practice.js'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const port = Number(process.env.PORT ?? 3001)
const isProduction = process.env.NODE_ENV === 'production'
const configuredClientOrigin = process.env.CLIENT_ORIGIN ?? 'http://127.0.0.1:4173'
const clientOrigin = parseOrigin(configuredClientOrigin)
const adminEmails = new Set((process.env.ADMIN_EMAILS ?? '')
  .split(',')
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean))

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required')
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) throw new Error('JWT_SECRET must be at least 32 characters')
if (!clientOrigin) throw new Error('CLIENT_ORIGIN must be an absolute http(s) origin')

const pool = createDatabasePool()
const app = express()
const allowedOrigins = isProduction ? [clientOrigin] : [clientOrigin, 'http://127.0.0.1:4173', 'http://localhost:5173']
const authRateLimit = createMemoryRateLimiter({ windowMs: 15 * 60 * 1000, maxAttempts: 10 })

function isLocalViteOrigin(origin) {
  const normalizedOrigin = parseOrigin(origin)
  if (!normalizedOrigin) return false
  const parsed = new URL(normalizedOrigin)
  const localHost = parsed.hostname === '127.0.0.1' || parsed.hostname === 'localhost'
  const portNumber = Number(parsed.port)
  return localHost && parsed.protocol === 'http:' && Number.isInteger(portNumber)
    && ((portNumber >= 4173 && portNumber <= 4199) || (portNumber >= 5173 && portNumber <= 5199))
}

function allowsBrowserOrigin(origin) {
  return allowedOrigins.includes(origin) || (!isProduction && isLocalViteOrigin(origin))
}

app.disable('x-powered-by')
if (process.env.TRUST_PROXY === '1') app.set('trust proxy', 1)
app.use(securityHeaders({ isProduction }))
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowsBrowserOrigin(origin)) return callback(null, true)
    return callback(new Error('CORS origin is not allowed'))
  },
  credentials: true,
}))
app.use(express.json({ limit: '1mb' }))
app.use(cookieParser())
app.use(createOriginGuard({ allowedOrigins, isProduction, allowsDevelopmentOrigin: isLocalViteOrigin }))

const cookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/',
}

function publicUser(row) {
  return { id: row.id, email: row.email, name: row.name, role: row.role }
}

function createToken(user) {
  return jwt.sign({ sub: String(user.id), email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' })
}

function setSession(res, user) {
  res.cookie('hanzi_session', createToken(user), cookieOptions)
}

async function recordActivity(req, userId, action, metadata = {}) {
  try {
    await pool.query(
      'INSERT INTO activity_logs (user_id, action, metadata) VALUES ($1, $2, $3::jsonb)',
      [userId, action, JSON.stringify(metadata)],
    )
  } catch (error) {
    // Audit logging should never prevent a learner from signing in or studying.
    console.error('Could not write activity log:', error)
  }
}

function validEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function readCredentials(req, res) {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : ''
  const password = typeof req.body?.password === 'string' ? req.body.password : ''
  const name = typeof req.body?.name === 'string' ? req.body.name.trim().slice(0, 80) : ''
  if (!validEmail(email)) { res.status(400).json({ error: 'Email không hợp lệ.' }); return null }
  if (password.length < 8 || password.length > 128) { res.status(400).json({ error: 'Mật khẩu cần từ 8 đến 128 ký tự.' }); return null }
  return { email, password, name }
}

async function requireUser(req, res, next) {
  const token = req.cookies.hanzi_session
  if (!token) return res.status(401).json({ error: 'Bạn chưa đăng nhập.' })
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET)
    const result = await pool.query('SELECT id, email, name, role FROM users WHERE id = $1', [payload.sub])
    if (!result.rowCount) return res.status(401).json({ error: 'Phiên đăng nhập không còn hợp lệ.' })
    req.user = publicUser(result.rows[0])
    next()
  } catch {
    res.clearCookie('hanzi_session', { httpOnly: true, sameSite: 'lax', secure: isProduction, path: '/' })
    return res.status(401).json({ error: 'Phiên đăng nhập đã hết hạn.' })
  }
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Chỉ quản trị viên mới có quyền xem lịch sử hoạt động.' })
  next()
}

app.get('/api/health', (_req, res) => res.json({ ok: true }))

app.post('/api/auth/register', authRateLimit, async (req, res, next) => {
  try {
    const credentials = readCredentials(req, res)
    if (!credentials) return
    const passwordHash = await bcrypt.hash(credentials.password, 12)
    const result = await pool.query(
      'INSERT INTO users (email, name, password_hash) VALUES ($1, $2, $3) RETURNING id, email, name, role',
      [credentials.email, credentials.name || null, passwordHash],
    )
    const user = publicUser(result.rows[0])
    setSession(res, user)
    await recordActivity(req, user.id, 'account_registered')
    res.status(201).json({ user })
  } catch (error) {
    if (error?.code === '23505') return res.status(409).json({ error: 'Email này đã được đăng ký.' })
    next(error)
  }
})

app.post('/api/auth/login', authRateLimit, async (req, res, next) => {
  try {
    const credentials = readCredentials(req, res)
    if (!credentials) return
    const result = await pool.query('SELECT id, email, name, role, password_hash FROM users WHERE email = $1', [credentials.email])
    const row = result.rows[0]
    if (!row || !(await bcrypt.compare(credentials.password, row.password_hash))) {
      return res.status(401).json({ error: 'Email hoặc mật khẩu chưa đúng.' })
    }
    const user = publicUser(row)
    setSession(res, user)
    await recordActivity(req, user.id, 'login')
    res.json({ user })
  } catch (error) { next(error) }
})

app.post('/api/auth/logout', requireUser, async (req, res) => {
  await recordActivity(req, req.user.id, 'logout')
  res.clearCookie('hanzi_session', { httpOnly: true, sameSite: 'lax', secure: isProduction, path: '/' })
  res.status(204).end()
})

app.get('/api/auth/me', requireUser, (req, res) => res.json({ user: req.user }))

app.post('/api/activity/page-view', requireUser, async (req, res) => {
  const page = typeof req.body?.page === 'string' ? req.body.page.trim().slice(0, 40) : ''
  const allowedPages = new Set(['overview', 'vocabulary', 'grammar', 'exercises', 'review', 'typing', 'analytics', 'notebook', 'admin'])
  if (!allowedPages.has(page)) return res.status(400).json({ error: 'Trang hoạt động không hợp lệ.' })
  await recordActivity(req, req.user.id, 'page_view', { page })
  res.status(204).end()
})

app.get('/api/admin/activity', requireUser, requireAdmin, async (req, res, next) => {
  try {
    const requestedLimit = Number(req.query.limit)
    const limit = Number.isInteger(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 100) : 50
    const result = await pool.query(
      `SELECT logs.id, logs.action, logs.metadata, logs.created_at,
              users.id AS user_id, users.email, users.name, users.role
       FROM activity_logs logs
       JOIN users ON users.id = logs.user_id
       WHERE logs.user_id <> $1
       ORDER BY logs.created_at DESC
       LIMIT $2`,
      [req.user.id, limit],
    )
    res.json({ entries: result.rows })
  } catch (error) { next(error) }
})

app.get('/api/learning-state', requireUser, async (req, res, next) => {
  try {
    const result = await pool.query('SELECT state FROM learning_states WHERE user_id = $1', [req.user.id])
    res.json({ state: result.rows[0]?.state ?? null })
  } catch (error) { next(error) }
})

app.put('/api/learning-state', requireUser, async (req, res, next) => {
  try {
    const state = req.body?.state
    if (!state || typeof state !== 'object' || Array.isArray(state)) return res.status(400).json({ error: 'Dữ liệu tiến độ không hợp lệ.' })
    const serialized = JSON.stringify(state)
    if (Buffer.byteLength(serialized, 'utf8') > 1_000_000) return res.status(413).json({ error: 'Dữ liệu tiến độ quá lớn.' })
    await pool.query(
      `INSERT INTO learning_states (user_id, state, updated_at) VALUES ($1, $2::jsonb, NOW())
       ON CONFLICT (user_id) DO UPDATE SET state = EXCLUDED.state, updated_at = NOW()`,
      [req.user.id, serialized],
    )
    res.status(204).end()
  } catch (error) { next(error) }
})

app.get('/api/study/reviews/due', requireUser, async (req, res, next) => {
  try {
    const requestedLimit = Number(req.query.limit)
    const limit = Number.isInteger(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 50) : 10
    res.json({ items: await listDueReviews({ pool, userId: req.user.id, limit }) })
  } catch (error) { next(error) }
})

app.post('/api/study/reviews', requireUser, async (req, res, next) => {
  try {
    const mutation = parseReviewMutation(req.body)
    const result = await recordReview({ pool, userId: req.user.id, mutation })
    res.status(result.replayed ? 200 : 201).json({ review: result })
  } catch (error) { next(error) }
})

app.get('/api/practice/mistakes', requireUser, async (req, res, next) => {
  try {
    res.json({ items: await listMistakes({ pool, userId: req.user.id }) })
  } catch (error) { next(error) }
})

app.post('/api/practice/attempts', requireUser, async (req, res, next) => {
  try {
    const mutation = parsePracticeMutation(req.body)
    const result = await recordPracticeAttempt({ pool, userId: req.user.id, mutation })
    res.status(result.replayed ? 200 : 201).json({ attempt: result })
  } catch (error) { next(error) }
})

app.use('/api', (_req, res) => res.status(404).json({ error: 'Không tìm thấy API.' }))

if (isProduction) {
  const clientBuild = path.join(projectRoot, 'dist')
  app.use(express.static(clientBuild))
  app.get('/{*splat}', (_req, res) => res.sendFile(path.join(clientBuild, 'index.html')))
}

app.use((error, _req, res, _next) => {
  if (error instanceof StudyInputError) return res.status(error.status).json({ error: error.message })
  console.error(error)
  res.status(500).json({ error: 'Máy chủ gặp lỗi. Vui lòng thử lại.' })
})

async function start() {
  const requiredV1Tables = ['users', 'learning_states', 'activity_logs']
  const existingTables = await Promise.all(requiredV1Tables.map(async (table) => {
    const result = await pool.query('SELECT to_regclass($1) AS relation', [`public.${table}`])
    return result.rows[0]?.relation ? table : null
  }))
  const missingV1Tables = existingTables.filter((table) => table === null)
  if (missingV1Tables.length) {
    throw new Error(`V1 database schema is missing: ${missingV1Tables.join(', ')}. Run npm run db:migrate only on a backed-up/rehearsed database.`)
  }

  try {
    await pool.query('SELECT 1 FROM schema_migrations LIMIT 1')
  } catch (error) {
    if (error?.code !== '42P01') throw error
    console.warn('V1 compatibility mode: schema_migrations is absent; V2 event APIs remain unavailable until a rehearsed migration.')
  }
  if (adminEmails.size) {
    await pool.query(
      "UPDATE users SET role = 'admin' WHERE lower(email) = ANY($1::text[])",
      [[...adminEmails]],
    )
  }
  app.listen(port, '0.0.0.0', () => console.log(`HANZI running on port ${port}`))
}

start().catch((error) => { console.error('Could not start API:', error); process.exit(1) })
