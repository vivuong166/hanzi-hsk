import { CSSProperties, FormEvent, KeyboardEvent, useEffect, useState } from 'react'
import { exercises, grammar, Vocabulary, vocabulary } from './data'

type View = 'overview' | 'vocabulary' | 'grammar' | 'exercises' | 'review' | 'typing' | 'analytics' | 'notebook'
type Rating = 'again' | 'hard' | 'good' | 'easy'
type DeckLevel = 1 | 2 | 3 | 4
type Review = { dueAt: number; intervalHours: number; repetitions: number; lapses: number; lastRating: Rating; lastReviewedAt: number }
type Mistake = { exerciseId: string; answer: string; occurredAt: number; count: number }
type TypingAttempt = { wordId: string; deckLevel: DeckLevel; answer: string; correct: boolean; elapsedMs: number; completedAt: number }
type Activity = Record<string, { cards: number; exercises: number; minutes: number }>
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
  typingAttempts: TypingAttempt[]
}
type AuthUser = { id: number; email: string; name: string | null }

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
const defaultState: LearningState = {
  level: 'HSK 4', deckLevel: 4, theme: 'light', goal: 15, onboarded: false, reviews: {}, favorites: [], difficult: [],
  mistakes: {}, activity: {}, completedGrammar: [], completedExercises: [], typingAttempts: [],
}

function accountStorageKey(userId: number) {
  return `${storageKey}.user-${userId}`
}

function readState(userId: number): LearningState | null {
  try {
    const saved = localStorage.getItem(accountStorageKey(userId))
    return saved ? { ...defaultState, ...JSON.parse(saved) } : null
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

function speak(text: string) {
  if (!('speechSynthesis' in window)) return
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'zh-CN'
  utterance.rate = 0.82
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
  { id: 'analytics', label: 'Thống kê', icon: '▥' },
]

export default function App() {
  const [state, setState] = useState<LearningState>(defaultState)
  const [view, setView] = useState<View>('overview')
  const [commandOpen, setCommandOpen] = useState(false)
  const [command, setCommand] = useState('')
  const [user, setUser] = useState<AuthUser | null>(null)
  const [checkingSession, setCheckingSession] = useState(true)

  const hydrateAccount = async (account: AuthUser) => {
    let accountState = readState(account.id) ?? defaultState
    try {
      const saved = await fetch('/api/learning-state', { credentials: 'include' })
      if (saved.ok) {
        const savedData = await saved.json() as { state: Partial<LearningState> | null }
        if (savedData.state) accountState = { ...defaultState, ...savedData.state }
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
  const reviewWords = due.length ? due : initialCards.length ? initialCards : deckWords.slice(0, state.goal)

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
    <div className={`app ${state.theme === 'dark' ? 'dark' : ''}`}>
      <Sidebar state={state} view={view} setView={setView} setTheme={setTheme} openSearch={() => setCommandOpen(true)} />
      <main className="main">
        <Topbar due={due.length} openSearch={() => setCommandOpen(true)} user={user} deckLevel={state.deckLevel} setDeckLevel={setDeckLevel} logout={logout} />
        {view === 'overview' && <Overview reviewed={deckWords.filter((word) => state.reviews[word.id]).length} mastered={deckWords.filter((word) => state.reviews[word.id]?.repetitions >= 3).length} due={due.length} activity={activity} state={state} deckLevel={state.deckLevel} deckTotal={deckWords.length} setView={setView} />}
        {view === 'vocabulary' && <VocabularyPage {...shared} />}
        {view === 'grammar' && <GrammarPage state={state} update={update} />}
        {view === 'exercises' && <ExercisePage state={state} update={update} addActivity={addActivity} />}
        {view === 'review' && <ReviewPage key={state.deckLevel} words={reviewWords} deckLevel={state.deckLevel} setDeckLevel={setDeckLevel} rate={rate} difficult={state.difficult} toggleDifficult={toggleDifficult} />}
        {view === 'typing' && <TypingPracticePage key={state.deckLevel} words={deckWords} deckLevel={state.deckLevel} update={update} />}
        {view === 'analytics' && <AnalyticsPage state={state} learned={reviewedIds.length} mastered={mastered} />}
        {view === 'notebook' && <Notebook state={state} setView={setView} />}
      </main>
      <MobileNavigation view={view} setView={setView} />
      {!state.onboarded && <Onboarding state={state} update={update} />}
      {commandOpen && <SearchDialog value={command} setValue={setCommand} close={() => setCommandOpen(false)} setView={setView} />}
    </div>
  )
}

function Sidebar({ state, view, setView, setTheme, openSearch }: { state: LearningState; view: View; setView: (view: View) => void; setTheme: () => void; openSearch: () => void }) {
  return <aside className="sidebar">
    <button className="brand" onClick={() => setView('overview')} aria-label="Về tổng quan"><span>汉</span> HANZI</button>
    <button className="search-button side-search" onClick={openSearch}><span>⌕</span> Tìm kiếm <kbd>Ctrl K</kbd></button>
    <nav aria-label="Điều hướng chính">{nav.map((item) => <button key={item.id} className={`nav-item ${view === item.id ? 'active' : ''}`} onClick={() => setView(item.id)}><i>{item.icon}</i>{item.label}</button>)}</nav>
    <div className="sidebar-footer">
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
      const data = await response.json() as { user?: AuthUser; error?: string }
      if (!response.ok || !data.user) throw new Error(data.error || 'Không thể tiếp tục. Vui lòng thử lại.')
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

function VocabularyPage({ state, toggleFavorite, toggleDifficult }: Pick<{ state: LearningState; toggleFavorite: (id: string) => void; toggleDifficult: (id: string) => void }, 'state' | 'toggleFavorite' | 'toggleDifficult'>) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('Tất cả')
  const [selected, setSelected] = useState<Vocabulary>(vocabulary[0])
  const curatedCount = vocabulary.filter((word) => word.contentStatus === 'curated').length
  const matches = vocabulary.filter((word) => {
    const haystack = normalized(`${word.hanzi} ${word.pinyin} ${word.meaning} ${word.topic}`)
    const selectedFilter = filter === 'Tất cả' || (filter === 'Từ mới HSK 4' && word.introducedAtLevel === 4) || (filter === 'Đã học' && !!state.reviews[word.id]) || (filter === 'Chưa học' && !state.reviews[word.id]) || (filter === 'Yêu thích' && state.favorites.includes(word.id)) || (filter === 'Khó' && state.difficult.includes(word.id))
    return selectedFilter && haystack.includes(normalized(query))
  })
  return <section className="page">
    <div className="page-heading"><div><p className="eyebrow">Thư viện · HSK 2.0 / 2015</p><h1>Từ vựng HSK 4</h1><p className="muted">Đủ {vocabulary.length} từ tích lũy của HSK 4, có pinyin, nghĩa Việt, từ loại và câu ví dụ. Trong đó, 600 từ cuối được giới thiệu ở riêng cấp HSK 4; {curatedCount} mục có bản dịch ví dụ tiếng Việt do dự án biên soạn.</p></div><span className="coverage">HSK 4 · 1.200 từ</span></div>
    <div className="library-layout"><div className="word-list-panel"><div className="field-with-icon"><span>⌕</span><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm Hán tự, pinyin hoặc nghĩa…" /></div><div className="filter-chips">{['Tất cả', 'Từ mới HSK 4', 'Chưa học', 'Đã học', 'Yêu thích', 'Khó'].map((item) => <button className={filter === item ? 'selected' : ''} onClick={() => setFilter(item)} key={item}>{item}</button>)}</div><p className="results-label">{matches.length} kết quả</p><div className="word-list">{matches.map((word) => <button key={word.id} className={`word-row ${selected.id === word.id ? 'selected' : ''}`} onClick={() => setSelected(word)}><span className="hanzi-small">{word.hanzi}</span><span><b>{word.meaning}</b><small>{word.pinyin} · {word.partOfSpeech}</small></span><em>{state.reviews[word.id] ? 'Đã học' : word.contentStatus === 'curated' ? word.topic : `HSK ${word.introducedAtLevel}`}</em></button>)}{!matches.length && <div className="empty-state">Không tìm thấy từ phù hợp. Hãy thử một cách viết khác.</div>}</div></div>
      <WordDetail word={selected} state={state} toggleFavorite={toggleFavorite} toggleDifficult={toggleDifficult} />
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

function ExercisePage({ state, update, addActivity }: { state: LearningState; update: (recipe: (state: LearningState) => LearningState) => void; addActivity: (kind: 'cards' | 'exercises', minutes?: number) => void }) {
  const [index, setIndex] = useState(0); const [answer, setAnswer] = useState<string | string[]>(''); const [result, setResult] = useState<boolean | null>(null)
  const exercise = exercises[index]
  const check = () => {
    const correct = Array.isArray(exercise.answer) ? Array.isArray(answer) && answer.join('|') === exercise.answer.join('|') : answer === exercise.answer
    setResult(correct); addActivity('exercises')
    update((previous) => {
      const completed = previous.completedExercises.includes(exercise.id) ? previous.completedExercises : [...previous.completedExercises, exercise.id]
      if (correct) return { ...previous, completedExercises: completed }
      const old = previous.mistakes[exercise.id]
      return { ...previous, completedExercises: completed, mistakes: { ...previous.mistakes, [exercise.id]: { exerciseId: exercise.id, answer: Array.isArray(answer) ? answer.join(' ') : answer || 'Chưa trả lời', occurredAt: Date.now(), count: (old?.count ?? 0) + 1 } } }
    })
  }
  const next = () => { setIndex((value) => (value + 1) % exercises.length); setAnswer(''); setResult(null) }
  const order = Array.isArray(answer) ? answer : []
  const remaining = exercise.type === 'order' ? (exercise.options ?? []).filter((word, i) => !order.some((picked, position) => picked === word && order.indexOf(picked) === position && position <= i)) : []
  return <section className="page exercise-page"><div className="page-heading"><div><p className="eyebrow">Luyện tập · {index + 1}/{exercises.length}</p><h1>Bài tập</h1><p className="muted">Nhận phản hồi ngay để sửa đúng chỗ.</p></div><span className="coverage">{state.completedExercises.length} câu đã làm</span></div>
    <div className="exercise-shell"><div className="exercise-progress"><i style={{ width: `${((index + 1) / exercises.length) * 100}%` }} /></div><p className="exercise-type">{exercise.type === 'order' ? 'Sắp xếp câu' : exercise.type === 'fill' ? 'Điền vào chỗ trống' : 'Chọn đáp án'}</p><h2>{exercise.title}</h2><p className="exercise-prompt">{exercise.prompt}</p>
      {exercise.type === 'order' ? <div className="order-area"><div className="answer-line">{order.length ? order.map((word, wordIndex) => <button key={`${word}-${wordIndex}`} onClick={() => result === null && setAnswer(order.filter((_, i) => i !== wordIndex))}>{word}</button>) : <span>Chạm vào từ để xếp câu</span>}</div><div className="word-bank">{remaining.map((word, wordIndex) => <button key={`${word}-${wordIndex}`} disabled={result !== null} onClick={() => setAnswer([...order, word])}>{word}</button>)}</div><button className="text-button" onClick={() => { setAnswer([]); setResult(null) }}>Đặt lại</button></div> : <div className="answer-options">{exercise.options?.map((option) => <button key={option} disabled={result !== null} className={answer === option ? 'chosen' : ''} onClick={() => setAnswer(option)}>{option}</button>)}</div>}
      {result !== null && <div className={`feedback ${result ? 'correct' : 'incorrect'}`}><b>{result ? '✓ Chính xác' : '× Chưa đúng'}</b><p>{exercise.explanation}</p>{!result && <p><strong>Đáp án:</strong> {Array.isArray(exercise.answer) ? exercise.answer.join(' ') : exercise.answer}</p>}</div>}
      <div className="exercise-actions">{result === null ? <button className="primary" disabled={Array.isArray(answer) ? !answer.length : !answer} onClick={check}>Kiểm tra</button> : <button className="primary" onClick={next}>{index === exercises.length - 1 ? 'Làm lại từ đầu' : 'Câu tiếp theo'} <span>→</span></button>}</div>
    </div>
    <SentenceBuilder />
  </section>
}

function SentenceBuilder() {
  const pieces = ['虽然', '今天', '下雨', '但是', '我', '还是', '去', '上学']; const correct = pieces.join('|')
  const [built, setBuilt] = useState<string[]>([]); const [message, setMessage] = useState('')
  const unused = pieces.filter((piece) => !built.includes(piece))
  return <section className="sentence-builder"><div><p className="eyebrow">Học qua cấu trúc</p><h2>Tạo câu</h2><p className="muted">“Mặc dù hôm nay trời mưa, nhưng tôi vẫn đi học.”</p></div><div className="builder-answer">{built.length ? built.map((piece) => <button key={piece} onClick={() => setBuilt(built.filter((item) => item !== piece))}>{piece}</button>) : <span>Chạm vào các khối từ bên dưới</span>}</div><div className="word-bank">{unused.map((piece) => <button key={piece} onClick={() => setBuilt([...built, piece])}>{piece}</button>)}</div><div className="builder-actions"><button className="secondary" onClick={() => { setBuilt([]); setMessage('') }}>Đặt lại</button><button className="primary" onClick={() => setMessage(built.join('|') === correct ? '✓ Chính xác! 虽然…但是… diễn tả sự tương phản.' : 'Hãy thử xem lại vị trí của 虽然 và 但是 nhé.')}>Kiểm tra</button></div>{message && <p className="builder-message">{message}</p>}</section>
}

function ReviewPage({ words, deckLevel, setDeckLevel, rate, difficult, toggleDifficult }: { words: Vocabulary[]; deckLevel: DeckLevel; setDeckLevel: (level: DeckLevel) => void; rate: (id: string, rating: Rating) => void; difficult: string[]; toggleDifficult: (id: string) => void }) {
  const [sessionWords, setSessionWords] = useState(words)
  const [index, setIndex] = useState(0); const [flipped, setFlipped] = useState(false); const [finished, setFinished] = useState(false)
  const word = sessionWords[index] ?? vocabulary[0]
  useEffect(() => {
    const keydown = (event: globalThis.KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement) return
      if (event.code === 'Space') { event.preventDefault(); setFlipped((value) => !value) }
      if (flipped && ['1', '2', '3', '4'].includes(event.key)) { const ratings: Rating[] = ['again', 'hard', 'good', 'easy']; answer(ratings[Number(event.key) - 1]) }
    }
    window.addEventListener('keydown', keydown); return () => window.removeEventListener('keydown', keydown)
  })
  const answer = (rating: Rating) => { rate(word.id, rating); if (index + 1 >= sessionWords.length) setFinished(true); else { setIndex(index + 1); setFlipped(false) } }
  const deckPicker = <div className="deck-picker" aria-label="Chọn bộ flashcard">
    {deckOptions.map((deck) => <button key={deck.level} className={deckLevel === deck.level ? 'selected' : ''} onClick={() => setDeckLevel(deck.level)}>{deck.label}</button>)}
  </div>
  if (finished) return <section className="page review-page"><div className="session-summary"><div className="celebration">✓</div><p className="eyebrow">Phiên học đã xong</p><h1>Làm tốt lắm!</h1><p>Bạn vừa xử lý {sessionWords.length} thẻ. Lịch ôn tiếp theo đã được lưu trên thiết bị này.</p><div className="summary-grid"><Stat label="Thẻ đã ôn" value={sessionWords.length} /><Stat label="Cần luyện thêm" value={0} /><Stat label="Phút tập trung" value={sessionWords.length} /></div><button className="primary" onClick={() => { setSessionWords(words); setIndex(0); setFinished(false); setFlipped(false) }}>Học thêm</button></div></section>
  return <section className="page review-page"><div className="review-heading"><div><p className="eyebrow">Flashcards · HSK {deckLevel}</p><h1>Ôn tập tập trung</h1></div><span>{index + 1} / {sessionWords.length}</span></div>{deckPicker}<div className="review-progress"><i style={{ width: `${((index + 1) / sessionWords.length) * 100}%` }} /></div><div className={`flashcard ${flipped ? 'flipped' : ''}`} onClick={() => setFlipped(!flipped)} role="button" tabIndex={0} onKeyDown={(event: KeyboardEvent) => event.key === 'Enter' && setFlipped(!flipped)}><div className="card-face card-front"><button className="card-audio" onClick={(event) => { event.stopPropagation(); speak(word.hanzi) }}>♪</button><p className="hanzi-card">{word.hanzi}</p><p>{flipped ? '' : 'Chạm hoặc nhấn Space để xem nghĩa'}</p><button className="difficulty-toggle" onClick={(event) => { event.stopPropagation(); toggleDifficult(word.id) }}>{difficult.includes(word.id) ? '⚑ Từ khó' : '⚐ Đánh dấu khó'}</button></div><div className="card-face card-back"><p className="pinyin">{word.pinyin}</p><span className="pos-pill">{word.partOfSpeech}</span><h2>{word.meaning}</h2><hr /><p className="chinese-sentence">{word.example}</p>{word.translation && <p>{word.translation}</p>}<p className="card-source">HSK 2.0 · HSK {word.introducedAtLevel} · Mục #{word.sourceIndex}</p></div></div>{flipped ? <div className="rating-row"><RatingButton value="again" shortcut="1" label="Quên rồi" time="10 phút" onClick={() => answer('again')} /><RatingButton value="hard" shortcut="2" label="Khó" time="12 giờ" onClick={() => answer('hard')} /><RatingButton value="good" shortcut="3" label="Nhớ được" time="1 ngày" onClick={() => answer('good')} /><RatingButton value="easy" shortcut="4" label="Rất dễ" time="3 ngày" onClick={() => answer('easy')} /></div> : <p className="keyboard-help">Space để lật thẻ · 1–4 để đánh giá sau khi lật</p>}</section>
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

function AnalyticsPage({ state, learned, mastered }: { state: LearningState; learned: number; mastered: number }) {
  const days = Array.from({ length: 7 }, (_, index) => { const day = new Date(); day.setDate(day.getDate() - (6 - index)); return day })
  const totalMinutes = Object.values(state.activity).reduce((total, entry) => total + entry.minutes, 0)
  const totalExercises = Object.values(state.activity).reduce((total, entry) => total + entry.exercises, 0)
  const recentDays = Object.values(state.activity).filter((entry) => entry.cards + entry.exercises > 0).length
  return <section className="page"><div className="page-heading"><div><p className="eyebrow">Dữ liệu học của bạn</p><h1>Thống kê</h1><p className="muted">Chỉ tính các hoạt động bạn đã hoàn thành trên thiết bị này.</p></div></div><div className="analytics-stats"><Stat label="Từ đã học" value={learned} /><Stat label="Từ đã ghi nhớ" value={mastered} /><Stat label="Bài tập đã làm" value={totalExercises} /><Stat label="Phút học" value={totalMinutes} /></div><div className="analytics-grid"><section className="chart-card"><div className="section-title"><div><p className="eyebrow">7 ngày gần đây</p><h2>Nhịp độ học</h2></div><span>{recentDays} ngày có hoạt động</span></div><div className="bar-chart">{days.map((day) => { const data = state.activity[todayKey(day)] ?? { cards: 0, exercises: 0, minutes: 0 }; const height = Math.min(100, data.minutes * 18); return <div key={day.toISOString()}><i style={{ height: `${height}%` }} title={`${data.minutes} phút`} /><small>{new Intl.DateTimeFormat('vi-VN', { weekday: 'short' }).format(day).replace('Th ', 'T')}</small></div> })}</div></section><section className="chart-card"><p className="eyebrow">Ôn tập</p><h2>Khả năng duy trì</h2><div className="retention"><strong>{learned ? `${Math.round((mastered / learned) * 100)}%` : '—'}</strong><span>{learned ? 'thẻ đã đạt ít nhất 3 lần ôn' : 'Hãy hoàn thành vài thẻ để xem số liệu.'}</span></div><div className="progress-track"><i style={{ width: learned ? `${(mastered / learned) * 100}%` : '0%' }} /></div></section></div><section className="chart-card heatmap-card"><div><p className="eyebrow">Lịch hoạt động</p><h2>30 ngày gần đây</h2></div><div className="heatmap">{Array.from({ length: 30 }, (_, index) => { const day = new Date(); day.setDate(day.getDate() - (29 - index)); const data = state.activity[todayKey(day)]; const intensity = Math.min(4, Math.ceil(((data?.cards ?? 0) + (data?.exercises ?? 0)) / 2)); return <i key={day.toISOString()} className={`level-${intensity}`} title={`${day.toLocaleDateString('vi-VN')}: ${(data?.cards ?? 0) + (data?.exercises ?? 0)} hoạt động`} /> })}</div></section></section>
}

function Notebook({ state, setView }: { state: LearningState; setView: (view: View) => void }) {
  const entries = Object.values(state.mistakes).sort((a, b) => b.count - a.count)
  return <section className="page"><div className="page-heading"><div><p className="eyebrow">Ôn theo điểm yếu</p><h1>Sổ tay lỗi sai</h1><p className="muted">Những câu trả lời chưa đúng được lưu tự động để bạn quay lại đúng lúc.</p></div></div>{entries.length ? <div className="mistake-list">{entries.map((mistake) => { const exercise = exercises.find((item) => item.id === mistake.exerciseId)!; return <article key={mistake.exerciseId}><span className="mistake-number">{mistake.count}×</span><div><p className="eyebrow">{exercise.tags.join(' · ')}</p><h3>{exercise.prompt}</h3><p>Bạn chọn: <b>{mistake.answer}</b></p><p>Đáp án: <b>{Array.isArray(exercise.answer) ? exercise.answer.join(' ') : exercise.answer}</b></p><small>{exercise.explanation}</small></div><button className="secondary" onClick={() => setView('exercises')}>Làm lại</button></article>})}</div> : <div className="empty-state large"><span>✓</span><h2>Chưa có lỗi nào cần xem lại</h2><p>Sau khi làm bài, các câu sai sẽ xuất hiện ở đây cùng lời giải thích.</p><button className="primary" onClick={() => setView('exercises')}>Làm bài tập</button></div>}</section>
}

function Onboarding({ state, update }: { state: LearningState; update: (recipe: (state: LearningState) => LearningState) => void }) { const [goal, setGoal] = useState(state.goal); return <div className="modal-layer"><section className="onboarding"><span className="onboarding-mark">汉</span><p className="eyebrow">Chào mừng đến với HANZI</p><h1>Học tiếng Trung, có nhịp điệu.</h1><p>Chúng ta bắt đầu với một kế hoạch nhỏ, vừa sức cho mỗi ngày.</p><label>Trình độ hiện tại<select value="HSK 4" disabled><option>HSK 4 — Có nội dung</option></select></label><fieldset><legend>Mục tiêu từ mới mỗi ngày</legend><div className="goal-options">{[10, 15, 20].map((number) => <button className={goal === number ? 'selected' : ''} onClick={() => setGoal(number)} key={number}>{number} từ</button>)}</div></fieldset><button className="primary wide" onClick={() => update((previous) => ({ ...previous, goal, onboarded: true }))}>Bắt đầu học <span>→</span></button><small>Bạn luôn có thể thay đổi nhịp học sau này.</small></section></div> }

function SearchDialog({ value, setValue, close, setView }: { value: string; setValue: (value: string) => void; close: () => void; setView: (view: View) => void }) { const matching = vocabulary.filter((word) => normalized(`${word.hanzi} ${word.pinyin} ${word.meaning}`).includes(normalized(value))).slice(0, 5); return <div className="modal-layer search-layer" onMouseDown={close}><section className="search-dialog" onMouseDown={(event) => event.stopPropagation()}><div className="field-with-icon"><span>⌕</span><input autoFocus value={value} onChange={(event) => setValue(event.target.value)} onKeyDown={(event) => event.key === 'Escape' && close()} placeholder="Tìm Hán tự, pinyin, nghĩa…" /><kbd>Esc</kbd></div>{value ? <div className="search-results">{matching.length ? matching.map((word) => <button key={word.id} onClick={() => { setView('vocabulary'); close() }}><span className="hanzi-small">{word.hanzi}</span><span><b>{word.meaning}</b><small>{word.pinyin}</small></span></button>) : <p>Không tìm thấy kết quả.</p>}</div> : <div className="search-hint"><p>Tìm nhanh từ vựng, ngữ pháp và bài học.</p><button onClick={() => { setView('grammar'); close() }}>⌘ Xem ngữ pháp</button><button onClick={() => { setView('review'); close() }}>↻ Mở ôn tập</button></div>}</section></div> }

function MobileNavigation({ view, setView }: { view: View; setView: (view: View) => void }) { const mobileNav = nav.filter((item) => ['overview', 'vocabulary', 'typing', 'review', 'analytics'].includes(item.id)); return <nav className="mobile-nav" aria-label="Điều hướng di động">{mobileNav.map((item) => <button key={item.id} className={view === item.id ? 'active' : ''} onClick={() => setView(item.id)}><i>{item.icon}</i><span>{item.label}</span></button>)}</nav> }
