import 'dotenv/config'
import bcrypt from 'bcryptjs'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import express from 'express'
import jwt from 'jsonwebtoken'
import pg from 'pg'

const { Pool } = pg
const port = Number(process.env.PORT ?? 3001)
const clientOrigin = process.env.CLIENT_ORIGIN ?? 'http://127.0.0.1:4173'
const isProduction = process.env.NODE_ENV === 'production'

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required')
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) throw new Error('JWT_SECRET must be at least 32 characters')

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
const app = express()

app.use(cors({ origin: clientOrigin, credentials: true }))
app.use(express.json({ limit: '1mb' }))
app.use(cookieParser())

const cookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/',
}

function publicUser(row) {
  return { id: row.id, email: row.email, name: row.name }
}

function createToken(user) {
  return jwt.sign({ sub: String(user.id), email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' })
}

function setSession(res, user) {
  res.cookie('hanzi_session', createToken(user), cookieOptions)
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
    const result = await pool.query('SELECT id, email, name FROM users WHERE id = $1', [payload.sub])
    if (!result.rowCount) return res.status(401).json({ error: 'Phiên đăng nhập không còn hợp lệ.' })
    req.user = publicUser(result.rows[0])
    next()
  } catch {
    res.clearCookie('hanzi_session', { httpOnly: true, sameSite: 'lax', secure: isProduction, path: '/' })
    return res.status(401).json({ error: 'Phiên đăng nhập đã hết hạn.' })
  }
}

app.get('/api/health', (_req, res) => res.json({ ok: true }))

app.post('/api/auth/register', async (req, res, next) => {
  try {
    const credentials = readCredentials(req, res)
    if (!credentials) return
    const passwordHash = await bcrypt.hash(credentials.password, 12)
    const result = await pool.query(
      'INSERT INTO users (email, name, password_hash) VALUES ($1, $2, $3) RETURNING id, email, name',
      [credentials.email, credentials.name || null, passwordHash],
    )
    const user = publicUser(result.rows[0])
    setSession(res, user)
    res.status(201).json({ user })
  } catch (error) {
    if (error?.code === '23505') return res.status(409).json({ error: 'Email này đã được đăng ký.' })
    next(error)
  }
})

app.post('/api/auth/login', async (req, res, next) => {
  try {
    const credentials = readCredentials(req, res)
    if (!credentials) return
    const result = await pool.query('SELECT id, email, name, password_hash FROM users WHERE email = $1', [credentials.email])
    const row = result.rows[0]
    if (!row || !(await bcrypt.compare(credentials.password, row.password_hash))) {
      return res.status(401).json({ error: 'Email hoặc mật khẩu chưa đúng.' })
    }
    const user = publicUser(row)
    setSession(res, user)
    res.json({ user })
  } catch (error) { next(error) }
})

app.post('/api/auth/logout', (_req, res) => {
  res.clearCookie('hanzi_session', { httpOnly: true, sameSite: 'lax', secure: isProduction, path: '/' })
  res.status(204).end()
})

app.get('/api/auth/me', requireUser, (req, res) => res.json({ user: req.user }))

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

app.use((error, _req, res, _next) => {
  console.error(error)
  res.status(500).json({ error: 'Máy chủ gặp lỗi. Vui lòng thử lại.' })
})

async function start() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id BIGSERIAL PRIMARY KEY,
      email VARCHAR(320) NOT NULL UNIQUE,
      name VARCHAR(80),
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS learning_states (
      user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      state JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `)
  app.listen(port, () => console.log(`HANZI API listening on http://127.0.0.1:${port}`))
}

start().catch((error) => { console.error('Could not start API:', error); process.exit(1) })
