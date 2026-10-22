import { CSSProperties, FormEvent, KeyboardEvent, PointerEvent as ReactPointerEvent, useEffect, useRef, useState } from 'react'
import { exercises, grammar, Vocabulary, vocabulary, type Exercise } from './data'

type View = 'overview' | 'vocabulary' | 'grammar' | 'exercises' | 'review' | 'typing' | 'exam' | 'analytics' | 'notebook' | 'notebooks' | 'settings' | 'admin'
type Rating = 'again' | 'hard' | 'good' | 'easy'
type DeckLevel = 1 | 2 | 3 | 4
type Review = { dueAt: number; intervalHours: number; repetitions: number; lapses: number; lastRating: Rating; lastReviewedAt: number }
type Mistake = { exerciseId: string; answer: string; occurredAt: number; count: number; prompt?: string; tags?: string[]; correctAnswer?: string; explanation?: string }
type TypingAttempt = { wordId: string; deckLevel: DeckLevel; answer: string; correct: boolean; elapsedMs: number; completedAt: number }
type Activity = Record<string, { cards: number; exercises: number; minutes: number }>
type MockExamSession = { seed: number; title: string; currentQuestion: number; answers: Record<string, string>; startedAt: number }
type MockExamResult = { id: number; title: string; completedAt: number; score: number; total: number; durationSeconds: number }
type PersonalNotebook = { id: string; name: string; wordIds: string[]; createdAt: number; updatedAt: number }
type LearningPreferences = { autoPronounce: boolean; showPinyin: boolean; fontScale: 'default' | 'large'; speechRate: number }
type LearningState = {
  level: string
  deckLevel: DeckLevel
  theme: 'light' | 'dark'
  goal: number
  onboarded: boolean
  reviews: Record<string, Review>
  favorites: string[]
  difficult: string[]
  mistakes: Record<string, Mistake>
  activity: Activity
  completedGrammar: string[]
  completedExercises: string[]
  exerciseCursor: number
  mockExam: MockExamSession | null
  mockExamHistory: MockExamResult[]
  typingAttempts: TypingAttempt[]
  notebooks: PersonalNotebook[]
  recentLookups: string[]
  preferences: LearningPreferences
}
type AuthUser = { id: number; email: string; name: string | null; role: 'learner' | 'admin' }
type ActivityEntry = {
  id: number
  action: 'account_registered' | 'login' | 'logout' | 'page_view'
  metadata: { page?: string }
  created_at: string
  user_id: number
  email: string
  name: string | null
  role: string
}

const storageKey = 'hanzi.learning-state.v1'
const deckRanges: Record<DeckLevel, { from: number; to: number }> = {
  1: { from: 1, to: 150 },
  2: { from: 151, to: 300 },
  3: { from: 301, to: 600 },
  4: { from: 601, to: 1200 },
}
const deckOptions: Array<{ level: DeckLevel; label: string }> = [
  { level: 1, label: 'HSK 1 · 150 từ' },
  { level: 2, label: 'HSK 2 · 150 từ' },
  { level: 3, label: 'HSK 3 · 300 từ' },
  { level: 4, label: 'HSK 4 · 600 từ' },
]
const hsk4ExerciseWords = vocabulary.filter((word) => (word.sourceIndex ?? 0) >= 601 && (word.sourceIndex ?? 0) <= 1200)
const grammarExerciseInterval = 10
const hsk4VocabularyQuestionCount = hsk4ExerciseWords.length * 3
const hsk4CurriculumLength = hsk4VocabularyQuestionCount + Math.floor(hsk4VocabularyQuestionCount / (grammarExerciseInterval - 1))
const defaultState: LearningState = {
  level: 'HSK 4', deckLevel: 4, theme: 'light', goal: 15, onboarded: false, reviews: {}, favorites: [], difficult: [],
  mistakes: {}, activity: {}, completedGrammar: [], completedExercises: [], exerciseCursor: 0, mockExam: null, mockExamHistory: [], typingAttempts: [],
  notebooks: [], recentLookups: [], preferences: { autoPronounce: false, showPinyin: true, fontScale: 'default', speechRate: 0.82 },
}

function accountStorageKey(userId: number) {
  return `${storageKey}.user-${userId}`
}

function hydrateLearningState(saved: Partial<LearningState>): LearningState {
  return {
    ...defaultState,
    ...saved,
    notebooks: Array.isArray(saved.notebooks) ? saved.notebooks : defaultState.notebooks,
    recentLookups: Array.isArray(saved.recentLookups) ? saved.recentLookups : defaultState.recentLookups,
    preferences: { ...defaultState.preferences, ...saved.preferences },
  }
}

function readState(userId: number): LearningState | null {
  try {
    const saved = localStorage.getItem(accountStorageKey(userId))
    return saved ? hydrateLearningState(JSON.parse(saved) as Partial<LearningState>) : null
  } catch {
    return null
  }
}

function todayKey(date = new Date()) {
  return date.toLocaleDateString('en-CA')
}

function normalized(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

function speak(text: string, rate = 0.82) {
  if (!('speechSynthesis' in window)) return
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'zh-CN'
  utterance.rate = rate
  window.speechSynthesis.speak(utterance)
}

function schedule(previous: Review | undefined, rating: Rating): Review {
  const now = Date.now()
  const previousHours = previous?.intervalHours ?? 0
  const intervalHours = rating === 'again'
    ? 0.17
    : rating === 'hard'
      ? Math.max(8, previousHours ? previousHours * 1.25 : 12)
      : rating === 'good'
        ? previousHours ? Math.max(24, previousHours * 2.4) : 24
        : previousHours ? Math.max(72, previousHours * 3.3) : 72
  return {
    dueAt: now + intervalHours * 60 * 60 * 1000,
    intervalHours,
    repetitions: (previous?.repetitions ?? 0) + 1,
    lapses: (previous?.lapses ?? 0) + (rating === 'again' ? 1 : 0),
    lastRating: rating,
    lastReviewedAt: now,
  }
}

function dateLabel(timestamp: number) {
  const diff = timestamp - Date.now()
  if (diff <= 0) return 'Đến hạn ngay'
  const hours = Math.ceil(diff / 3_600_000)
  if (hours < 24) return `${hours} giờ nữa`
  return `${Math.ceil(hours / 24)} ngày nữa`
}

const nav: Array<{ id: View; label: string; icon: string }> = [
  { id: 'overview', label: 'Tổng quan', icon: '⌂' },
  { id: 'vocabulary', label: 'Từ vựng', icon: '文' },
  { id: 'grammar', label: 'Ngữ pháp', icon: '⌘' },
  { id: 'exercises', label: 'Bài tập', icon: '✓' },
  { id: 'review', label: 'Ôn tập', icon: '↻' },
  { id: 'typing', label: 'Luyện gõ', icon: '⌨' },
  { id: 'exam', label: 'Luyện thi', icon: '✦' },
  { id: 'analytics', label: 'Thống kê', icon: '▥' },
]
const adminNav: { id: View; label: string; icon: string } = { id: 'admin', label: 'Quản trị', icon: '◈' }

const personalNav: { id: View; label: string; icon: string } = { id: 'notebooks', label: 'Sổ từ của tôi', icon: '▣' }
const settingsNav: { id: View; label: string; icon: string } = { id: 'settings', label: 'Cài đặt học', icon: '⚙' }

export default function App() {
  const [state, setState] = useState<LearningState>(defaultState)
  const [view, setView] = useState<View>('overview')
  const [commandOpen, setCommandOpen] = useState(false)
  const [command, setCommand] = useState('')
  const [selectedWordId, setSelectedWordId] = useState<string | null>(null)
  const [reviewQueue, setReviewQueue] = useState<{ wordIds: string[]; label: string } | null>(null)
  const [user, setUser] = useState<AuthUser | null>(null)
  const [checkingSession, setCheckingSession] = useState(true)

  const hydrateAccount = async (account: AuthUser) => {
    let accountState = readState(account.id) ?? defaultState
    try {
      const saved = await fetch('/api/learning-state', { credentials: 'include' })
      if (saved.ok) {
        const savedData = await saved.json() as { state: Partial<LearningState> | null }
        if (savedData.state) accountState = hydrateLearningState(savedData.state)
      }
    } catch {
      // Keep the account-specific local backup when the API is temporarily unavailable.
    }
    setState(accountState)
    setUser(account)
  }

  useEffect(() => {
    if (!user || checkingSession) return
    localStorage.setItem(accountStorageKey(user.id), JSON.stringify(state))
  }, [state, user, checkingSession])
  useEffect(() => {
    if (!user || checkingSession || (view === 'admin' && user.role !== 'admin')) return
    fetch('/api/activity/page-view', {
      method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ page: view }),
    }).catch(() => undefined)
  }, [view, user, checkingSession])
  useEffect(() => {
    let current = true
    const restoreSession = async () => {
      try {
        const session = await fetch('/api/auth/me', { credentials: 'include' })
        if (!session.ok) return
        const sessionData = await session.json() as { user: AuthUser }
        if (!current) return
        await hydrateAccount(sessionData.user)
      } catch {
        // The sign-in screen remains available when the API is temporarily unreachable.
      } finally {
        if (current) setCheckingSession(false)
      }
    }
    restoreSession()
    return () => { current = false }
  }, [])
  useEffect(() => {
    if (!user || checkingSession) return
    const timer = window.setTimeout(() => {
      fetch('/api/learning-state', {
        method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ state }),
      }).catch(() => undefined)
    }, 450)
    return () => window.clearTimeout(timer)
  }, [state, user, checkingSession])
  useEffect(() => {
    const keydown = (event: globalThis.KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault(); setCommandOpen(true)
      }
    }
    window.addEventListener('keydown', keydown)
    return () => window.removeEventListener('keydown', keydown)
  }, [])

  const update = (recipe: (previous: LearningState) => LearningState) => setState(recipe)
  const reviewedIds = Object.keys(state.reviews)
  const mastered = reviewedIds.filter((id) => state.reviews[id].repetitions >= 3).length
  const deckRange = deckRanges[state.deckLevel]
  const deckWords = vocabulary.filter((word) => {
    const sourceIndex = word.sourceIndex ?? Infinity
    return sourceIndex >= deckRange.from && sourceIndex <= deckRange.to
  })
  const due = deckWords.filter((word) => state.reviews[word.id]?.dueAt <= Date.now())
  const activity = state.activity[todayKey()] ?? { cards: 0, exercises: 0, minutes: 0 }
  const unseenCards = deckWords
    .filter((word) => !state.reviews[word.id])
    .sort((first, second) => (first.sourceIndex ?? 0) - (second.sourceIndex ?? 0))
  const initialCards = unseenCards.slice(0, state.goal)
  const standardReviewWords = due.length ? due : initialCards.length ? initialCards : deckWords.slice(0, state.goal)
  const reviewWords = reviewQueue
    ? vocabulary.filter((word) => reviewQueue.wordIds.includes(word.id))
    : standardReviewWords

  const setTheme = () => update((previous) => ({ ...previous, theme: previous.theme === 'light' ? 'dark' : 'light' }))
  const addActivity = (kind: 'cards' | 'exercises', minutes = 1) => update((previous) => {
    const today = todayKey()
    const before = previous.activity[today] ?? { cards: 0, exercises: 0, minutes: 0 }
    return { ...previous, activity: { ...previous.activity, [today]: { ...before, [kind]: before[kind] + 1, minutes: before.minutes + minutes } } }
  })
  const rate = (id: string, rating: Rating) => update((previous) => {
    const today = todayKey(); const before = previous.activity[today] ?? { cards: 0, exercises: 0, minutes: 0 }
    return {
      ...previous,
      reviews: { ...previous.reviews, [id]: schedule(previous.reviews[id], rating) },
      activity: { ...previous.activity, [today]: { ...before, cards: before.cards + 1, minutes: before.minutes + 1 } },
    }
  })
  const toggleFavorite = (id: string) => update((previous) => ({
    ...previous, favorites: previous.favorites.includes(id) ? previous.favorites.filter((item) => item !== id) : [...previous.favorites, id],
  }))
  const toggleDifficult = (id: string) => update((previous) => ({
    ...previous, difficult: previous.difficult.includes(id) ? previous.difficult.filter((item) => item !== id) : [...previous.difficult, id],
  }))
  const setDeckLevel = (deckLevel: DeckLevel) => update((previous) => ({ ...previous, deckLevel, level: `HSK ${deckLevel}` }))
  const openWord = (wordId: string) => {
    setSelectedWordId(wordId)
    setView('vocabulary')
    update((previous) => ({ ...previous, recentLookups: [wordId, ...previous.recentLookups.filter((id) => id !== wordId)].slice(0, 8) }))
  }
  const addWordToNotebook = (notebookId: string, wordId: string) => update((previous) => ({
    ...previous,
    notebooks: previous.notebooks.map((notebook) => notebook.id !== notebookId || notebook.wordIds.includes(wordId)
      ? notebook
      : { ...notebook, wordIds: [...notebook.wordIds, wordId], updatedAt: Date.now() }),
  }))
  const startNotebookReview = (wordIds: string[], label: string) => {
    setReviewQueue({ wordIds, label })
    setView('review')
  }

  const shared = { state, update, rate, toggleFavorite, toggleDifficult, setView, addActivity }

  const logout = async () => {
    if (user) {
      await fetch('/api/learning-state', {
        method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ state }),
      }).catch(() => undefined)
    }
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => undefined)
    setUser(null)
    setState(defaultState)
    setView('overview')
  }

  if (checkingSession) return <div className="auth-loading">Đang kiểm tra phiên đăng nhập…</div>
  if (!user) return <AuthScreen onAuthenticated={hydrateAccount} />

  return (
    <div className={`app ${state.theme === 'dark' ? 'dark' : ''} ${state.preferences.fontScale === 'large' ? 'font-large' : ''}`}>
      <Sidebar state={state} view={view} setView={setView} setTheme={setTheme} openSearch={() => setCommandOpen(true)} user={user} />
      <main className="main">
        <Topbar due={due.length} openSearch={() => setCommandOpen(true)} user={user} deckLevel={state.deckLevel} setDeckLevel={setDeckLevel} logout={logout} />
        {view === 'overview' && <Overview reviewed={deckWords.filter((word) => state.reviews[word.id]).length} mastered={deckWords.filter((word) => state.reviews[word.id]?.repetitions >= 3).length} due={due.length} activity={activity} state={state} deckLevel={state.deckLevel} deckTotal={deckWords.length} setView={setView} />}
        {view === 'vocabulary' && <VocabularyPage {...shared} selectedWordId={selectedWordId} onOpenWord={openWord} addWordToNotebook={addWordToNotebook} />}
        {view === 'grammar' && <GrammarPage state={state} update={update} />}
        {view === 'exercises' && <ExercisePage state={state} update={update} addActivity={addActivity} />}
        {view === 'review' && <ReviewPage key={`${state.deckLevel}-${reviewQueue?.label ?? 'daily'}-${reviewQueue?.wordIds.join('-') ?? ''}`} words={reviewWords} deckLevel={state.deckLevel} setDeckLevel={setDeckLevel} rate={rate} difficult={state.difficult} toggleDifficult={toggleDifficult} speechRate={state.preferences.speechRate} label={reviewQueue?.label} clearCustomQueue={() => setReviewQueue(null)} />}
        {view === 'typing' && <TypingPracticePage key={state.deckLevel} words={deckWords} deckLevel={state.deckLevel} update={update} />}
        {view === 'exam' && <MockExamPage state={state} update={update} addActivity={addActivity} />}
        {view === 'analytics' && <AnalyticsPage state={state} learned={reviewedIds.length} mastered={mastered} />}
        {view === 'notebook' && <Notebook state={state} setView={setView} />}
        {view === 'notebooks' && <PersonalNotebooksPage state={state} update={update} openWord={openWord} startReview={startNotebookReview} />}
        {view === 'settings' && <SettingsPage state={state} update={update} />}
        {view === 'admin' && user.role === 'admin' && <AdminActivityPage />}
      </main>
      <MobileNavigation view={view} setView={setView} user={user} />
      {!state.onboarded && <Onboarding state={state} update={update} />}
      {commandOpen && <SearchDialog value={command} setValue={setCommand} close={() => setCommandOpen(false)} setView={setView} recentLookups={state.recentLookups} openWord={openWord} />}
    </div>
  )
}

function Sidebar({ state, view, setView, setTheme, openSearch, user }: { state: LearningState; view: View; setView: (view: View) => void; setTheme: () => void; openSearch: () => void; user: AuthUser }) {
  const visibleNav = [...nav, personalNav, ...(user.role === 'admin' ? [adminNav] : [])]
  return <aside className="sidebar">
    <button className="brand" onClick={() => setView('overview')} aria-label="Về tổng quan"><span>汉</span> HANZI</button>
    <button className="search-button side-search" onClick={openSearch}><span>⌕</span> Tìm kiếm <kbd>Ctrl K</kbd></button>
    <nav aria-label="Điều hướng chính">{visibleNav.map((item) => <button key={item.id} className={`nav-item ${view === item.id ? 'active' : ''}`} onClick={() => setView(item.id)}><i>{item.icon}</i>{item.label}</button>)}</nav>
    <div className="sidebar-footer">
      <button className={`nav-item ${view === 'settings' ? 'active' : ''}`} onClick={() => setView('settings')}><i>⚙</i>Cài đặt học</button>
      <button className={`nav-item ${view === 'notebook' ? 'active' : ''}`} onClick={() => setView('notebook')}><i>▣</i>Sổ tay lỗi sai</button>
      <button className="theme-button" onClick={setTheme}><span>{state.theme === 'light' ? '◐' : '☼'}</span>{state.theme === 'light' ? 'Chế độ tối' : 'Chế độ sáng'}</button>
    </div>
  </aside>
}

function Topbar({ due, openSearch, user, deckLevel, setDeckLevel, logout }: { due: number; openSearch: () => void; user: AuthUser; deckLevel: DeckLevel; setDeckLevel: (level: DeckLevel) => void; logout: () => void }) {
  return <header className="topbar">
    <button className="mobile-brand" aria-label="HANZI">汉</button>
    <button className="search-button top-search" onClick={openSearch}><span>⌕</span> Tìm từ, ngữ pháp… <kbd>Ctrl K</kbd></button>
    <div className="top-actions">
      <span className="review-count" aria-label={`${due} thẻ cần ôn`}>↻ <b>{due}</b></span>
      <label className="level-select">Thẻ HSK {deckLevel}<select value={deckLevel} aria-label="Chọn bộ flashcard" onChange={(event) => setDeckLevel(Number(event.currentTarget.value) as DeckLevel)}>
        {deckOptions.map((deck) => <option key={deck.level} value={deck.level}>{deck.label}</option>)}
      </select></label>
      <button className="account-button" onClick={logout} title={user.email} aria-label="Đăng xuất"><span className="avatar">{(user.name || user.email).slice(0, 1).toUpperCase()}</span><b>Đăng xuất</b></button>
    </div>
  </header>
}

function AuthScreen({ onAuthenticated }: { onAuthenticated: (user: AuthUser) => Promise<void> }) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const response = await fetch(`/api/auth/${mode === 'login' ? 'login' : 'register'}`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
      })
      const payload = await response.text()
      let data: { user?: AuthUser; error?: string } = {}
      try { data = payload ? JSON.parse(payload) as { user?: AuthUser; error?: string } : {} } catch { /* Handle a proxy/server response that is not JSON. */ }
      if (!response.ok || !data.user) {
        const fallback = response.status === 401
          ? 'Email hoặc mật khẩu chưa đúng.'
          : response.status >= 500
            ? 'Máy chủ đang gặp lỗi. Vui lòng thử lại sau ít phút.'
            : 'Máy chủ không trả về dữ liệu hợp lệ. Hãy thử tải lại trang.'
        throw new Error(data.error || fallback)
      }
      await onAuthenticated(data.user)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không thể kết nối máy chủ.')
    } finally { setSubmitting(false) }
  }

  return <main className="auth-page"><section className="auth-card">
    <div className="auth-brand"><span>汉</span><b>HANZI</b></div>
    <p className="eyebrow">Tài khoản học viên</p>
    <h1>{mode === 'login' ? 'Chào mừng trở lại' : 'Tạo tài khoản mới'}</h1>
    <p className="muted">{mode === 'login' ? 'Đăng nhập để tiếp tục tiến độ học của bạn.' : 'Lưu tiến độ học an toàn trên tài khoản của bạn.'}</p>
    <form className="auth-form" onSubmit={submit}>
      {mode === 'register' && <label>Họ tên (không bắt buộc)<input value={name} onChange={(event) => setName(event.currentTarget.value)} autoComplete="name" maxLength={80} /></label>}
      <label>Email<input value={email} onChange={(event) => setEmail(event.currentTarget.value)} type="email" autoComplete="email" required /></label>
      <label>Mật khẩu<input value={password} onChange={(event) => setPassword(event.currentTarget.value)} type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength={8} required /></label>
      {mode === 'register' && <small>Mật khẩu cần ít nhất 8 ký tự.</small>}
      {error && <p className="auth-error" role="alert">{error}</p>}
      <button className="primary wide auth-submit" disabled={submitting}>{submitting ? 'Đang xử lý…' : mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}</button>
    </form>
    <p className="auth-switch">{mode === 'login' ? 'Chưa có tài khoản?' : 'Đã có tài khoản?'} <button onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }}>{mode === 'login' ? 'Đăng ký' : 'Đăng nhập'}</button></p>
  </section></main>
}

function Overview({ reviewed, mastered, due, activity, state, deckLevel, deckTotal, setView }: { reviewed: number; mastered: number; due: number; activity: { cards: number; exercises: number; minutes: number }; state: LearningState; deckLevel: DeckLevel; deckTotal: number; setView: (view: View) => void }) {
  const dailyProgress = Math.min(100, Math.round(((activity.cards + activity.exercises) / state.goal) * 100))
  const doneGrammar = state.completedGrammar.length
  const availableNew = Math.max(0, deckTotal - reviewed)
  const newTarget = Math.min(availableNew, Math.max(0, state.goal - activity.cards))
  return <section className="page overview-page">
    <div className="welcome-row">
      <div><p className="eyebrow">Flashcard HSK {deckLevel} · Giáo trình truyền thống</p><h1>Chào buổi sáng.</h1><p className="muted">Tiếp tục hành trình tiếng Trung của bạn, từng bước nhỏ.</p></div>
      <button className="primary" onClick={() => setView('review')}>Tiếp tục học <span>→</span></button>
    </div>
    <div className="progress-banner">
      <div><span className="label">Tiến độ flashcard HSK {deckLevel} · HSK 2.0 / 2015</span><strong>{reviewed} / {deckTotal} từ đã học</strong><p>Bạn có thể đổi bộ HSK 1–4 ở thanh trên hoặc trong màn ôn tập.</p></div>
      <div className="round-progress" style={{ '--progress': `${Math.round((reviewed / deckTotal) * 100)}%` } as CSSProperties}><span>{Math.round((reviewed / deckTotal) * 100)}%</span></div>
    </div>
    <section className="section-block"><div className="section-title"><div><p className="eyebrow">Kế hoạch hôm nay</p><h2>Nhẹ nhàng, nhưng có tiến bộ</h2></div><span className="date-pill">{new Intl.DateTimeFormat('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())}</span></div>
      <div className="plan-grid">
        <PlanCard icon="文" value={`${newTarget}`} text="từ mới còn lại" tone="green" onClick={() => setView('review')} />
        <PlanCard icon="↻" value={`${due}`} text="thẻ cần ôn" tone="orange" onClick={() => setView('review')} />
        <PlanCard icon="⌘" value={doneGrammar ? 'Tiếp tục' : 'Bắt đầu'} text={`${grammar[0].title}`} tone="purple" onClick={() => setView('grammar')} />
        <PlanCard icon="✓" value={`${Math.max(0, 10 - activity.exercises)}`} text="câu luyện tập" tone="blue" onClick={() => setView('exercises')} />
      </div>
    </section>
    <div className="overview-lower">
      <section className="daily-card"><div className="section-title"><div><p className="eyebrow">Tiến độ hôm nay</p><h2>{dailyProgress === 100 ? 'Bạn đã hoàn thành mục tiêu' : 'Mỗi ngày một ít'}</h2></div><strong>{dailyProgress}%</strong></div><div className="progress-track"><i style={{ width: `${dailyProgress}%` }} /></div><div className="daily-numbers"><span><b>{activity.cards}</b> thẻ đã ôn</span><span><b>{activity.exercises}</b> bài đã làm</span><span><b>{activity.minutes}</b> phút tập trung</span></div></section>
      <section className="next-card"><p className="eyebrow">Gợi ý tiếp theo</p><h3>{due ? 'Có thẻ đang chờ bạn' : 'Làm quen với từ mới'}</h3><p className="muted">{due ? `Ôn ${due} thẻ để giữ nhịp học.` : 'Khởi động bằng một phiên flashcard ngắn, không cần vội.'}</p><button className="text-button" onClick={() => setView('review')}>Mở phiên học <span>→</span></button></section>
    </div>
    <section className="stat-row"><Stat label="Từ đã học" value={reviewed} /><Stat label="Đã ghi nhớ" value={mastered} /><Stat label="Ngữ pháp hoàn thành" value={doneGrammar} /><Stat label="Lỗi cần xem lại" value={Object.keys(state.mistakes).length} /></section>
  </section>
}

function PlanCard({ icon, value, text, tone, onClick }: { icon: string; value: string; text: string; tone: string; onClick: () => void }) { return <button className={`plan-card ${tone}`} onClick={onClick}><i>{icon}</i><strong>{value}</strong><span>{text}</span><b>→</b></button> }
function Stat({ label, value }: { label: string; value: number | string }) { return <div className="stat"><strong>{value}</strong><span>{label}</span></div> }

function VocabularyPage({ state, toggleFavorite, toggleDifficult, selectedWordId, onOpenWord, addWordToNotebook }: Pick<{ state: LearningState; toggleFavorite: (id: string) => void; toggleDifficult: (id: string) => void }, 'state' | 'toggleFavorite' | 'toggleDifficult'> & { selectedWordId: string | null; onOpenWord: (wordId: string) => void; addWordToNotebook: (notebookId: string, wordId: string) => void }) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('Tất cả')
  const [selected, setSelected] = useState<Vocabulary>(vocabulary[0])
  useEffect(() => {
    const requested = vocabulary.find((word) => word.id === selectedWordId)
    if (requested) setSelected(requested)
  }, [selectedWordId])
  const curatedCount = vocabulary.filter((word) => word.contentStatus === 'curated').length
  const matches = vocabulary.filter((word) => {
    const haystack = normalized(`${word.hanzi} ${word.pinyin} ${word.meaning} ${word.topic}`)
    const selectedFilter = filter === 'Tất cả' || (filter === 'Từ mới HSK 4' && word.introducedAtLevel === 4) || (filter === 'Đã học' && !!state.reviews[word.id]) || (filter === 'Chưa học' && !state.reviews[word.id]) || (filter === 'Yêu thích' && state.favorites.includes(word.id)) || (filter === 'Khó' && state.difficult.includes(word.id))
    return selectedFilter && haystack.includes(normalized(query))
  })
  return <section className="page">
    <div className="page-heading"><div><p className="eyebrow">Thư viện · HSK 2.0 / 2015</p><h1>Từ vựng HSK 4</h1><p className="muted">Đủ {vocabulary.length} từ tích lũy của HSK 4, có pinyin, nghĩa Việt, từ loại và câu ví dụ. Trong đó, 600 từ cuối được giới thiệu ở riêng cấp HSK 4; {curatedCount} mục có bản dịch ví dụ tiếng Việt do dự án biên soạn.</p></div><span className="coverage">HSK 4 · 1.200 từ</span></div>
    <div className="library-layout"><div className="word-list-panel"><div className="field-with-icon"><span>⌕</span><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm Hán tự, pinyin hoặc nghĩa…" /></div><div className="filter-chips">{['Tất cả', 'Từ mới HSK 4', 'Chưa học', 'Đã học', 'Yêu thích', 'Khó'].map((item) => <button className={filter === item ? 'selected' : ''} onClick={() => setFilter(item)} key={item}>{item}</button>)}</div><p className="results-label">{matches.length} kết quả</p><div className="word-list">{matches.map((word) => <button key={word.id} className={`word-row ${selected.id === word.id ? 'selected' : ''}`} onClick={() => { setSelected(word); onOpenWord(word.id) }}><span className="hanzi-small">{word.hanzi}</span><span><b>{word.meaning}</b><small>{word.pinyin} · {word.partOfSpeech}</small></span><em>{state.reviews[word.id] ? 'Đã học' : word.contentStatus === 'curated' ? word.topic : `HSK ${word.introducedAtLevel}`}</em></button>)}{!matches.length && <div className="empty-state">Không tìm thấy từ phù hợp. Hãy thử một cách viết khác.</div>}</div></div>
      <div className="word-detail-stack"><WordDetail word={selected} state={state} toggleFavorite={toggleFavorite} toggleDifficult={toggleDifficult} /><WordLearningTools word={selected} state={state} onOpenWord={onOpenWord} addWordToNotebook={addWordToNotebook} /></div>
    </div>
  </section>
}

function WordDetail({ word, state, toggleFavorite, toggleDifficult }: { word: Vocabulary; state: LearningState; toggleFavorite: (id: string) => void; toggleDifficult: (id: string) => void }) {
  const favorite = state.favorites.includes(word.id); const difficult = state.difficult.includes(word.id); const review = state.reviews[word.id]
  return <article className="word-detail"><div className="detail-top"><div><p className="eyebrow">{word.topic} · {word.partOfSpeech}</p><h2 className="hanzi-display">{word.hanzi}</h2><p className="pinyin">{word.pinyin}</p><h3>{word.meaning}</h3></div><button className="sound-button" onClick={() => speak(word.hanzi)} aria-label={`Nghe ${word.hanzi}`}>⌕<span>♪</span></button></div>
    <div className="detail-actions"><button className={favorite ? 'saved' : ''} onClick={() => toggleFavorite(word.id)}>{favorite ? '♥ Đã lưu' : '♡ Lưu từ'}</button><button className={difficult ? 'saved warning' : ''} onClick={() => toggleDifficult(word.id)}>{difficult ? '⚑ Từ khó' : '⚐ Đánh dấu khó'}</button></div>
    <div className="example"><span>Ví dụ</span><p className="chinese-sentence">{word.example}</p>{word.translation && <p>{word.translation}</p>}<button className="inline-audio" onClick={() => speak(word.example)}>♪ Nghe câu</button></div>
    <dl className="word-meta"><div><dt>{word.contentStatus === 'curated' ? 'Độ khó' : 'Xuất hiện từ'}</dt><dd>{word.contentStatus === 'curated' ? `${'●'.repeat(word.difficulty)}${'○'.repeat(3 - word.difficulty)}` : `HSK ${word.introducedAtLevel}`}</dd></div><div><dt>{word.contentStatus === 'curated' ? 'Ôn lại' : 'Số thứ tự nguồn'}</dt><dd>{word.contentStatus === 'curated' ? review ? dateLabel(review.dueAt) : 'Chưa có lịch ôn' : `#${word.sourceIndex} / 1.200`}</dd></div>{word.grammarId && <div><dt>Liên kết</dt><dd>Ngữ pháp liên quan</dd></div>}</dl>
  </article>
}

type BrowserRecognitionResultEvent = Event & { results: ArrayLike<ArrayLike<{ transcript: string }>> }
type BrowserRecognition = {
  lang: string
  interimResults: boolean
  maxAlternatives: number
  start: () => void
  onresult: ((event: BrowserRecognitionResultEvent) => void) | null
  onerror: ((event: { error?: string }) => void) | null
  onend: (() => void) | null
}
type BrowserRecognitionConstructor = new () => BrowserRecognition

function getBrowserRecognitionConstructor() {
  const browser = window as typeof window & { SpeechRecognition?: BrowserRecognitionConstructor; webkitSpeechRecognition?: BrowserRecognitionConstructor }
  return browser.SpeechRecognition ?? browser.webkitSpeechRecognition ?? null
}

function WritingPad({ word }: { word: Vocabulary }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const lastPoint = useRef<{ x: number; y: number } | null>(null)
  const [strokes, setStrokes] = useState(0)

  const pointFor = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = event.currentTarget
    const rect = canvas.getBoundingClientRect()
    return { x: (event.clientX - rect.left) * (canvas.width / rect.width), y: (event.clientY - rect.top) * (canvas.height / rect.height) }
  }
  const clear = () => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (canvas && context) context.clearRect(0, 0, canvas.width, canvas.height)
    lastPoint.current = null
    setStrokes(0)
  }
  useEffect(() => { clear() }, [word.id])
  const startStroke = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    lastPoint.current = pointFor(event)
    setStrokes((count) => count + 1)
  }
  const draw = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!lastPoint.current) return
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return
    const next = pointFor(event)
    context.strokeStyle = '#1f6651'
    context.lineWidth = 11
    context.lineCap = 'round'
    context.lineJoin = 'round'
    context.beginPath()
    context.moveTo(lastPoint.current.x, lastPoint.current.y)
    context.lineTo(next.x, next.y)
    context.stroke()
    lastPoint.current = next
  }
  return <section className="word-tool writing-tool"><div><p className="eyebrow">Viết tự do</p><h4>Viết lại {word.hanzi}</h4><p>Đây là bảng tập nét tự do trên trình duyệt; chưa có nhận diện chữ viết hay chấm thứ tự nét.</p></div><canvas ref={canvasRef} width="640" height="280" aria-label={`Bảng luyện viết ${word.hanzi}`} onPointerDown={startStroke} onPointerMove={draw} onPointerUp={() => { lastPoint.current = null }} onPointerCancel={() => { lastPoint.current = null }} /><div className="tool-footer"><span>{strokes ? `${strokes} nét đã vẽ` : 'Dùng chuột hoặc ngón tay để viết.'}</span><button className="secondary" onClick={clear}>Xoá bảng</button></div></section>
}

function PronunciationPractice({ word, speechRate }: { word: Vocabulary; speechRate: number }) {
  const [listening, setListening] = useState(false)
  const [message, setMessage] = useState('')
  const available = typeof window !== 'undefined' && Boolean(getBrowserRecognitionConstructor())
  const startListening = () => {
    const Recognition = getBrowserRecognitionConstructor()
    if (!Recognition) { setMessage('Trình duyệt này chưa hỗ trợ nhận chữ từ giọng nói. Bạn vẫn có thể nghe mẫu rồi tự đọc lại.'); return }
    const recognition = new Recognition()
    recognition.lang = 'zh-CN'
    recognition.interimResults = false
    recognition.maxAlternatives = 1
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript?.trim() ?? ''
      setMessage(transcript ? `Trình duyệt nghe: “${transcript}”. Đây chỉ là transcript tham khảo, không phải điểm phát âm.` : 'Chưa nhận được transcript.')
    }
    recognition.onerror = (event) => setMessage(event.error === 'not-allowed' ? 'Bạn đã từ chối microphone. Hãy cho phép quyền mic nếu muốn thử lại.' : 'Chưa thể nhận transcript. Hãy thử lại ở nơi yên tĩnh.')
    recognition.onend = () => setListening(false)
    setMessage('Đang nghe… Hãy đọc rõ từ trên.')
    setListening(true)
    recognition.start()
  }
  return <section className="word-tool pronunciation-tool"><div><p className="eyebrow">Luyện đọc</p><h4>Nghe, nhắc lại, tự đối chiếu</h4><p>Microphone chỉ được yêu cầu khi bạn bấm “Bắt đầu nghe”. Kết quả không phải chấm điểm phát âm.</p></div><div className="tool-actions"><button className="secondary" onClick={() => speak(word.hanzi, speechRate)}>♪ Nghe mẫu</button><button className="primary" disabled={listening} onClick={startListening}>{listening ? 'Đang nghe…' : available ? 'Bắt đầu nghe' : 'Kiểm tra hỗ trợ'}</button></div>{message && <p className="tool-message" role="status">{message}</p>}</section>
}

function WordLearningTools({ word, state, onOpenWord, addWordToNotebook }: { word: Vocabulary; state: LearningState; onOpenWord: (wordId: string) => void; addWordToNotebook: (notebookId: string, wordId: string) => void }) {
  const relatedWords = vocabulary.filter((candidate) => candidate.id !== word.id && candidate.topic === word.topic).slice(0, 4)
  const grammarPoint = word.grammarId ? grammar.find((point) => point.id === word.grammarId) : null
  useEffect(() => {
    if (state.preferences.autoPronounce) speak(word.hanzi, state.preferences.speechRate)
  }, [word.id, state.preferences.autoPronounce, state.preferences.speechRate])
  return <section className="word-learning-tools">
    <section className="word-tool"><p className="eyebrow">Sổ từ cá nhân</p><h4>Lưu từ vào một mục tiêu cụ thể</h4>{state.notebooks.length ? <label className="notebook-select">Chọn sổ<select defaultValue="" onChange={(event) => { if (event.currentTarget.value) { addWordToNotebook(event.currentTarget.value, word.id); event.currentTarget.value = '' } }}><option value="" disabled>Thêm {word.hanzi} vào sổ…</option>{state.notebooks.map((notebook) => <option value={notebook.id} key={notebook.id}>{notebook.name}{notebook.wordIds.includes(word.id) ? ' · đã có' : ''}</option>)}</select></label> : <p className="muted">Chưa có sổ từ. Mở “Sổ từ của tôi” ở thanh điều hướng để tạo sổ đầu tiên.</p>}</section>
    <section className="word-tool"><p className="eyebrow">Ngữ cảnh</p><h4>{grammarPoint ? `Ngữ pháp liên quan: ${grammarPoint.title}` : 'Mở rộng vốn từ cùng chủ đề'}</h4>{relatedWords.length ? <div className="related-word-list">{relatedWords.map((candidate) => <button key={candidate.id} onClick={() => onOpenWord(candidate.id)}><span lang="zh-CN">{candidate.hanzi}</span><small>{state.preferences.showPinyin ? candidate.pinyin : 'Pinyin đang ẩn'}</small><b>{candidate.meaning}</b></button>)}</div> : <p className="muted">Chưa có gợi ý cùng chủ đề cho mục này.</p>}</section>
    <PronunciationPractice word={word} speechRate={state.preferences.speechRate} />
    <WritingPad word={word} />
  </section>
}

function GrammarPage({ state, update }: { state: LearningState; update: (recipe: (state: LearningState) => LearningState) => void }) {
  const [selected, setSelected] = useState(grammar[0])
  const complete = state.completedGrammar.includes(selected.id)
  const markComplete = () => update((previous) => previous.completedGrammar.includes(selected.id)
    ? previous
    : { ...previous, completedGrammar: [...previous.completedGrammar, selected.id] })
  return <section className="page"><div className="page-heading"><div><p className="eyebrow">Bài học · HSK 4</p><h1>Ngữ pháp</h1><p className="muted">Hiểu cấu trúc, nhìn ví dụ, rồi tự dùng trong câu.</p></div><span className="coverage">{state.completedGrammar.length}/{grammar.length} bài hoàn thành</span></div>
    <div className="grammar-layout"><aside className="grammar-list">{grammar.map((point) => <button key={point.id} className={selected.id === point.id ? 'selected' : ''} onClick={() => setSelected(point)}><span>{state.completedGrammar.includes(point.id) ? '✓' : '○'}</span><div><b>{point.title}</b><small>{point.category}</small></div></button>)}</aside>
      <article className="lesson"><p className="eyebrow">{selected.category}</p><h2>{selected.title}</h2><h3>{selected.meaning}</h3><section><h4>Cấu trúc</h4><pre>{selected.structure}</pre><p>{selected.explanation}</p></section><section><h4>Ví dụ trong ngữ cảnh</h4>{selected.examples.map((example) => <div className="lesson-example" key={example.chinese}><button onClick={() => speak(example.chinese)}>♪</button><div><p className="chinese-sentence">{example.chinese}</p><p>{example.vietnamese}</p></div></div>)}</section><section className="mistake-box"><h4>Điểm cần lưu ý</h4><p>{selected.mistake}</p>{selected.comparison && <p><b>So sánh:</b> {selected.comparison}</p>}</section><button className={complete ? 'secondary completed' : 'primary'} onClick={markComplete}>{complete ? '✓ Đã hoàn thành' : 'Đánh dấu đã hiểu'}</button></article>
    </div></section>
}

function exerciseOptions(wordIndex: number, answer: string, value: (word: Vocabulary) => string, seed: number) {
  const options = [answer]
  for (let offset = 1; options.length < 4 && offset < hsk4ExerciseWords.length; offset += 1) {
    const candidate = value(hsk4ExerciseWords[(wordIndex + offset * 73 + seed * 29) % hsk4ExerciseWords.length])
    if (!options.includes(candidate)) options.push(candidate)
  }
  const score = (value: string) => [...value].reduce((total, character) => (total * 31 + character.charCodeAt(0) + seed * 17) % 10_007, 0)
  return options.sort((first, second) => score(first) - score(second) || first.localeCompare(second, 'zh-CN'))
}

function exerciseForAttempt(attempt: number): Exercise {
  // Every tenth prompt revisits the curated grammar exercises; the other prompts
  // cover all 600 HSK 4 words in three question forms before the course ends.
  if ((attempt + 1) % grammarExerciseInterval === 0) return exercises[Math.floor(attempt / grammarExerciseInterval) % exercises.length]
  const vocabularyAttempt = attempt - Math.floor((attempt + 1) / grammarExerciseInterval)
  const wordIndex = vocabularyAttempt % hsk4ExerciseWords.length
  const variation = Math.floor(vocabularyAttempt / hsk4ExerciseWords.length) % 3
  const word = hsk4ExerciseWords[wordIndex]
  const explanation = `${word.hanzi} · ${word.pinyin} · ${word.meaning}`

  if (variation === 0) return {
    id: `hsk4-meaning-${word.id}`, type: 'choice', title: 'Từ vựng HSK 4', prompt: `“${word.hanzi}” có nghĩa là gì?`,
    options: exerciseOptions(wordIndex, word.meaning, (candidate) => candidate.meaning, vocabularyAttempt), answer: word.meaning, explanation, tags: ['HSK 4', 'Nghĩa từ'],
  }
  if (variation === 1) return {
    id: `hsk4-pinyin-${word.id}`, type: 'choice', title: 'Pinyin HSK 4', prompt: `Chọn pinyin đúng cho “${word.hanzi}”.`,
    options: exerciseOptions(wordIndex, word.pinyin, (candidate) => candidate.pinyin, vocabularyAttempt), answer: word.pinyin, explanation, tags: ['HSK 4', 'Pinyin'],
  }
  return {
    id: `hsk4-hanzi-${word.id}`, type: 'choice', title: 'Nhận diện Hán tự', prompt: `Chọn Hán tự phù hợp với nghĩa “${word.meaning}”.`,
    options: exerciseOptions(wordIndex, word.hanzi, (candidate) => candidate.hanzi, vocabularyAttempt), answer: word.hanzi, explanation, tags: ['HSK 4', 'Hán tự'],
  }
}

function restoreExerciseCursor(state: LearningState) {
  if (state.exerciseCursor > 0) return Math.min(state.exerciseCursor, hsk4CurriculumLength)
  let cursor = 0
  while (cursor < hsk4CurriculumLength && state.completedExercises.includes(exerciseForAttempt(cursor).id)) cursor += 1
  return cursor
}

type MockExamSection = 'listening' | 'reading' | 'writing'
type MockExamQuestion = {
  id: string; section: MockExamSection; part: number; kind: 'true-false' | 'choice' | 'fill' | 'sentence-order' | 'word-order' | 'write';
  prompt: string; options: string[]; answer: string; explanation: string; audio?: string; statement?: string; pieces?: string[]; input?: boolean
}
const mockExamStructure: Array<{ id: MockExamSection; label: string; count: number }> = [
  { id: 'listening', label: 'Nghe hiểu', count: 45 },
  { id: 'reading', label: 'Đọc hiểu', count: 40 },
  { id: 'writing', label: 'Viết', count: 15 },
]
const mockExamQuestionCount = mockExamStructure.reduce((total, section) => total + section.count, 0)
const hsk4MockExamSets = Array.from({ length: 10 }, (_, index) => ({
  id: `hsk4-mock-${String(index + 1).padStart(2, '0')}`,
  title: `Đề mô phỏng ${String(index + 1).padStart(2, '0')}`,
  seed: 41_001 + index * 9_973,
}))
const sentenceOrderTemplates = [
  ['因为', '天气不好', '，', '所以', '我们', '没有出门'],
  ['虽然', '这件事', '很困难', '，', '但是', '他', '没有放弃'],
  ['如果', '你有时间', '，', '请', '给我', '打电话'],
  ['除了', '小王', '以外', '，', '大家', '都到了'],
  ['我', '已经', '把', '作业', '做完了'],
  ['这本书', '被', '他', '看完了'],
  ['老师', '让', '我们', '认真', '复习'],
  ['他', '一边', '听音乐', '一边', '做饭'],
  ['为了', '通过考试', '，', '她', '每天', '练习'],
  ['我觉得', '这个办法', '比那个', '更合适'],
]
const writingOrderTemplates = [
  ['我', '把', '手机', '放在', '桌子上了'],
  ['他', '已经', '学了', '两年', '汉语'],
  ['我们', '明天', '一起', '去', '图书馆'],
  ['这件事', '让我', '非常', '感动'],
  ['请', '把', '门', '关上'],
  ['她', '比我', '早到', '十分钟'],
  ['你', '最好', '先', '休息一下'],
  ['他们', '正在', '讨论', '这个问题'],
  ['我', '希望', '明年', '能去', '中国'],
  ['经理', '给', '我们', '介绍了', '新同事'],
]

function mockExamQuestions(seed: number): MockExamQuestion[] {
  let number = 0
  return mockExamStructure.flatMap((section) => Array.from({ length: section.count }, (_, sectionIndex) => {
    const wordIndex = (Math.abs(seed) + number * 37 + sectionIndex * 11) % hsk4ExerciseWords.length
    const word = hsk4ExerciseWords[wordIndex]
    const questionId = `${section.id}-${number + 1}`
    number += 1
    const explanation = `${word.hanzi} · ${word.pinyin} · ${word.meaning}`
    if (section.id === 'listening' && sectionIndex < 10) {
      const isTrue = sectionIndex % 2 === 0
      const comparison = hsk4ExerciseWords[(wordIndex + 97) % hsk4ExerciseWords.length]
      return { id: questionId, section: section.id, part: 1, kind: 'true-false', audio: word.example, statement: isTrue ? word.example : comparison.example, prompt: 'Nghe câu và chọn nội dung hiển thị đúng hay sai.', options: ['Đúng', 'Sai'], answer: isTrue ? 'Đúng' : 'Sai', explanation }
    }
    if (section.id === 'listening' && sectionIndex < 25) {
      const dialogue = `女：你最近怎么样？\n男：${word.example}\n女：我明白了。`
      return { id: questionId, section: section.id, part: 2, kind: 'choice', audio: dialogue, prompt: 'Nghe đoạn hội thoại ngắn và chọn câu người nam nói.', options: exerciseOptions(wordIndex, word.example, (candidate) => candidate.example, seed + number), answer: word.example, explanation }
    }
    if (section.id === 'listening') {
      const passage = `小王最近有一个计划。${word.example}。他希望通过努力解决这个问题。`
      return { id: questionId, section: section.id, part: 3, kind: 'choice', audio: passage, prompt: 'Nghe đoạn ngắn và chọn nghĩa của từ trọng tâm trong đoạn.', options: exerciseOptions(wordIndex, word.meaning, (candidate) => candidate.meaning, seed + number), answer: word.meaning, explanation }
    }
    if (section.id === 'reading') {
      if (sectionIndex < 10) {
        const sentence = word.example.includes(word.hanzi) ? word.example.replace(word.hanzi, '____') : `我觉得____很重要。`
        return { id: questionId, section: section.id, part: 1, kind: 'fill', prompt: `Chọn từ thích hợp điền vào chỗ trống: ${sentence}`, options: exerciseOptions(wordIndex, word.hanzi, (candidate) => candidate.hanzi, seed + number), answer: word.hanzi, explanation }
      }
      if (sectionIndex < 20) {
        const pieces = sentenceOrderTemplates[(sectionIndex - 10 + Math.abs(seed)) % sentenceOrderTemplates.length]
        return { id: questionId, section: section.id, part: 2, kind: 'sentence-order', prompt: 'Sắp xếp các vế câu thành câu đúng.', options: [], pieces, answer: pieces.join('|'), explanation: pieces.join('') }
      }
      const passage = `${word.example} ${hsk4ExerciseWords[(wordIndex + 23) % hsk4ExerciseWords.length].example}`
      return { id: questionId, section: section.id, part: 3, kind: 'choice', prompt: `Đọc đoạn văn: ${passage}`, options: exerciseOptions(wordIndex, word.meaning, (candidate) => candidate.meaning, seed + number), answer: word.meaning, explanation: `${explanation}. Đáp án dựa vào ngữ cảnh trong đoạn.` }
    }
    if (sectionIndex < 10) {
      const pieces = writingOrderTemplates[(sectionIndex + Math.abs(seed)) % writingOrderTemplates.length]
      return { id: questionId, section: section.id, part: 1, kind: 'word-order', prompt: 'Sắp xếp từ thành câu hoàn chỉnh.', options: [], pieces, answer: pieces.join('|'), explanation: pieces.join('') }
    }
    return { id: questionId, section: section.id, part: 2, kind: 'write', prompt: `Dựa vào pinyin “${word.pinyin}” và nghĩa “${word.meaning}”, hãy viết Hán tự.`, answer: word.hanzi, options: [], input: true, explanation }
  }))
}

function ExercisePage({ state, update, addActivity }: { state: LearningState; update: (recipe: (state: LearningState) => LearningState) => void; addActivity: (kind: 'cards' | 'exercises', minutes?: number) => void }) {
  const [index, setIndex] = useState(() => restoreExerciseCursor(state)); const [answer, setAnswer] = useState<string | string[]>(''); const [result, setResult] = useState<boolean | null>(null)
  const complete = index >= hsk4CurriculumLength
  const exercise = complete ? exercises[0] : exerciseForAttempt(index)
  const progress = Math.round((Math.min(index, hsk4CurriculumLength) / hsk4CurriculumLength) * 100)
  const check = () => {
    const correct = Array.isArray(exercise.answer) ? Array.isArray(answer) && answer.join('|') === exercise.answer.join('|') : answer === exercise.answer
    setResult(correct); addActivity('exercises')
    update((previous) => {
      const completed = previous.completedExercises.includes(exercise.id) ? previous.completedExercises : [...previous.completedExercises, exercise.id]
      if (correct) return { ...previous, completedExercises: completed }
      const old = previous.mistakes[exercise.id]
      return { ...previous, completedExercises: completed, mistakes: { ...previous.mistakes, [exercise.id]: { exerciseId: exercise.id, answer: Array.isArray(answer) ? answer.join(' ') : answer || 'Chưa trả lời', occurredAt: Date.now(), count: (old?.count ?? 0) + 1, prompt: exercise.prompt, tags: exercise.tags, correctAnswer: Array.isArray(exercise.answer) ? exercise.answer.join(' ') : exercise.answer, explanation: exercise.explanation } } }
    })
  }
  const next = () => {
    const nextIndex = Math.min(index + 1, hsk4CurriculumLength)
    setIndex(nextIndex); setAnswer(''); setResult(null)
    update((previous) => ({ ...previous, exerciseCursor: nextIndex }))
  }
  const order = Array.isArray(answer) ? answer : []
  const remaining = exercise.type === 'order' ? (exercise.options ?? []).filter((word, i) => !order.some((picked, position) => picked === word && order.indexOf(picked) === position && position <= i)) : []
  if (complete) return <section className="page exercise-page"><div className="session-summary"><div className="celebration">✓</div><p className="eyebrow">Hoàn thành lộ trình HSK 4</p><h1>Bạn đã đi hết 2.000 lượt</h1><p>Bạn có thể mở <b>Sổ tay lỗi sai</b> để ôn các câu cần cải thiện, hoặc làm lại toàn bộ lộ trình theo nhịp mới.</p><div className="summary-grid"><Stat label="Lượt đã làm" value={hsk4CurriculumLength} /><Stat label="Câu riêng biệt" value={state.completedExercises.length} /><Stat label="Câu cần ôn" value={Object.keys(state.mistakes).length} /></div><button className="primary" onClick={() => { setIndex(0); update((previous) => ({ ...previous, exerciseCursor: 0 })) }}>Làm lại lộ trình <span>→</span></button></div></section>
  return <section className="page exercise-page"><div className="page-heading"><div><p className="eyebrow">Lộ trình HSK 4 · Câu {index + 1}/{hsk4CurriculumLength}</p><h1>Bài tập HSK 4</h1><p className="muted">Tiến độ được lưu theo tài khoản. Cứ 9 câu từ vựng sẽ có 1 câu ngữ pháp để đổi nhịp.</p></div><span className="coverage">{state.completedExercises.length} câu riêng biệt đã làm</span></div>
    <div className="exercise-shell"><div className="exercise-progress"><i style={{ width: `${progress}%` }} /></div><p className="exercise-type">{exercise.type === 'order' ? 'Sắp xếp câu' : exercise.type === 'fill' ? 'Điền vào chỗ trống' : 'Chọn đáp án'}</p><h2>{exercise.title}</h2><p className="exercise-prompt">{exercise.prompt}</p>
      {exercise.type === 'order' ? <div className="order-area"><div className="answer-line">{order.length ? order.map((word, wordIndex) => <button key={`${word}-${wordIndex}`} onClick={() => result === null && setAnswer(order.filter((_, i) => i !== wordIndex))}>{word}</button>) : <span>Chạm vào từ để xếp câu</span>}</div><div className="word-bank">{remaining.map((word, wordIndex) => <button key={`${word}-${wordIndex}`} disabled={result !== null} onClick={() => setAnswer([...order, word])}>{word}</button>)}</div><button className="text-button" onClick={() => { setAnswer([]); setResult(null) }}>Đặt lại</button></div> : <div className="answer-options">{exercise.options?.map((option) => <button key={option} disabled={result !== null} className={answer === option ? 'chosen' : ''} onClick={() => setAnswer(option)}>{option}</button>)}</div>}
      {result !== null && <div className={`feedback ${result ? 'correct' : 'incorrect'}`}><b>{result ? '✓ Chính xác' : '× Chưa đúng'}</b><p>{exercise.explanation}</p>{!result && <p><strong>Đáp án:</strong> {Array.isArray(exercise.answer) ? exercise.answer.join(' ') : exercise.answer}</p>}</div>}
      <div className="exercise-actions">{result === null ? <button className="primary" disabled={Array.isArray(answer) ? !answer.length : !answer} onClick={check}>Kiểm tra</button> : <button className="primary" onClick={next}>Câu tiếp theo <span>→</span></button>}</div>
    </div>
    <SentenceBuilder />
  </section>
}

function MockExamPage({ state, update, addActivity }: { state: LearningState; update: (recipe: (state: LearningState) => LearningState) => void; addActivity: (kind: 'cards' | 'exercises', minutes?: number) => void }) {
  const session = state.mockExam
  const latestResult = state.mockExamHistory[0]
  const startExam = (title = 'Đề mô phỏng ngẫu nhiên', seed = Date.now()) => {
    const now = Date.now()
    update((previous) => ({ ...previous, mockExam: { seed, title, currentQuestion: 0, answers: {}, startedAt: now } }))
  }

  if (!session) return <section className="page exam-page"><div className="page-heading"><div><p className="eyebrow">Đề mô phỏng · HSK 4</p><h1>Luyện thi HSK 4</h1><p className="muted">Chọn một trong 10 đề cố định để theo dõi điểm số, hoặc tạo đề ngẫu nhiên từ danh mục HSK 4.</p></div><span className="coverage">100 câu · 105 phút</span></div><section className="exam-intro"><div className="exam-section-list">{mockExamStructure.map((section) => <div key={section.id}><b>{section.count}</b><span>{section.label}</span></div>)}</div><p>Đề mô phỏng có nội dung nguyên bản, theo cấu trúc đề HSK 4 công khai. Một đề đang làm được lưu theo tài khoản để bạn có thể quay lại tiếp tục.</p><div className="exam-set-grid">{hsk4MockExamSets.map((set) => <button key={set.id} className="secondary" onClick={() => startExam(set.title, set.seed)}><b>{set.title}</b><small>45 nghe · 40 đọc · 15 viết</small></button>)}</div><button className="text-button" onClick={() => startExam()}>Tạo đề ngẫu nhiên <span>→</span></button><p className="exam-source-note">Tham khảo cấu trúc từ <a href="https://download.chinesetest.cn/newhsk-site/model/HSK4_yj.pdf" target="_blank" rel="noreferrer">đề mẫu HSK 4 của Chinese Test</a> và <a href="https://admin.chinesetest.cn/godownload.do" target="_blank" rel="noreferrer">trang tải tài liệu chính thức</a>.</p></section>{latestResult && <section className="chart-card exam-result-card"><p className="eyebrow">Đề gần nhất · {latestResult.title || 'Đề mô phỏng'}</p><h2>{latestResult.score}/{latestResult.total} câu đúng</h2><p className="muted">Hoàn thành {new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(latestResult.completedAt))} · {Math.max(1, Math.round(latestResult.durationSeconds / 60))} phút</p></section>}</section>

  const questions = mockExamQuestions(session.seed)
  const position = Math.min(session.currentQuestion, questions.length - 1)
  const question = questions[position]
  const section = mockExamStructure.find((item) => item.id === question.section)!
  const answered = Object.keys(session.answers).length
  const setAnswer = (answer: string) => update((previous) => previous.mockExam ? ({ ...previous, mockExam: { ...previous.mockExam, answers: { ...previous.mockExam.answers, [question.id]: answer } } }) : previous)
  const orderedAnswer = session.answers[question.id]?.split('|').filter(Boolean) ?? []
  const remainingPieces = (() => {
    const used = new Map<string, number>()
    orderedAnswer.forEach((piece) => used.set(piece, (used.get(piece) ?? 0) + 1))
    return (question.pieces ?? []).filter((piece) => {
      const count = used.get(piece) ?? 0
      if (count > 0) { used.set(piece, count - 1); return false }
      return true
    })
  })()
  const questionTitle = question.kind === 'true-false' ? 'Nghe và xác định đúng/sai'
    : question.kind === 'sentence-order' || question.kind === 'word-order' ? 'Sắp xếp thành câu đúng'
      : question.kind === 'write' ? 'Viết Hán tự' : question.section === 'listening' ? 'Nghe và chọn đáp án' : 'Đọc và chọn đáp án'
  const move = (nextPosition: number) => update((previous) => previous.mockExam ? ({ ...previous, mockExam: { ...previous.mockExam, currentQuestion: Math.min(Math.max(nextPosition, 0), mockExamQuestionCount - 1) } }) : previous)
  const submit = () => {
    const score = questions.filter((item) => session.answers[item.id]?.trim() === item.answer).length
    const finishedAt = Date.now()
    addActivity('exercises', Math.max(1, Math.round((finishedAt - session.startedAt) / 60_000)))
    update((previous) => ({ ...previous, mockExam: null, mockExamHistory: [{ id: session.seed, title: session.title || 'Đề mô phỏng', completedAt: finishedAt, score, total: questions.length, durationSeconds: Math.round((finishedAt - session.startedAt) / 1000) }, ...previous.mockExamHistory].slice(0, 12) }))
  }

  return <section className="page exercise-page exam-page"><div className="page-heading"><div><p className="eyebrow">{session.title || 'Đề mô phỏng'} · {section.label}</p><h1>Đề mô phỏng đang làm</h1><p className="muted">Câu {position + 1}/{questions.length} · đã trả lời {answered}/{questions.length}. Tiến độ được lưu tự động.</p></div><button className="secondary" onClick={submit}>Nộp đề</button></div><div className="exam-progress"><i style={{ width: `${((position + 1) / questions.length) * 100}%` }} /></div><div className="exam-question-nav" aria-label="Đi tới câu hỏi">{questions.map((item, itemIndex) => <button key={item.id} className={`${itemIndex === position ? 'current' : ''} ${session.answers[item.id] ? 'answered' : ''}`} onClick={() => move(itemIndex)}>{itemIndex + 1}</button>)}</div><section className="exercise-shell"><p className="exercise-type">{section.label} · Phần {question.part} · Câu {position + 1}</p><h2>{questionTitle}</h2><p className="exercise-prompt">{question.prompt}</p>{question.audio && <button className="secondary exam-audio" onClick={() => speak(question.audio!)}>♪ Phát âm thanh</button>}{question.statement && <p className="exam-statement">Nội dung hiển thị: {question.statement}</p>}{question.pieces ? <div className="order-area"><div className="answer-line">{orderedAnswer.length ? orderedAnswer.map((piece, pieceIndex) => <button key={`${piece}-${pieceIndex}`} onClick={() => setAnswer(orderedAnswer.filter((_, index) => index !== pieceIndex).join('|'))}>{piece}</button>) : <span>Chạm vào các khối từ để sắp xếp câu</span>}</div><div className="word-bank">{remainingPieces.map((piece, pieceIndex) => <button key={`${piece}-${pieceIndex}`} onClick={() => setAnswer([...orderedAnswer, piece].join('|'))}>{piece}</button>)}</div><button className="text-button" onClick={() => setAnswer('')}>Đặt lại</button></div> : question.input ? <input className="exam-writing-input" value={session.answers[question.id] ?? ''} onChange={(event) => setAnswer(event.currentTarget.value)} placeholder="Nhập Hán tự" autoComplete="off" lang="zh-CN" /> : <div className="answer-options">{question.options.map((option) => <button key={option} className={session.answers[question.id] === option ? 'chosen' : ''} onClick={() => setAnswer(option)}>{option}</button>)}</div>}{session.answers[question.id] && <div className="feedback correct"><b>Đã lưu đáp án</b><p>Bạn vẫn có thể đổi đáp án trước khi nộp đề.</p></div>}<div className="exam-actions"><button className="secondary" disabled={position === 0} onClick={() => move(position - 1)}>← Câu trước</button>{position + 1 < questions.length ? <button className="primary" onClick={() => move(position + 1)}>Câu tiếp theo <span>→</span></button> : <button className="primary" onClick={submit}>Nộp đề <span>→</span></button>}</div></section></section>
}

function SentenceBuilder() {
  const pieces = ['虽然', '今天', '下雨', '但是', '我', '还是', '去', '上学']; const correct = pieces.join('|')
  const [built, setBuilt] = useState<string[]>([]); const [message, setMessage] = useState('')
  const unused = pieces.filter((piece) => !built.includes(piece))
  return <section className="sentence-builder"><div><p className="eyebrow">Học qua cấu trúc</p><h2>Tạo câu</h2><p className="muted">“Mặc dù hôm nay trời mưa, nhưng tôi vẫn đi học.”</p></div><div className="builder-answer">{built.length ? built.map((piece) => <button key={piece} onClick={() => setBuilt(built.filter((item) => item !== piece))}>{piece}</button>) : <span>Chạm vào các khối từ bên dưới</span>}</div><div className="word-bank">{unused.map((piece) => <button key={piece} onClick={() => setBuilt([...built, piece])}>{piece}</button>)}</div><div className="builder-actions"><button className="secondary" onClick={() => { setBuilt([]); setMessage('') }}>Đặt lại</button><button className="primary" onClick={() => setMessage(built.join('|') === correct ? '✓ Chính xác! 虽然…但是… diễn tả sự tương phản.' : 'Hãy thử xem lại vị trí của 虽然 và 但是 nhé.')}>Kiểm tra</button></div>{message && <p className="builder-message">{message}</p>}</section>
}

function ReviewPage({ words, deckLevel, setDeckLevel, rate, difficult, toggleDifficult, speechRate, label, clearCustomQueue }: { words: Vocabulary[]; deckLevel: DeckLevel; setDeckLevel: (level: DeckLevel) => void; rate: (id: string, rating: Rating) => void; difficult: string[]; toggleDifficult: (id: string) => void; speechRate: number; label?: string; clearCustomQueue: () => void }) {
  const [sessionWords, setSessionWords] = useState(words)
  const [index, setIndex] = useState(0); const [flipped, setFlipped] = useState(false); const [finished, setFinished] = useState(false)
  const [ratings, setRatings] = useState<Record<Rating, number>>({ again: 0, hard: 0, good: 0, easy: 0 })
  const word = sessionWords[index] ?? vocabulary[0]
  useEffect(() => {
    const keydown = (event: globalThis.KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement) return
      if (event.code === 'Space') { event.preventDefault(); setFlipped((value) => !value) }
      if (flipped && ['1', '2', '3', '4'].includes(event.key)) { const ratings: Rating[] = ['again', 'hard', 'good', 'easy']; answer(ratings[Number(event.key) - 1]) }
    }
    window.addEventListener('keydown', keydown); return () => window.removeEventListener('keydown', keydown)
  })
  const answer = (rating: Rating) => { rate(word.id, rating); setRatings((previous) => ({ ...previous, [rating]: previous[rating] + 1 })); if (index + 1 >= sessionWords.length) setFinished(true); else { setIndex(index + 1); setFlipped(false) } }
  const deckPicker = <div className="deck-picker" aria-label="Chọn bộ flashcard">
    {deckOptions.map((deck) => <button key={deck.level} className={deckLevel === deck.level ? 'selected' : ''} onClick={() => setDeckLevel(deck.level)}>{deck.label}</button>)}
  </div>
  if (finished) return <section className="page review-page"><div className="session-summary"><div className="celebration">✓</div><p className="eyebrow">Phiên học đã xong</p><h1>Làm tốt lắm!</h1><p>Bạn vừa xử lý {sessionWords.length} thẻ. Lịch ôn tiếp theo đã được lưu trong tiến độ của bạn.</p><div className="summary-grid"><Stat label="Thẻ đã ôn" value={sessionWords.length} /><Stat label="Cần xem lại" value={ratings.again + ratings.hard} /><Stat label="Nhớ tốt" value={ratings.good + ratings.easy} /></div><button className="primary" onClick={() => { setSessionWords(words); setIndex(0); setFinished(false); setFlipped(false); setRatings({ again: 0, hard: 0, good: 0, easy: 0 }) }}>Học thêm</button>{label && <button className="text-button" onClick={clearCustomQueue}>Quay lại nhịp ôn hằng ngày</button>}</div></section>
  return <section className="page review-page"><div className="review-heading"><div><p className="eyebrow">{label ? `Sổ từ · ${label}` : `Flashcards · HSK ${deckLevel}`}</p><h1>Ôn tập tập trung</h1><p className="muted">{label ? `${sessionWords.length} từ trong sổ này.` : `Hôm nay có ${sessionWords.length} thẻ trong phiên này.`}</p></div><span>{index + 1} / {sessionWords.length}</span></div>{label ? <button className="text-button review-exit" onClick={clearCustomQueue}>← Về phiên ôn hằng ngày</button> : deckPicker}<div className="review-progress"><i style={{ width: `${((index + 1) / sessionWords.length) * 100}%` }} /></div><div className={`flashcard ${flipped ? 'flipped' : ''}`} onClick={() => setFlipped(!flipped)} role="button" tabIndex={0} onKeyDown={(event: KeyboardEvent) => event.key === 'Enter' && setFlipped(!flipped)}><div className="card-face card-front"><button className="card-audio" onClick={(event) => { event.stopPropagation(); speak(word.hanzi, speechRate) }}>♪</button><p className="hanzi-card">{word.hanzi}</p><p>{flipped ? '' : 'Chạm hoặc nhấn Space để xem nghĩa'}</p><button className="difficulty-toggle" onClick={(event) => { event.stopPropagation(); toggleDifficult(word.id) }}>{difficult.includes(word.id) ? '⚑ Từ khó' : '⚐ Đánh dấu khó'}</button></div><div className="card-face card-back"><p className="pinyin">{word.pinyin}</p><span className="pos-pill">{word.partOfSpeech}</span><h2>{word.meaning}</h2><hr /><p className="chinese-sentence">{word.example}</p><button className="card-sentence-audio" onClick={(event) => { event.stopPropagation(); speak(word.example, speechRate) }}>♪ Nghe câu</button>{word.translation && <p>{word.translation}</p>}<p className="card-source">HSK 2.0 · HSK {word.introducedAtLevel} · Mục #{word.sourceIndex}</p></div></div>{flipped ? <div className="rating-row"><RatingButton value="again" shortcut="1" label="Quên rồi" time="10 phút" onClick={() => answer('again')} /><RatingButton value="hard" shortcut="2" label="Khó" time="12 giờ" onClick={() => answer('hard')} /><RatingButton value="good" shortcut="3" label="Nhớ được" time="1 ngày" onClick={() => answer('good')} /><RatingButton value="easy" shortcut="4" label="Rất dễ" time="3 ngày" onClick={() => answer('easy')} /></div> : <p className="keyboard-help">Space để lật thẻ · 1–4 để đánh giá sau khi lật</p>}</section>
}

function RatingButton({ value, shortcut, label, time, onClick }: { value: Rating; shortcut: string; label: string; time: string; onClick: () => void }) { return <button className={`rating ${value}`} onClick={onClick}><kbd>{shortcut}</kbd><strong>{label}</strong><small>{time}</small></button> }

function normalizePinyinAnswer(value: string) {
  return value
    .trim()
    .toLocaleLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/v/g, 'u')
    .replace(/[0-9\s'’\-·]/g, '')
}

function formatTypingTime(milliseconds: number) {
  const seconds = Math.max(0, milliseconds) / 1000
  return seconds < 60 ? `${seconds.toFixed(seconds < 10 ? 1 : 0)} giây` : `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`
}

function shuffleWords(words: Vocabulary[]) {
  const shuffled = [...words]
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const replacement = Math.floor(Math.random() * (index + 1))
    ;[shuffled[index], shuffled[replacement]] = [shuffled[replacement], shuffled[index]]
  }
  return shuffled
}

function TypingPracticePage({ words, deckLevel, update }: { words: Vocabulary[]; deckLevel: DeckLevel; update: (recipe: (state: LearningState) => LearningState) => void }) {
  const [durationSeconds, setDurationSeconds] = useState(60)
  const [stage, setStage] = useState<'ready' | 'running' | 'summary'>('ready')
  const [queue, setQueue] = useState<Vocabulary[]>([])
  const [position, setPosition] = useState(0)
  const [answer, setAnswer] = useState('')
  const [sessionStartedAt, setSessionStartedAt] = useState<number | null>(null)
  const [roundStartedAt, setRoundStartedAt] = useState<number | null>(null)
  const [now, setNow] = useState(Date.now())
  const [feedback, setFeedback] = useState<TypingAttempt | null>(null)
  const [attempts, setAttempts] = useState<TypingAttempt[]>([])
  const word = queue[position] ?? words[0]
  const elapsedSession = sessionStartedAt ? now - sessionStartedAt : 0
  const remaining = Math.max(0, durationSeconds * 1000 - elapsedSession)
  const correctCount = attempts.filter((attempt) => attempt.correct).length
  const averageMs = attempts.length ? Math.round(attempts.reduce((total, attempt) => total + attempt.elapsedMs, 0) / attempts.length) : 0
  const syllablesPerMinute = attempts.length ? Math.round(correctCount / Math.max(1 / 60, attempts.reduce((total, attempt) => total + attempt.elapsedMs, 0) / 60_000)) : 0

  useEffect(() => {
    if (stage !== 'running' || !sessionStartedAt) return
    const timer = window.setInterval(() => setNow(Date.now()), 100)
    return () => window.clearInterval(timer)
  }, [stage, sessionStartedAt])

  useEffect(() => {
    if (stage === 'running' && sessionStartedAt && remaining <= 0) setStage('summary')
  }, [remaining, sessionStartedAt, stage])

  const startSession = () => {
    setQueue(shuffleWords(words)); setPosition(0); setAnswer(''); setFeedback(null); setAttempts([])
    setSessionStartedAt(null); setRoundStartedAt(null); setNow(Date.now()); setStage('running')
  }

  const beginTyping = (value: string) => {
    if (!sessionStartedAt) { const startedAt = Date.now(); setSessionStartedAt(startedAt); setRoundStartedAt(startedAt); setNow(startedAt) }
    setAnswer(value)
  }

  const nextWord = () => {
    const nextPosition = position + 1
    if (nextPosition >= queue.length) { setQueue(shuffleWords(words)); setPosition(0) } else setPosition(nextPosition)
    setAnswer(''); setFeedback(null); setRoundStartedAt(null)
  }

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (feedback) { nextWord(); return }
    if (!answer.trim() || !word) return
    const completedAt = Date.now()
    const attempt: TypingAttempt = {
      wordId: word.id, deckLevel, answer, correct: normalizePinyinAnswer(answer) === normalizePinyinAnswer(word.pinyin),
      elapsedMs: roundStartedAt ? completedAt - roundStartedAt : 0, completedAt,
    }
    setFeedback(attempt)
    setAttempts((previous) => [...previous, attempt])
    update((previous) => ({ ...previous, typingAttempts: [...previous.typingAttempts, attempt].slice(-500) }))
  }

  if (stage === 'ready') return <section className="page typing-page"><div className="page-heading"><div><p className="eyebrow">Tốc độ · Pinyin</p><h1>Luyện gõ Pinyin</h1><p className="muted">Gõ pinyin cho Hán tự hoặc cụm từ. Đồng hồ của từng từ bắt đầu ở ký tự đầu tiên bạn nhập.</p></div><span className="coverage">HSK {deckLevel} · {words.length} từ</span></div><section className="typing-setup"><span className="typing-mark">⌨</span><h2>Chọn thời lượng phiên</h2><p>Bạn có thể gõ có dấu, không dấu hoặc dùng số thanh như <b>ni3 hao3</b>.</p><div className="duration-options">{[60, 180, 600].map((seconds) => <button key={seconds} className={durationSeconds === seconds ? 'selected' : ''} onClick={() => setDurationSeconds(seconds)}>{seconds < 60 ? `${seconds} giây` : `${seconds / 60} phút`}</button>)}</div><button className="primary typing-start" onClick={startSession}>Bắt đầu luyện <span>→</span></button><small>Enter để chấm và chuyển sang từ tiếp theo.</small></section></section>

  if (stage === 'summary') {
    const incorrect = attempts.filter((attempt) => !attempt.correct).slice(-5)
    return <section className="page typing-page"><div className="typing-summary"><div className="celebration">⌨</div><p className="eyebrow">Hoàn thành phiên luyện gõ</p><h1>Nhịp gõ của bạn</h1><div className="summary-grid"><Stat label="Đúng" value={correctCount} /><Stat label="Độ chính xác" value={attempts.length ? `${Math.round((correctCount / attempts.length) * 100)}%` : '—'} /><Stat label="TB mỗi từ" value={attempts.length ? formatTypingTime(averageMs) : '—'} /><Stat label="Từ đúng/phút" value={syllablesPerMinute} /></div>{incorrect.length > 0 && <div className="typing-mistakes"><b>Cần gõ lại</b>{incorrect.map((attempt) => { const typedWord = words.find((item) => item.id === attempt.wordId); return <p key={attempt.completedAt}><span>{typedWord?.hanzi}</span> {typedWord?.pinyin}</p> })}</div>}<button className="primary" onClick={startSession}>Luyện lại <span>→</span></button><button className="text-button" onClick={() => setStage('ready')}>Đổi thời lượng</button></div></section>
  }

  const roundTime = feedback?.elapsedMs ?? (roundStartedAt ? now - roundStartedAt : 0)
  return <section className="page typing-page"><div className="review-heading"><div><p className="eyebrow">Luyện gõ · HSK {deckLevel}</p><h1>Pinyin tốc độ</h1></div><span>{sessionStartedAt ? formatTypingTime(remaining) : 'Bắt đầu khi bạn gõ'}</span></div><div className="typing-session-meta"><span>{attempts.length} lượt · {correctCount} đúng</span><span>Thời gian từ: {roundStartedAt ? formatTypingTime(roundTime) : '—'}</span></div><section className="typing-card"><p className="typing-instruction">Gõ pinyin cho từ này</p><p className="typing-hanzi">{word?.hanzi}</p><form onSubmit={submit}><input autoFocus value={answer} onChange={(event) => beginTyping(event.currentTarget.value)} disabled={!!feedback} placeholder="Ví dụ: ni hao hoặc ni3 hao3" autoComplete="off" autoCapitalize="none" spellCheck={false} /><button className="primary" type="submit" disabled={!answer.trim()}>{feedback ? 'Từ tiếp theo →' : 'Kiểm tra ↵'}</button></form>{feedback && <div className={`typing-feedback ${feedback.correct ? 'correct' : 'incorrect'}`}><b>{feedback.correct ? '✓ Chính xác' : '× Chưa đúng'}</b><p><span>{word?.pinyin}</span> · {word?.meaning}</p><small>{formatTypingTime(feedback.elapsedMs)}</small></div>}<p className="typing-hint">Dấu thanh không bắt buộc; khoảng trắng giữa các âm tiết là tùy chọn.</p></section></section>
}

function AdminActivityPage() {
  const [entries, setEntries] = useState<ActivityEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true); setError('')
    try {
      const response = await fetch('/api/admin/activity?limit=50', { credentials: 'include' })
      const data = await response.json() as { entries?: ActivityEntry[]; error?: string }
      if (!response.ok) throw new Error(data.error || 'Không thể tải lịch sử hoạt động.')
      setEntries(data.entries ?? [])
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không thể tải lịch sử hoạt động.')
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])
  const actionLabel: Record<ActivityEntry['action'], string> = {
    account_registered: 'Tạo tài khoản', login: 'Đăng nhập', logout: 'Đăng xuất', page_view: 'Mở trang học',
  }
  const pageLabels: Record<string, string> = {
    overview: 'Tổng quan', vocabulary: 'Từ vựng', grammar: 'Ngữ pháp', exercises: 'Bài tập', review: 'Ôn tập', typing: 'Luyện gõ', exam: 'Luyện thi', analytics: 'Thống kê', notebook: 'Sổ tay lỗi sai', notebooks: 'Sổ từ của tôi', settings: 'Cài đặt học', admin: 'Quản trị',
  }

  return <section className="page admin-page">
    <div className="page-heading"><div><p className="eyebrow">Quyền quản trị</p><h1>Lịch sử hoạt động</h1><p className="muted">50 hoạt động truy cập gần nhất của các tài khoản khác.</p></div><button className="secondary" onClick={load} disabled={loading}>{loading ? 'Đang tải…' : 'Làm mới'}</button></div>
    {error && <p className="admin-error" role="alert">{error}</p>}
    {!loading && !error && !entries.length && <div className="empty-state large"><span>◌</span><h2>Chưa có hoạt động nào</h2><p>Hoạt động đăng nhập và mở trang học của các tài khoản khác sẽ xuất hiện ở đây.</p></div>}
    {!!entries.length && <div className="activity-table-wrap"><table className="activity-table"><thead><tr><th>Thời gian</th><th>Tài khoản</th><th>Role</th><th>Hoạt động</th><th>Chi tiết</th></tr></thead><tbody>{entries.map((entry) => <tr key={entry.id}><td>{new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(entry.created_at))}</td><td><b>{entry.name || entry.email}</b>{entry.name && <small>{entry.email}</small>}</td><td><span className={`role-pill ${entry.role}`}>{entry.role}</span></td><td>{actionLabel[entry.action]}</td><td>{entry.action === 'page_view' ? pageLabels[entry.metadata.page ?? ''] || entry.metadata.page : '—'}</td></tr>)}</tbody></table></div>}
  </section>
}

function AnalyticsPage({ state, learned, mastered }: { state: LearningState; learned: number; mastered: number }) {
  const days = Array.from({ length: 7 }, (_, index) => { const day = new Date(); day.setDate(day.getDate() - (6 - index)); return day })
  const totalMinutes = Object.values(state.activity).reduce((total, entry) => total + entry.minutes, 0)
  const totalExercises = Object.values(state.activity).reduce((total, entry) => total + entry.exercises, 0)
  const recentDays = Object.values(state.activity).filter((entry) => entry.cards + entry.exercises > 0).length
  return <section className="page"><div className="page-heading"><div><p className="eyebrow">Dữ liệu học của bạn</p><h1>Thống kê</h1><p className="muted">Chỉ tính các hoạt động bạn đã hoàn thành trên thiết bị này.</p></div></div><div className="analytics-stats"><Stat label="Từ đã học" value={learned} /><Stat label="Từ đã ghi nhớ" value={mastered} /><Stat label="Bài tập đã làm" value={totalExercises} /><Stat label="Phút học" value={totalMinutes} /></div><div className="analytics-grid"><section className="chart-card"><div className="section-title"><div><p className="eyebrow">7 ngày gần đây</p><h2>Nhịp độ học</h2></div><span>{recentDays} ngày có hoạt động</span></div><div className="bar-chart">{days.map((day) => { const data = state.activity[todayKey(day)] ?? { cards: 0, exercises: 0, minutes: 0 }; const height = Math.min(100, data.minutes * 18); return <div key={day.toISOString()}><i style={{ height: `${height}%` }} title={`${data.minutes} phút`} /><small>{new Intl.DateTimeFormat('vi-VN', { weekday: 'short' }).format(day).replace('Th ', 'T')}</small></div> })}</div></section><section className="chart-card"><p className="eyebrow">Ôn tập</p><h2>Khả năng duy trì</h2><div className="retention"><strong>{learned ? `${Math.round((mastered / learned) * 100)}%` : '—'}</strong><span>{learned ? 'thẻ đã đạt ít nhất 3 lần ôn' : 'Hãy hoàn thành vài thẻ để xem số liệu.'}</span></div><div className="progress-track"><i style={{ width: learned ? `${(mastered / learned) * 100}%` : '0%' }} /></div></section></div><section className="chart-card heatmap-card"><div><p className="eyebrow">Lịch hoạt động</p><h2>30 ngày gần đây</h2></div><div className="heatmap">{Array.from({ length: 30 }, (_, index) => { const day = new Date(); day.setDate(day.getDate() - (29 - index)); const data = state.activity[todayKey(day)]; const intensity = Math.min(4, Math.ceil(((data?.cards ?? 0) + (data?.exercises ?? 0)) / 2)); return <i key={day.toISOString()} className={`level-${intensity}`} title={`${day.toLocaleDateString('vi-VN')}: ${(data?.cards ?? 0) + (data?.exercises ?? 0)} hoạt động`} /> })}</div></section></section>
}

function PersonalNotebooksPage({ state, update, openWord, startReview }: { state: LearningState; update: (recipe: (state: LearningState) => LearningState) => void; openWord: (wordId: string) => void; startReview: (wordIds: string[], label: string) => void }) {
  const [draft, setDraft] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(state.notebooks[0]?.id ?? null)
  const selected = state.notebooks.find((notebook) => notebook.id === selectedId) ?? null
  useEffect(() => {
    if (selectedId && state.notebooks.some((notebook) => notebook.id === selectedId)) return
    setSelectedId(state.notebooks[0]?.id ?? null)
  }, [selectedId, state.notebooks])
  const createNotebook = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const name = draft.trim().slice(0, 48)
    if (!name) return
    const now = Date.now()
    const id = globalThis.crypto?.randomUUID?.() ?? `notebook-${now}-${Math.random().toString(36).slice(2)}`
    update((previous) => ({ ...previous, notebooks: [...previous.notebooks, { id, name, wordIds: [], createdAt: now, updatedAt: now }] }))
    setSelectedId(id)
    setDraft('')
  }
  const removeNotebook = (id: string) => update((previous) => ({ ...previous, notebooks: previous.notebooks.filter((notebook) => notebook.id !== id) }))
  const removeWord = (notebookId: string, wordId: string) => update((previous) => ({ ...previous, notebooks: previous.notebooks.map((notebook) => notebook.id === notebookId ? { ...notebook, wordIds: notebook.wordIds.filter((id) => id !== wordId), updatedAt: Date.now() } : notebook) }))
  const selectedWords = selected ? vocabulary.filter((word) => selected.wordIds.includes(word.id)) : []
  return <section className="page notebook-page"><div className="page-heading"><div><p className="eyebrow">Sổ từ cá nhân</p><h1>Gom từ theo đúng mục tiêu của bạn.</h1><p className="muted">Tạo sổ theo buổi học, chủ đề hay nhóm từ thường nhầm; mỗi sổ có thể mở thẳng một phiên ôn riêng.</p></div></div><form className="notebook-create" onSubmit={createNotebook}><label>Tên sổ từ<input value={draft} onChange={(event) => setDraft(event.currentTarget.value)} placeholder="Ví dụ: Từ hay nhầm tuần này" maxLength={48} /></label><button className="primary" disabled={!draft.trim()}>Tạo sổ <span>→</span></button></form><div className="smart-collections"><button onClick={() => startReview(state.favorites, 'Từ yêu thích')} disabled={!state.favorites.length}><b>♥</b><span>Từ yêu thích</span><small>{state.favorites.length} từ</small></button><button onClick={() => startReview(state.difficult, 'Từ khó')} disabled={!state.difficult.length}><b>⚑</b><span>Từ khó</span><small>{state.difficult.length} từ</small></button></div>{state.notebooks.length ? <div className="notebooks-layout"><nav className="notebook-list" aria-label="Danh sách sổ từ">{state.notebooks.map((notebook) => <button key={notebook.id} className={notebook.id === selected?.id ? 'selected' : ''} onClick={() => setSelectedId(notebook.id)}><span>▣</span><div><b>{notebook.name}</b><small>{notebook.wordIds.length} từ</small></div></button>)}</nav>{selected && <section className="notebook-detail"><div className="notebook-detail-heading"><div><p className="eyebrow">Sổ đang mở</p><h2>{selected.name}</h2><p>{selectedWords.length ? `${selectedWords.length} từ sẵn sàng để ôn theo một phiên riêng.` : 'Lưu từ từ Thư viện để bắt đầu sổ này.'}</p></div><div><button className="primary" onClick={() => startReview(selected.wordIds, selected.name)} disabled={!selectedWords.length}>Ôn sổ này <span>→</span></button><button className="text-button danger-text" onClick={() => removeNotebook(selected.id)}>Xoá sổ</button></div></div>{selectedWords.length ? <div className="notebook-word-grid">{selectedWords.map((word) => <article key={word.id}><button className="notebook-word" onClick={() => openWord(word.id)}><span lang="zh-CN">{word.hanzi}</span><div><b>{word.meaning}</b><small>{word.pinyin}</small></div></button><button className="notebook-remove" onClick={() => removeWord(selected.id, word.id)} aria-label={`Bỏ ${word.hanzi} khỏi sổ`}>×</button></article>)}</div> : <div className="empty-state"><span>▣</span><p>Quay lại Thư viện, chọn một từ rồi thêm vào sổ này.</p></div>}</section>}</div> : <section className="empty-state large"><span>▣</span><h2>Tạo sổ đầu tiên cho nhịp học của bạn.</h2><p>Sổ từ không thay thế danh sách yêu thích hoặc từ khó; nó giúp bạn gom các từ theo mục tiêu cụ thể.</p></section>}</section>
}

function SettingsPage({ state, update }: { state: LearningState; update: (recipe: (state: LearningState) => LearningState) => void }) {
  const preferences = state.preferences
  const setPreferences = (change: Partial<LearningPreferences>) => update((previous) => ({ ...previous, preferences: { ...previous.preferences, ...change } }))
  return <section className="page settings-page"><div className="page-heading"><div><p className="eyebrow">Không gian học</p><h1>Điều chỉnh để học lâu hơn, không mệt hơn.</h1><p className="muted">Mọi thiết lập dưới đây lưu cùng tiến độ V1 của tài khoản này.</p></div></div><div className="settings-grid"><section className="settings-card"><div><p className="eyebrow">Phát âm</p><h2>Nghe theo cách bạn muốn</h2></div><label className="switch-row"><span>Tự phát âm khi mở từ</span><input type="checkbox" checked={preferences.autoPronounce} onChange={(event) => setPreferences({ autoPronounce: event.currentTarget.checked })} /></label><label>Tốc độ đọc<select value={preferences.speechRate} onChange={(event) => setPreferences({ speechRate: Number(event.currentTarget.value) })}><option value={0.7}>Chậm · 0.7×</option><option value={0.82}>Vừa · 0.82×</option><option value={1}>Tự nhiên · 1×</option></select></label><p className="settings-note">Dùng giọng có sẵn của trình duyệt; không giả lập giọng bản ngữ khi thiết bị không cung cấp.</p></section><section className="settings-card"><div><p className="eyebrow">Hiển thị</p><h2>Tập trung vào điều bạn cần nhớ</h2></div><label className="switch-row"><span>Hiện pinyin trong gợi ý từ liên quan</span><input type="checkbox" checked={preferences.showPinyin} onChange={(event) => setPreferences({ showPinyin: event.currentTarget.checked })} /></label><label>Cỡ chữ<select value={preferences.fontScale} onChange={(event) => setPreferences({ fontScale: event.currentTarget.value as LearningPreferences['fontScale'] })}><option value="default">Tiêu chuẩn</option><option value="large">Lớn hơn</option></select></label><p className="settings-note">Chế độ tối vẫn có ở thanh bên để đổi nhanh trong lúc học.</p></section><section className="settings-card"><div><p className="eyebrow">Nhịp học</p><h2>Mục tiêu từ mới mỗi ngày</h2></div><div className="goal-options settings-goals">{[10, 15, 20].map((goal) => <button key={goal} className={state.goal === goal ? 'selected' : ''} onClick={() => update((previous) => ({ ...previous, goal }))}>{goal} từ</button>)}</div><p className="settings-note">Kế hoạch hôm nay dùng mục tiêu này và dữ liệu ôn thực tế, không tạo streak hay thời lượng giả.</p></section><section className="settings-card settings-capability"><div><p className="eyebrow">Capability của trình duyệt</p><h2>Viết và đọc</h2></div><p>Bảng viết tự do luôn hoạt động. Luyện đọc chỉ dùng transcript khi trình duyệt hỗ trợ Speech Recognition và bạn chủ động cấp quyền microphone; hiện không có chấm phát âm tự động.</p></section></div></section>
}

function Notebook({ state, setView }: { state: LearningState; setView: (view: View) => void }) {
  const entries = Object.values(state.mistakes).sort((a, b) => b.count - a.count)
  return <section className="page"><div className="page-heading"><div><p className="eyebrow">Ôn theo điểm yếu</p><h1>Sổ tay lỗi sai</h1><p className="muted">Những câu trả lời chưa đúng được lưu tự động để bạn quay lại đúng lúc.</p></div></div>{entries.length ? <div className="mistake-list">{entries.map((mistake) => { const exercise = exercises.find((item) => item.id === mistake.exerciseId); const prompt = exercise?.prompt ?? mistake.prompt ?? 'Câu hỏi từ vựng HSK 4'; const tags = exercise?.tags ?? mistake.tags ?? ['HSK 4']; const correctAnswer = exercise?.answer ?? mistake.correctAnswer; const explanation = exercise?.explanation ?? mistake.explanation ?? 'Hãy quay lại bài tập để luyện lại từ này trong các lượt tiếp theo.'; return <article key={mistake.exerciseId}><span className="mistake-number">{mistake.count}×</span><div><p className="eyebrow">{tags.join(' · ')}</p><h3>{prompt}</h3><p>Bạn chọn: <b>{mistake.answer}</b></p>{correctAnswer && <p>Đáp án: <b>{Array.isArray(correctAnswer) ? correctAnswer.join(' ') : correctAnswer}</b></p>}<small>{explanation}</small></div><button className="secondary" onClick={() => setView('exercises')}>Làm lại</button></article>})}</div> : <div className="empty-state large"><span>✓</span><h2>Chưa có lỗi nào cần xem lại</h2><p>Sau khi làm bài, các câu sai sẽ xuất hiện ở đây cùng lời giải thích.</p><button className="primary" onClick={() => setView('exercises')}>Làm bài tập</button></div>}</section>
}

function Onboarding({ state, update }: { state: LearningState; update: (recipe: (state: LearningState) => LearningState) => void }) { const [goal, setGoal] = useState(state.goal); return <div className="modal-layer"><section className="onboarding"><span className="onboarding-mark">汉</span><p className="eyebrow">Chào mừng đến với HANZI</p><h1>Học tiếng Trung, có nhịp điệu.</h1><p>Chúng ta bắt đầu với một kế hoạch nhỏ, vừa sức cho mỗi ngày.</p><label>Trình độ hiện tại<select value="HSK 4" disabled><option>HSK 4 — Có nội dung</option></select></label><fieldset><legend>Mục tiêu từ mới mỗi ngày</legend><div className="goal-options">{[10, 15, 20].map((number) => <button className={goal === number ? 'selected' : ''} onClick={() => setGoal(number)} key={number}>{number} từ</button>)}</div></fieldset><button className="primary wide" onClick={() => update((previous) => ({ ...previous, goal, onboarded: true }))}>Bắt đầu học <span>→</span></button><small>Bạn luôn có thể thay đổi nhịp học sau này.</small></section></div> }

function SearchDialog({ value, setValue, close, setView, recentLookups, openWord }: { value: string; setValue: (value: string) => void; close: () => void; setView: (view: View) => void; recentLookups: string[]; openWord: (wordId: string) => void }) {
  const matching = vocabulary.filter((word) => normalized(`${word.hanzi} ${word.pinyin} ${word.meaning} ${word.topic}`).includes(normalized(value))).slice(0, 7)
  const recentWords = recentLookups.map((id) => vocabulary.find((word) => word.id === id)).filter((word): word is Vocabulary => Boolean(word))
  const selectWord = (wordId: string) => { openWord(wordId); close() }
  return <div className="modal-layer search-layer" onMouseDown={close}><section className="search-dialog" onMouseDown={(event) => event.stopPropagation()}><div className="field-with-icon"><span>⌕</span><input autoFocus value={value} onChange={(event) => setValue(event.currentTarget.value)} onKeyDown={(event) => event.key === 'Escape' && close()} placeholder="Tìm Hán tự, pinyin, nghĩa hoặc chủ đề…" /><kbd>Esc</kbd></div>{value ? <div className="search-results">{matching.length ? matching.map((word) => <button key={word.id} onClick={() => selectWord(word.id)}><span className="hanzi-small">{word.hanzi}</span><span><b>{word.meaning}</b><small>{word.pinyin} · {word.topic}</small></span></button>) : <p>Không tìm thấy kết quả trong danh mục HSK hiện có.</p>}</div> : <div className="search-hint"><p>Tìm nhanh từ vựng theo Hán tự, pinyin, nghĩa Việt hoặc chủ đề.</p>{recentWords.length ? <><p className="recent-search-title">Tra gần đây</p>{recentWords.map((word) => <button key={word.id} onClick={() => selectWord(word.id)}><span className="hanzi-small">{word.hanzi}</span><span><b>{word.meaning}</b><small>{word.pinyin}</small></span></button>)}</> : <><button onClick={() => { setView('grammar'); close() }}>⌘ Xem ngữ pháp</button><button onClick={() => { setView('review'); close() }}>↻ Mở ôn tập</button></>}</div>}</section></div>
}

function MobileNavigation({ view, setView, user }: { view: View; setView: (view: View) => void; user: AuthUser }) {
  const [moreOpen, setMoreOpen] = useState(false)
  const primaryIds: View[] = ['overview', 'vocabulary', 'review', 'typing']
  const primary = nav.filter((item) => primaryIds.includes(item.id))
  const secondary = [...nav.filter((item) => !primaryIds.includes(item.id)), personalNav, settingsNav, ...(user.role === 'admin' ? [adminNav] : [])]
  const choose = (nextView: View) => { setView(nextView); setMoreOpen(false) }
  const secondaryActive = secondary.some((item) => item.id === view)
  return <>{moreOpen && <div className="mobile-more-layer" onClick={() => setMoreOpen(false)}><section className="mobile-more-sheet" onClick={(event) => event.stopPropagation()}><div><p className="eyebrow">Tất cả khu vực</p><h2>Chọn nơi bạn muốn học</h2></div><div className="mobile-more-grid">{secondary.map((item) => <button key={item.id} className={view === item.id ? 'active' : ''} onClick={() => choose(item.id)}><i>{item.icon}</i><span>{item.label}</span></button>)}<button className={view === 'notebook' ? 'active' : ''} onClick={() => choose('notebook')}><i>▣</i><span>Sổ tay lỗi sai</span></button></div><button className="secondary wide" onClick={() => setMoreOpen(false)}>Đóng</button></section></div>}<nav className="mobile-nav" aria-label="Điều hướng di động">{primary.map((item) => <button key={item.id} className={view === item.id ? 'active' : ''} onClick={() => choose(item.id)}><i>{item.icon}</i><span>{item.label}</span></button>)}<button className={secondaryActive || view === 'notebook' ? 'active' : ''} onClick={() => setMoreOpen(true)}><i>•••</i><span>Thêm</span></button></nav></>
}
