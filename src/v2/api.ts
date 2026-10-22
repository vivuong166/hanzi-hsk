export type AuthUser = { id: number; email: string; name: string | null; role: 'learner' | 'admin' }
export type PracticeAttempt = { attemptId: string; exerciseId: string; isCorrect: boolean; occurredAt: string; explanation: string; replayed: boolean }
export type MistakeRecord = { exerciseId: string; answer: string | string[]; incorrectCount: number; occurredAt: string }
export type V2UpgradeStatus = {
  v2SchemaReady: boolean
  handoverEnabled: boolean
  v1: { exists: boolean; updatedAt: string | null; sourceChecksum: string | null }
  migration: 'schema_not_ready' | 'no_v1_state' | 'not_imported' | 'current' | 'stale'
  lastImport: { id: string; sourceChecksum: string; completedAt: string | null; report: { unmapped?: unknown[] } | null } | null
}
export type V2ImportResult = {
  status: 'no_v1_state' | 'already_imported' | 'imported' | 'v1_state_changed_after_import'
  runId?: string
  sourceChecksum?: string
  importedChecksum?: string
  imported?: Record<string, number>
  unmapped?: unknown[]
}

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message)
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: 'include',
    headers: { ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...init.headers },
  })
  const payload = response.status === 204 ? null : await response.json().catch(() => null)
  if (!response.ok) throw new ApiError(payload?.error || 'Không thể kết nối đến máy chủ.', response.status)
  return payload as T
}

export async function getCurrentUser() {
  try {
    return (await request<{ user: AuthUser }>('/api/auth/me')).user
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null
    throw error
  }
}

export function signIn(email: string, password: string) {
  return request<{ user: AuthUser }>('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) })
}

export function register(name: string, email: string, password: string) {
  return request<{ user: AuthUser }>('/api/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password }) })
}

export function signOut() {
  return request<null>('/api/auth/logout', { method: 'POST' })
}

export function submitPracticeAttempt(exerciseId: string, answer: string | string[], idempotencyKey: string) {
  return request<{ attempt: PracticeAttempt }>('/api/practice/attempts', {
    method: 'POST',
    body: JSON.stringify({ exerciseId, answer, idempotencyKey }),
  })
}

export async function getMistakes() {
  return (await request<{ items: MistakeRecord[] }>('/api/practice/mistakes')).items
}

export function getV2UpgradeStatus() {
  return request<V2UpgradeStatus>('/api/v2/upgrade/status')
}

export function importV1IntoV2() {
  return request<{ upgrade: V2ImportResult }>('/api/v2/upgrade/import-v1', { method: 'POST' })
}
