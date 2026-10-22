import { type FormEvent, type ReactNode, useEffect, useMemo, useState } from 'react'
import { exercises, getGrammarById, getVocabularyById, hsk2Curriculum, listVocabulary, grammar, type CurriculumLevel, type CurriculumVocabulary, type Exercise, type GrammarPoint } from '../content/curriculum'
import { hskLocalDictionary, lookupHskDictionary } from '../content/dictionary'
import { ApiError, getCurrentUser, getMistakes, getV2UpgradeStatus, importV1IntoV2, register, signIn, signOut, submitPracticeAttempt, type AuthUser, type MistakeRecord, type V2ImportResult, type V2UpgradeStatus } from './api'
import './v2.css'

type RouteKey = 'today' | 'vocabulary' | 'dictionary' | 'grammar' | 'practice' | 'mistakes' | 'progress' | 'settings'
type IconName = 'home' | 'book' | 'layers' | 'sparkle' | 'chart' | 'settings' | 'search' | 'sun' | 'moon' | 'volume' | 'arrow' | 'check' | 'close' | 'menu' | 'sliders' | 'info' | 'clock' | 'chevron'

const NAVIGATION: Array<{ route: RouteKey; label: string; icon: IconName; href: string }> = [
  { route: 'today', label: 'Hôm nay', icon: 'home', href: '/today' },
  { route: 'vocabulary', label: 'Học từ', icon: 'book', href: '/learn/vocabulary' },
  { route: 'dictionary', label: 'Tra từ', icon: 'search', href: '/dictionary' },
  { route: 'grammar', label: 'Ngữ pháp', icon: 'layers', href: '/learn/grammar' },
  { route: 'practice', label: 'Luyện tập', icon: 'sparkle', href: '/practice' },
  { route: 'progress', label: 'Tiến độ', icon: 'chart', href: '/progress' },
]

function routeFromPath(pathname: string): RouteKey {
  if (pathname.startsWith('/learn/vocabulary')) return 'vocabulary'
  if (pathname.startsWith('/dictionary')) return 'dictionary'
  if (pathname.startsWith('/learn/grammar')) return 'grammar'
  if (pathname.startsWith('/practice/mistakes')) return 'mistakes'
  if (pathname.startsWith('/practice')) return 'practice'
  if (pathname.startsWith('/progress')) return 'progress'
  if (pathname.startsWith('/settings')) return 'settings'
  return 'today'
}

function navigate(href: string) {
  if (`${window.location.pathname}${window.location.search}` === href) return
  window.history.pushState({}, '', href)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

function usePathname() {
  const [pathname, setPathname] = useState(`${window.location.pathname}${window.location.search}`)
  useEffect(() => {
    const update = () => setPathname(`${window.location.pathname}${window.location.search}`)
    window.addEventListener('popstate', update)
    return () => window.removeEventListener('popstate', update)
  }, [])
  return pathname
}

type AuthState = { status: 'loading' | 'anonymous' | 'authenticated' | 'unavailable'; user: AuthUser | null }

function useAuth() {
  const [auth, setAuth] = useState<AuthState>({ status: 'loading', user: null })
  const refresh = async () => {
    try {
      const user = await getCurrentUser()
      setAuth({ status: user ? 'authenticated' : 'anonymous', user })
    } catch {
      setAuth({ status: 'unavailable', user: null })
    }
  }
  useEffect(() => { void refresh() }, [])
  return { auth, refresh }
}

function currentGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Chào buổi sáng'
  if (hour < 18) return 'Chào buổi chiều'
  return 'Chào buổi tối'
}

function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true }
  const content: Record<IconName, ReactNode> = {
    home: <><path d="m3 10 9-7 9 7" /><path d="M5 9v11h14V9" /><path d="M9 20v-6h6v6" /></>,
    book: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v17H6.5A2.5 2.5 0 0 0 4 22Z" /><path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H13v17h4.5A2.5 2.5 0 0 1 20 22Z" /></>,
    layers: <><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 12 9 5 9-5" /><path d="m3 16 9 5 9-5" /></>,
    sparkle: <><path d="m12 3-1.4 5.6L5 10l5.6 1.4L12 17l1.4-5.6L19 10l-5.6-1.4L12 3Z" /><path d="m19 16-.6 2.4L16 19l2.4.6L19 22l.6-2.4L22 19l-2.4-.6L19 16Z" /></>,
    chart: <><path d="M4 20V10" /><path d="M10 20V4" /><path d="M16 20v-7" /><path d="M22 20H2" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.1 2.1-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5v.2h-3v-.2a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1-2.1-2.1.1-.1A1.7 1.7 0 0 0 7 15a1.7 1.7 0 0 0-1.5-1H5.3v-3h.2A1.7 1.7 0 0 0 7 10a1.7 1.7 0 0 0-.3-1.9l-.1-.1 2.1-2.1.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.5v-.2h3v.2a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1 2.1 2.1-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1h.2v3h-.2a1.7 1.7 0 0 0-1.4 1Z" /></>,
    search: <><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5" /></>,
    sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>,
    moon: <path d="M20.6 15.2A8.5 8.5 0 0 1 8.8 3.4 8.5 8.5 0 1 0 20.6 15.2Z" />,
    volume: <><path d="M5 9v6h4l5 4V5L9 9H5Z" /><path d="M17 9.5a3.5 3.5 0 0 1 0 5" /></>,
    arrow: <><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></>,
    check: <path d="m5 12 4.2 4.2L19 6.5" />,
    close: <><path d="m6 6 12 12M18 6 6 18" /></>,
    menu: <><path d="M4 7h16M4 12h16M4 17h16" /></>,
    sliders: <><path d="M4 7h9M17 7h3M4 17h3M11 17h9" /><circle cx="15" cy="7" r="2" /><circle cx="9" cy="17" r="2" /></>,
    info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></>,
    clock: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7v5l3 2" /></>,
    chevron: <path d="m9 18 6-6-6-6" />,
  }
  return <svg {...common}>{content[name]}</svg>
}

function AppLink({ href, className, children, onClick, ariaLabel }: { href: string; className?: string; children: ReactNode; onClick?: () => void; ariaLabel?: string }) {
  return <a href={href} className={className} onClick={(event) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    navigate(href)
    onClick?.()
  }} aria-label={ariaLabel}>{children}</a>
}

function useTheme() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => window.localStorage.getItem('hanzi.v2.theme') === 'dark' ? 'dark' : 'light')
  useEffect(() => window.localStorage.setItem('hanzi.v2.theme', theme), [theme])
  return { theme, setTheme }
}

export default function V2App() {
  const pathname = usePathname()
  const route = routeFromPath(pathname)
  const { theme, setTheme } = useTheme()
  const { auth, refresh } = useAuth()
  const [searchOpen, setSearchOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setSearchOpen(true)
      }
      if (event.key === 'Escape') { setSearchOpen(false); setMobileOpen(false) }
    }
    window.addEventListener('keydown', shortcut)
    return () => window.removeEventListener('keydown', shortcut)
  }, [])

  const speak = (value: string) => {
    if (!('speechSynthesis' in window)) {
      setToast('Trình duyệt này chưa hỗ trợ đọc tiếng Trung.')
      return
    }
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(value)
    utterance.lang = 'zh-CN'
    utterance.rate = .82
    window.speechSynthesis.speak(utterance)
    setToast('Đang dùng giọng đọc có sẵn trong trình duyệt.')
  }

  return <div className={`v2-app theme-${theme}`}>
    <a className="v2-skip-link" href="#main-content">Bỏ qua điều hướng</a>
    <Sidebar route={route} theme={theme} setTheme={setTheme} openSearch={() => setSearchOpen(true)} />
    <header className="v2-mobile-header">
      <AppLink href="/today" className="v2-logo" ariaLabel="HANZI — Hôm nay"><span>汉</span>HANZI</AppLink>
      <div>
        <button className="v2-icon-button" onClick={() => setSearchOpen(true)} aria-label="Tìm từ vựng"><Icon name="search" /></button>
        <button className="v2-icon-button" onClick={() => setMobileOpen(true)} aria-label="Mở điều hướng"><Icon name="menu" /></button>
      </div>
    </header>
    {mobileOpen && <MobilePanel route={route} close={() => setMobileOpen(false)} />}
    <main id="main-content" className="v2-main">
      {route === 'today' && <TodayPage auth={auth} />}
      {route === 'vocabulary' && <VocabularyPage pathname={pathname} speak={speak} />}
      {route === 'dictionary' && <DictionaryPage pathname={pathname} speak={speak} />}
      {route === 'grammar' && <GrammarPage pathname={pathname} speak={speak} />}
      {route === 'practice' && <PracticePage pathname={pathname} auth={auth} />}
      {route === 'mistakes' && <MistakesPage auth={auth} />}
      {route === 'progress' && <ProgressPage />}
      {route === 'settings' && <SettingsPage theme={theme} setTheme={setTheme} auth={auth} refresh={refresh} />}
    </main>
    <MobileNav route={route} />
    {searchOpen && <SearchDialog close={() => setSearchOpen(false)} />}
    {toast && <div className="v2-toast" role="status"><span><Icon name="info" size={17} /></span>{toast}<button onClick={() => setToast(null)} aria-label="Đóng thông báo"><Icon name="close" size={16} /></button></div>}
  </div>
}

function Sidebar({ route, theme, setTheme, openSearch }: { route: RouteKey; theme: 'light' | 'dark'; setTheme: (theme: 'light' | 'dark') => void; openSearch: () => void }) {
  return <aside className="v2-sidebar">
    <AppLink href="/today" className="v2-logo"><span>汉</span>HANZI</AppLink>
    <p className="v2-curriculum-label">HSK 2.0 / 2015</p>
    <button className="v2-search-trigger" onClick={openSearch}><Icon name="search" size={18} /><span>Tìm kiếm</span><kbd>⌘ K</kbd></button>
    <nav aria-label="Điều hướng chính" className="v2-side-nav">
      {NAVIGATION.map((item) => <AppLink key={item.route} href={item.href} className={`v2-nav-link ${route === item.route ? 'is-active' : ''}`}><Icon name={item.icon} /><span>{item.label}</span></AppLink>)}
    </nav>
    <div className="v2-sidebar-footer">
      <AppLink href="/settings" className={`v2-nav-link ${route === 'settings' ? 'is-active' : ''}`}><Icon name="settings" /><span>Cài đặt</span></AppLink>
      <button className="v2-theme-button" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} aria-label={theme === 'light' ? 'Bật giao diện tối' : 'Bật giao diện sáng'}><Icon name={theme === 'light' ? 'moon' : 'sun'} /><span>{theme === 'light' ? 'Giao diện tối' : 'Giao diện sáng'}</span></button>
      <div className="v2-account-note"><span>V2</span><p><strong>Foundation</strong>Chưa kết nối hồ sơ học</p></div>
    </div>
  </aside>
}

function MobilePanel({ route, close }: { route: RouteKey; close: () => void }) {
  return <div className="v2-mobile-panel" role="dialog" aria-modal="true" aria-label="Điều hướng">
    <div className="v2-mobile-panel-card">
      <div className="v2-panel-heading"><span>Điều hướng</span><button className="v2-icon-button" onClick={close} aria-label="Đóng điều hướng"><Icon name="close" /></button></div>
      <nav>{NAVIGATION.map((item) => <AppLink key={item.route} href={item.href} onClick={close} className={`v2-nav-link ${route === item.route ? 'is-active' : ''}`}><Icon name={item.icon} /><span>{item.label}</span></AppLink>)}<AppLink href="/settings" onClick={close} className={`v2-nav-link ${route === 'settings' ? 'is-active' : ''}`}><Icon name="settings" /><span>Cài đặt</span></AppLink></nav>
    </div>
  </div>
}

function PageHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return <header className="v2-page-header"><div><p className="v2-eyebrow">{eyebrow}</p><h1>{title}</h1><p>{description}</p></div>{action}</header>
}

function TodayPage({ auth }: { auth: AuthState }) {
  const featured = listVocabulary({ level: 4, limit: 1 }).items[0]
  return <section className="v2-page v2-today-page">
    <div className="v2-utility-row"><span className="v2-badge">HSK 2.0 (2015)</span><span className="v2-utility-copy"><Icon name="info" size={15} /> {auth.status === 'authenticated' ? `Xin chào ${auth.user?.name || auth.user?.email}.` : auth.status === 'unavailable' ? 'API học chưa sẵn sàng.' : 'Đăng nhập để lưu tiến độ.'}</span></div>
    <PageHeader eyebrow={currentGreeting()} title="Học một nhịp vừa đủ." description="Khám phá nội dung HSK 2.0 đã có nguồn rõ ràng. Kế hoạch cá nhân và lịch ôn sẽ được nối ở phase learning engine." />
    <div className="v2-today-grid">
      <section className="v2-feature-card">
        <div className="v2-feature-card-top"><span className="v2-card-kicker">BẮT ĐẦU TỪ THƯ VIỆN</span><span className="v2-level-orb">HSK<br /><strong>4</strong></span></div>
        <div className="v2-feature-word" lang="zh-CN">{featured.hanzi}</div>
        <p className="v2-feature-pinyin">{featured.pinyin}</p>
        <h2>{featured.meaning}</h2>
        <p>Đây là một mục từ trong danh mục HSK 2.0/2015 hiện có. Bạn có thể xem chi tiết, ví dụ và nguồn nội dung.</p>
        <AppLink href={`/learn/vocabulary/${encodeURIComponent(featured.id)}`} className="v2-primary-link">Xem từ này <Icon name="arrow" size={18} /></AppLink>
      </section>
      <section className="v2-plan-card">
        <div><span className="v2-card-kicker">KẾ HOẠCH HỌC</span><h2>Chưa có dữ liệu để lập kế hoạch.</h2><p>Phase này chưa đọc hoặc ghi tiến độ V1, nên không suy đoán số thẻ đến hạn, thời gian học hay streak.</p></div>
        <div className="v2-honest-empty"><Icon name="clock" size={22} /><span>Learning events sẽ thay thế JSON state ở phase sau.</span></div>
        <AppLink href="/learn/vocabulary" className="v2-secondary-link">Khám phá {hsk2Curriculum.levels[3].cumulativeWordCount.toLocaleString('vi-VN')} từ <Icon name="arrow" size={17} /></AppLink>
      </section>
    </div>
    <section className="v2-section">
      <div className="v2-section-heading"><div><p className="v2-eyebrow">KHÔNG GIAN HỌC</p><h2>Bắt đầu ở nơi bạn cần.</h2></div><span>Content có sẵn</span></div>
      <div className="v2-path-grid">
        <AppLink href="/learn/vocabulary" className="v2-path-card"><span className="v2-path-icon jade"><Icon name="book" /></span><div><h3>Thư viện từ vựng</h3><p>Tìm theo Hán tự, pinyin hoặc nghĩa Việt.</p></div><Icon name="chevron" size={18} /></AppLink>
        <AppLink href="/dictionary" className="v2-path-card"><span className="v2-path-icon amber"><Icon name="search" /></span><div><h3>Tra từ</h3><p>Tra nghĩa cục bộ theo Hán tự, pinyin hoặc tiếng Việt.</p></div><Icon name="chevron" size={18} /></AppLink>
        <AppLink href="/learn/grammar" className="v2-path-card"><span className="v2-path-icon lilac"><Icon name="layers" /></span><div><h3>Grammar Studio</h3><p>16 điểm ngữ pháp cùng ví dụ tiếng Việt.</p></div><Icon name="chevron" size={18} /></AppLink>
        <AppLink href="/practice" className="v2-path-card"><span className="v2-path-icon amber"><Icon name="sparkle" /></span><div><h3>Luyện tập mẫu</h3><p>4 câu đã biên soạn, có lời giải thích.</p></div><Icon name="chevron" size={18} /></AppLink>
      </div>
    </section>
  </section>
}

function VocabularyPage({ pathname, speak }: { pathname: string; speak: (value: string) => void }) {
  const match = pathname.match(/^\/learn\/vocabulary\/([^/]+)$/)
  const requestedId = match ? decodeURIComponent(match[1]) : null
  const [query, setQuery] = useState('')
  const [level, setLevel] = useState<CurriculumLevel | 'all'>('all')
  const vocabularyPage = useMemo(() => listVocabulary({ query, level, limit: 60 }), [query, level])
  const availableWords = vocabularyPage.items
  const selected = requestedId ? getVocabularyById(requestedId) : availableWords[0]

  if (requestedId && !selected) return <NotFoundPage title="Không tìm thấy mục từ" description="Liên kết này không trỏ đến một mục HSK 2.0/2015 hiện có." actionHref="/learn/vocabulary" action="Mở thư viện" />
  if (requestedId && selected) return <WordDetail word={selected} speak={speak} />

  return <section className="v2-page v2-library-page">
    <PageHeader eyebrow="THƯ VIỆN HSK 2.0 / 2015" title="Học từ theo ngữ cảnh." description="Danh mục tích lũy 1.200 mục đến HSK 4. Kết quả mở tại URL riêng để có thể quay lại đúng từ." />
    <div className="v2-library-layout">
      <section className="v2-library-list" aria-label="Danh sách từ vựng">
        <label className="v2-field"><Icon name="search" size={18} /><span className="sr-only">Tìm từ vựng</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Hán tự, pinyin, nghĩa Việt…" /></label>
        <div className="v2-filters" aria-label="Lọc theo cấp độ"><button className={level === 'all' ? 'is-selected' : ''} onClick={() => setLevel('all')}>Tất cả</button>{([1, 2, 3, 4] as const).map((item) => <button key={item} className={level === item ? 'is-selected' : ''} onClick={() => setLevel(item)}>HSK {item}</button>)}</div>
        <p className="v2-result-count">{vocabularyPage.total.toLocaleString('vi-VN')} kết quả · hiển thị 60 mục đầu</p>
        <div className="v2-word-list">{availableWords.map((word) => <AppLink href={`/learn/vocabulary/${encodeURIComponent(word.id)}`} key={word.id} className="v2-word-row"><span lang="zh-CN">{word.hanzi}</span><div><strong>{word.meaning}</strong><small>{word.pinyin}</small></div><em>HSK {word.introducedAtLevel}</em></AppLink>)}</div>
      </section>
      <section className="v2-library-intro"><span className="v2-intro-mark" lang="zh-CN">字</span><p className="v2-eyebrow">TÌM ĐÚNG TỪ</p><h2>Chọn một mục để xem chi tiết.</h2><p>Hệ thống sẽ không thay thế nghĩa, Pinyin hoặc ví dụ bằng dữ liệu tự tạo. Mỗi mục dùng danh mục HSK 2.0/2015 hiện có.</p><div><span>{hsk2Curriculum.levels[3].cumulativeWordCount.toLocaleString('vi-VN')}</span><small>mục từ tích lũy đến HSK 4</small></div></section>
    </div>
  </section>
}

function WordDetail({ word, speak }: { word: CurriculumVocabulary; speak: (value: string) => void }) {
  return <section className="v2-page v2-detail-page">
    <AppLink href="/learn/vocabulary" className="v2-back-link">← Quay lại thư viện</AppLink>
    <article className="v2-word-detail">
      <div className="v2-detail-head"><div><span className="v2-badge">HSK 2.0 (2015) · HSK {word.introducedAtLevel}</span><h1 lang="zh-CN">{word.hanzi}</h1><p className="v2-detail-pinyin">{word.pinyin}</p><p className="v2-detail-meaning">{word.meaning}</p></div><button className="v2-sound-button" onClick={() => speak(word.hanzi)} aria-label={`Nghe cách đọc ${word.hanzi}`}><Icon name="volume" /></button></div>
      <div className="v2-detail-metadata"><div><span>Từ loại</span><strong>{word.partOfSpeech}</strong></div><div><span>Nguồn danh mục</span><strong>Mục #{word.sourceIndex}</strong></div><div><span>Trạng thái</span><strong>{word.verificationStatus === 'verified' ? 'Đã biên soạn' : 'Cần rà soát biên tập'}</strong></div></div>
      <section className="v2-example-card"><p className="v2-eyebrow">VÍ DỤ</p><p lang="zh-CN">{word.example}</p>{word.translation && <p className="v2-translation">{word.translation}</p>}<button className="v2-text-button" onClick={() => speak(word.example)}><Icon name="volume" size={16} /> Nghe câu bằng giọng trình duyệt</button></section>
      <aside className="v2-provenance"><Icon name="info" size={18} /><p><strong>Nội dung có nguồn.</strong> Danh mục thuộc HSK 2.0/2015. Ví dụ và metadata tuân theo hồ sơ nguồn dữ liệu của dự án; chỉ bản dịch đã biên soạn mới được hiển thị.</p></aside>
    </article>
  </section>
}

function DictionaryPage({ pathname, speak }: { pathname: string; speak: (value: string) => void }) {
  const requestedQuery = new URLSearchParams(pathname.split('?')[1] ?? '').get('q') ?? ''
  const [query, setQuery] = useState(requestedQuery)
  useEffect(() => { setQuery(requestedQuery) }, [requestedQuery])
  const lookup = useMemo(() => lookupHskDictionary(query), [query])
  const searched = query.trim().length > 0
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextQuery = query.trim()
    navigate(nextQuery ? `/dictionary?q=${encodeURIComponent(nextQuery)}` : '/dictionary')
  }

  return <section className="v2-page v2-dictionary-page">
    <PageHeader eyebrow="TỪ ĐIỂN CỤC BỘ" title="Tra nghĩa, hiểu ngữ cảnh." description="Nhập Hán tự, Pinyin có hoặc không dấu, hoặc nghĩa tiếng Việt. Kết quả hiện lấy từ catalogue HSK đã có trong HANZI; không gửi từ bạn tra đến dịch vụ từ điển bên thứ ba." />
    <section className="v2-dictionary-shell">
      <form className="v2-dictionary-search" onSubmit={submit} role="search">
        <label className="v2-field"><Icon name="search" size={20} /><span className="sr-only">Tra từ Hán ngữ</span><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ví dụ: 经验, jingyan, kinh nghiệm…" /></label>
        <button className="v2-primary-button" type="submit">Tra từ <Icon name="arrow" size={17} /></button>
      </form>
      <aside className="v2-dictionary-provider"><span className="v2-setting-icon"><Icon name="check" size={19} /></span><div><p className="v2-eyebrow">NGUỒN ĐANG DÙNG</p><strong>{hskLocalDictionary.label}</strong><small>{hskLocalDictionary.scope} · hoạt động ngay trong ứng dụng</small></div></aside>
      {!searched && <section className="v2-dictionary-welcome"><span lang="zh-CN">词</span><div><h2>Bắt đầu bằng một từ bạn đang gặp.</h2><p>Tra chính xác nghĩa đã biên soạn trong phạm vi HSK 1–4, nghe cách đọc và mở thẻ học tương ứng. Chưa có kết quả không có nghĩa là từ đó không tồn tại — chỉ là nó chưa thuộc từ điển HSK cục bộ.</p><div className="v2-dictionary-suggestions" aria-label="Từ gợi ý">{['你好', '学习', '经验', '谢谢'].map((suggestion) => <button key={suggestion} onClick={() => setQuery(suggestion)} lang="zh-CN">{suggestion}</button>)}</div></div></section>}
      {searched && <section className="v2-dictionary-results" aria-live="polite">
        <div className="v2-dictionary-results-heading"><div><p className="v2-eyebrow">KẾT QUẢ TRA TỪ</p><h2>{lookup.total ? `${lookup.total.toLocaleString('vi-VN')} mục phù hợp` : 'Chưa tìm thấy trong phạm vi HSK'}</h2></div><span>{lookup.total > lookup.results.length ? `Hiển thị ${lookup.results.length} mục đầu` : hskLocalDictionary.mode === 'local' ? 'Không dùng API ngoài' : ''}</span></div>
        {lookup.results.length ? <div className="v2-dictionary-result-grid">{lookup.results.map(({ word, match }) => <article key={word.id} className="v2-dictionary-result"><div className="v2-dictionary-result-head"><div><p lang="zh-CN">{word.hanzi}</p><span>{word.pinyin}</span></div><span className={`v2-match-badge is-${match}`}>{match === 'exact' ? 'KHỚP CHÍNH XÁC' : match === 'prefix' ? 'BẮT ĐẦU BẰNG' : 'LIÊN QUAN'}</span></div><h3>{word.meaning}</h3><dl><div><dt>Từ loại</dt><dd>{word.partOfSpeech}</dd></div><div><dt>Trình độ</dt><dd>HSK {word.introducedAtLevel}</dd></div></dl><div className="v2-dictionary-example"><p lang="zh-CN">{word.example}</p>{word.translation && <small>{word.translation}</small>}</div><footer><button className="v2-text-button" onClick={() => speak(word.hanzi)}><Icon name="volume" size={16} /> Nghe</button><AppLink className="v2-secondary-link" href={`/learn/vocabulary/${encodeURIComponent(word.id)}`}>Mở thẻ học <Icon name="arrow" size={15} /></AppLink></footer></article>)}</div> : <section className="v2-dictionary-empty"><span><Icon name="search" size={27} /></span><h2>Chưa có mục khớp trong {hskLocalDictionary.scope}.</h2><p>Hãy thử bỏ dấu Pinyin, tra từng chữ Hán, hoặc dùng một nghĩa Việt ngắn hơn. Bản đầy đủ ngoài HSK sẽ được thêm từ nguồn có giấy phép, không bằng cách đoán nghĩa hay scrape website khác.</p></section>}
      </section>}
    </section>
  </section>
}

function GrammarPage({ pathname, speak }: { pathname: string; speak: (value: string) => void }) {
  const match = pathname.match(/^\/learn\/grammar\/([^/]+)$/)
  const requested = match ? decodeURIComponent(match[1]) : null
  const selected = requested ? getGrammarById(requested) : grammar[0]
  if (requested && !selected) return <NotFoundPage title="Không tìm thấy điểm ngữ pháp" description="Liên kết này không trỏ tới nội dung hiện có." actionHref="/learn/grammar" action="Mở Grammar Studio" />
  return <section className="v2-page v2-grammar-page">
    <PageHeader eyebrow="GRAMMAR STUDIO" title="Hiểu cấu trúc, không chỉ nhớ đáp án." description="Các điểm ngữ pháp hiện có được trình bày lại theo hướng đọc nhanh, ví dụ rõ và liên kết ổn định." />
    <div className="v2-grammar-layout"><nav className="v2-grammar-list" aria-label="Danh sách ngữ pháp">{grammar.map((item) => <AppLink href={`/learn/grammar/${encodeURIComponent(item.id)}`} className={item.id === selected?.id ? 'is-selected' : ''} key={item.id}><span lang="zh-CN">{item.title}</span><small>{item.meaning}</small></AppLink>)}</nav>{selected && <GrammarLesson grammarPoint={selected} speak={speak} />}</div>
  </section>
}

function GrammarLesson({ grammarPoint, speak }: { grammarPoint: GrammarPoint; speak: (value: string) => void }) {
  return <article className="v2-lesson"><span className="v2-badge">{grammarPoint.category}</span><h2 lang="zh-CN">{grammarPoint.title}</h2><p className="v2-lesson-meaning">{grammarPoint.meaning}</p><section><h3>Cấu trúc</h3><p className="v2-structure" lang="zh-CN">{grammarPoint.structure}</p></section><section><h3>Cách dùng</h3><p>{grammarPoint.explanation}</p></section><section><h3>Ví dụ</h3>{grammarPoint.examples.map((example, index) => <div className="v2-lesson-example" key={example.chinese}><div><p lang="zh-CN">{example.chinese}</p><small>{example.vietnamese}</small></div><button className="v2-icon-button" onClick={() => speak(example.chinese)} aria-label={`Nghe ví dụ ${index + 1}`}><Icon name="volume" size={18} /></button></div>)}</section><aside className="v2-mistake-note"><strong>Điều dễ nhầm</strong><p>{grammarPoint.mistake}</p>{grammarPoint.comparison && <p>{grammarPoint.comparison}</p>}</aside></article>
}

function PracticePage({ pathname, auth }: { pathname: string; auth: AuthState }) {
  const requestedExerciseId = new URLSearchParams(pathname.split('?')[1] ?? '').get('exercise')
  const [activeId, setActiveId] = useState(requestedExerciseId && exercises.some((exercise) => exercise.id === requestedExerciseId) ? requestedExerciseId : exercises[0]?.id ?? '')
  const [answer, setAnswer] = useState<string | string[] | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [syncStatus, setSyncStatus] = useState<string | null>(null)
  const active = exercises.find((exercise) => exercise.id === activeId) ?? exercises[0]
  const correct = active && answer !== null && isCorrectAnswer(active, answer)
  useEffect(() => {
    if (requestedExerciseId && exercises.some((exercise) => exercise.id === requestedExerciseId)) {
      setActiveId(requestedExerciseId); setAnswer(null); setSubmitted(false); setSyncStatus(null)
    }
  }, [requestedExerciseId])
  const choose = (value: string) => {
    if (!active || submitted) return
    setAnswer(active.type === 'order'
      ? (previous) => Array.isArray(previous) ? [...previous, value] : [value]
      : value)
  }
  const check = async () => {
    if (!active || answer === null) return
    setSubmitted(true)
    if (auth.status !== 'authenticated') {
      setSyncStatus('Kết quả chỉ hiển thị trong phiên này. Đăng nhập trong Cài đặt để lưu attempt và lỗi sai.')
      return
    }
    setSyncStatus('Đang lưu attempt…')
    try {
      const key = globalThis.crypto?.randomUUID?.().replace(/-/g, '') ?? `practice_${Date.now()}_${Math.random().toString(36).slice(2)}`
      const result = await submitPracticeAttempt(active.id, answer, key)
      setSyncStatus(result.attempt.replayed ? 'Attempt này đã được đồng bộ trước đó.' : 'Đã lưu attempt và cập nhật sổ lỗi.')
    } catch (error) {
      setSyncStatus(error instanceof ApiError ? `Chưa lưu được: ${error.message}` : 'Chưa thể kết nối để lưu attempt.')
    }
  }
  return <section className="v2-page v2-practice-page">
    <PageHeader eyebrow="LUYỆN TẬP" title="Luyện ít, hiểu kỹ." description="Bốn câu curated được server tự chấm khi bạn đăng nhập. Khi chưa đăng nhập, kết quả chỉ tồn tại trong phiên hiện tại." />
    <div className="v2-practice-layout"><nav className="v2-practice-list" aria-label="Bài tập mẫu">{exercises.map((exercise, index) => <button key={exercise.id} onClick={() => { setActiveId(exercise.id); setAnswer(null); setSubmitted(false); setSyncStatus(null) }} className={exercise.id === active?.id ? 'is-selected' : ''}><span>{String(index + 1).padStart(2, '0')}</span><div><strong>{exercise.title}</strong><small>{exercise.type === 'order' ? 'Sắp xếp câu' : 'Chọn đáp án'}</small></div></button>)}</nav>{active && <article className="v2-practice-card"><span className="v2-badge">{active.type === 'order' ? 'SẮP XẾP CÂU' : 'CHỌN ĐÁP ÁN'}</span><h2>{active.title}</h2><p className="v2-practice-prompt" lang="zh-CN">{active.prompt}</p>{active.type === 'order' && Array.isArray(answer) && <div className="v2-order-answer">{answer.map((item, index) => <button key={`${item}-${index}`} onClick={() => !submitted && setAnswer(answer.filter((_, position) => position !== index))} lang="zh-CN">{item} ×</button>)}</div>}{active.options?.length ? <div className="v2-option-grid">{active.options.map((option) => <button key={option} disabled={submitted || (Array.isArray(answer) && answer.includes(option))} onClick={() => choose(option)} className={answer === option ? 'is-chosen' : ''} lang="zh-CN">{option}</button>)}</div> : <div className="v2-feedback is-incorrect"><Icon name="info" /><div><strong>Chưa hỗ trợ dạng bài này</strong><p>Bài tập không có danh sách phương án nên không thể hiển thị như lựa chọn.</p></div></div>}{!submitted && <button className="v2-primary-button" disabled={answer === null || (Array.isArray(answer) && answer.length === 0)} onClick={() => void check()}>Kiểm tra đáp án <Icon name="arrow" size={17} /></button>}{submitted && <div className={`v2-feedback ${correct ? 'is-correct' : 'is-incorrect'}`} role="status"><Icon name={correct ? 'check' : 'info'} /><div><strong>{correct ? 'Chính xác' : 'Chưa đúng'}</strong><p>{active.explanation}</p></div></div>}{syncStatus && <p className="v2-session-note"><Icon name="info" size={16} /> {syncStatus}</p>}</article>}</div>
  </section>
}

function isCorrectAnswer(exercise: Exercise, answer: string | string[]) {
  return Array.isArray(exercise.answer)
    ? Array.isArray(answer) && exercise.answer.length === answer.length && exercise.answer.every((item, index) => item === answer[index])
    : exercise.answer === answer
}

function MistakesPage({ auth }: { auth: AuthState }) {
  const [mistakes, setMistakes] = useState<MistakeRecord[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    if (auth.status !== 'authenticated') { setMistakes(null); return }
    void getMistakes().then(setMistakes).catch((reason) => setError(reason instanceof ApiError ? reason.message : 'Chưa thể tải sổ lỗi.'))
  }, [auth.status])
  if (auth.status !== 'authenticated') return <section className="v2-page"><PageHeader eyebrow="SỔ LỖI" title="Đăng nhập để lưu lỗi cần ôn." description="Chỉ attempt đã được đồng bộ bằng event thật mới xuất hiện tại đây." /><section className="v2-empty-state"><span><Icon name="sparkle" size={31} /></span><h2>Chưa có tài khoản học đang hoạt động.</h2><p>Mở Cài đặt để đăng nhập, rồi mỗi câu làm sai sẽ có thể luyện lại đúng câu đó.</p><AppLink href="/settings" className="v2-primary-link">Mở cài đặt <Icon name="arrow" size={18} /></AppLink></section></section>
  if (error) return <section className="v2-page"><NotFoundPage title="Chưa thể tải sổ lỗi" description={error} actionHref="/practice" action="Quay lại luyện tập" /></section>
  if (mistakes === null) return <section className="v2-page"><PageHeader eyebrow="SỔ LỖI" title="Đang tải lỗi cần ôn." description="Chỉ hiển thị dữ liệu đã lưu trên máy chủ." /></section>
  return <section className="v2-page"><PageHeader eyebrow="SỔ LỖI" title={mistakes.length ? 'Luyện lại đúng chỗ cần cải thiện.' : 'Chưa có lỗi cần ôn.'} description={mistakes.length ? 'Mỗi mục dưới đây là một exercise đã được lưu từ attempt chưa chính xác.' : 'Các attempt đúng sẽ không tạo lỗi; không có dữ liệu mẫu được hiển thị.'} />{mistakes.length ? <div className="v2-mistake-list">{mistakes.map((record) => { const exercise = exercises.find((item) => item.id === record.exerciseId); return exercise ? <article key={record.exerciseId}><span>{record.incorrectCount}×</span><div><p className="v2-eyebrow">{exercise.tags.join(' · ')}</p><h2>{exercise.prompt}</h2><p>Đáp án gần nhất: {Array.isArray(record.answer) ? record.answer.join(' ') : record.answer}</p><small>{exercise.explanation}</small></div><AppLink href={`/practice?exercise=${encodeURIComponent(exercise.id)}`} className="v2-secondary-link">Luyện lại <Icon name="arrow" size={16} /></AppLink></article> : null })}</div> : <section className="v2-empty-state"><span><Icon name="check" size={31} /></span><h2>Bạn chưa có câu nào cần làm lại.</h2><AppLink href="/practice" className="v2-primary-link">Mở luyện tập <Icon name="arrow" size={18} /></AppLink></section>}</section>
}

function ProgressPage() {
  return <section className="v2-page"><PageHeader eyebrow="TIẾN ĐỘ" title="Dữ liệu học sẽ đáng tin khi có event." description="Các chỉ số cá nhân như số phút, streak hay tỷ lệ ghi nhớ chưa được suy diễn từ state cũ trong shell V2." /><section className="v2-progress-placeholder"><div><span className="v2-progress-ring">—</span><h2>Chưa đủ dữ liệu để tạo insight.</h2><p>Phase learning engine sẽ đo session thực, review event và practice attempt thay vì cộng phút theo số flashcard.</p></div><div className="v2-progress-principles"><p><Icon name="check" size={17} /> Không có biểu đồ mẫu</p><p><Icon name="check" size={17} /> Không có streak giả</p><p><Icon name="check" size={17} /> Không suy diễn từ JSON blob</p></div></section></section>
}

function SettingsPage({ theme, setTheme, auth, refresh }: { theme: 'light' | 'dark'; setTheme: (theme: 'light' | 'dark') => void; auth: AuthState; refresh: () => Promise<void> }) {
  return <section className="v2-page v2-settings-page"><PageHeader eyebrow="CÀI ĐẶT" title="Không gian học của bạn." description="Theme hoạt động cục bộ; đăng nhập mở event sync cho review và practice." /><section className="v2-settings-card"><div><span className="v2-setting-icon"><Icon name={theme === 'light' ? 'sun' : 'moon'} /></span><div><h2>Giao diện</h2><p>Đang dùng {theme === 'light' ? 'nền sáng ivory' : 'giao diện tối'}.</p></div></div><button className="v2-secondary-button" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>Chuyển sang {theme === 'light' ? 'tối' : 'sáng'}</button></section><AuthCard auth={auth} refresh={refresh} /><UpgradeStatusCard auth={auth} /><section className="v2-settings-card"><div><span className="v2-setting-icon"><Icon name="book" /></span><div><h2>Curriculum</h2><p><strong>HSK 2.0 / 2015</strong> · danh mục tích lũy đến HSK 4.</p></div></div><span className="v2-badge">ĐÃ CHỐT</span></section></section>
}

function UpgradeStatusCard({ auth }: { auth: AuthState }) {
  const [status, setStatus] = useState<V2UpgradeStatus | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  useEffect(() => {
    if (auth.status !== 'authenticated') { setStatus(null); return }
    void getV2UpgradeStatus().then(setStatus).catch((error) => setMessage(error instanceof ApiError ? error.message : 'Chưa thể kiểm tra trạng thái nâng cấp.'))
  }, [auth.status])
  const startImport = async () => {
    setMessage('Đang tạo snapshot V1 và kiểm tra dữ liệu…')
    try {
      const result = await importV1IntoV2()
      setMessage(importMessage(result.upgrade))
      setStatus(await getV2UpgradeStatus())
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : 'Chưa thể bắt đầu handover V2.')
    }
  }
  if (auth.status !== 'authenticated') return null
  if (!status && !message) return <section className="v2-settings-card"><div><span className="v2-setting-icon"><Icon name="clock" /></span><div><h2>Kiểm tra nâng cấp V2</h2><p>Đang đọc trạng thái kế thừa dữ liệu V1…</p></div></div></section>
  if (!status) return <section className="v2-settings-card"><div><span className="v2-setting-icon"><Icon name="info" /></span><div><h2>Kiểm tra nâng cấp V2</h2><p>{message}</p></div></div></section>
  const unmapped = status.lastImport?.report?.unmapped?.length ?? 0
  const summary = status.migration === 'current'
    ? `Snapshot V1 hiện tại đã được ghi nhận cho V2${unmapped ? `; còn ${unmapped} mục legacy cần giữ nguyên` : ''}.`
    : status.migration === 'stale'
      ? 'Tiến độ V1 đã thay đổi sau lần import trước. V2 bị khóa để tránh ghi đè dữ liệu.'
      : status.migration === 'not_imported'
        ? 'Dữ liệu V1 vẫn nguyên vẹn và chưa được import sang model V2.'
        : status.migration === 'no_v1_state'
          ? 'Tài khoản chưa có tiến độ V1 trên máy chủ để kế thừa.'
          : 'Server hiện vẫn ở chế độ V1. Migration và rehearsal cần hoàn tất trước khi V2 đọc/ghi learning events.'
  return <section className="v2-settings-card v2-upgrade-card"><div><span className="v2-setting-icon"><Icon name={status.migration === 'current' ? 'check' : 'info'} /></span><div><p className="v2-eyebrow">KẾ THỪA V1 → V2</p><h2>{status.migration === 'current' ? 'Dữ liệu V1 đã có snapshot an toàn' : 'Handover dữ liệu có kiểm soát'}</h2><p>{summary}</p></div></div>{status.handoverEnabled && status.migration === 'not_imported' && <button className="v2-primary-button" onClick={() => void startImport()}>Tạo snapshot và import V1 <Icon name="arrow" size={17} /></button>}{status.migration === 'stale' && <p className="v2-session-note"><Icon name="info" size={16} /> Cần đối chiếu snapshot cũ trước khi handover tiếp; V2 không tự merge hai lịch học.</p>}{message && <p className="v2-session-note"><Icon name="info" size={16} /> {message}</p>}</section>
}

function importMessage(result: V2ImportResult) {
  if (result.status === 'imported') return `Đã tạo snapshot và import ${result.imported?.reviewCards ?? 0} thẻ ôn từ V1.`
  if (result.status === 'already_imported') return 'Snapshot V1 này đã được import trước đó; không tạo bản sao dữ liệu.'
  if (result.status === 'v1_state_changed_after_import') return 'V1 đã thay đổi sau lần import trước; V2 đã khóa để tránh merge sai tiến độ.'
  return 'Tài khoản chưa có tiến độ V1 trên máy chủ để import.'
}

function AuthCard({ auth, refresh }: { auth: AuthState; refresh: () => Promise<void> }) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [message, setMessage] = useState<string | null>(null)
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const email = String(form.get('email') ?? '')
    const password = String(form.get('password') ?? '')
    setMessage('Đang xác thực…')
    try {
      if (mode === 'login') await signIn(email, password)
      else await register(String(form.get('name') ?? ''), email, password)
      await refresh()
      setMessage('Đã đăng nhập. Attempt mới sẽ được đồng bộ.')
    } catch (error) { setMessage(error instanceof ApiError ? error.message : 'Chưa thể kết nối API xác thực.') }
  }
  const logout = async () => { try { await signOut(); await refresh(); setMessage('Đã đăng xuất.') } catch (error) { setMessage(error instanceof ApiError ? error.message : 'Chưa thể đăng xuất.') } }
  if (auth.status === 'authenticated') return <section className="v2-settings-card"><div><span className="v2-setting-icon"><Icon name="check" /></span><div><h2>Đã đăng nhập</h2><p>{auth.user?.name || auth.user?.email} · review và practice attempt sẽ lưu qua API.</p></div></div><button className="v2-secondary-button" onClick={() => void logout()}>Đăng xuất</button>{message && <p className="v2-auth-message">{message}</p>}</section>
  return <section className="v2-settings-card v2-auth-card"><div><span className="v2-setting-icon"><Icon name="home" /></span><div><h2>{auth.status === 'unavailable' ? 'API chưa sẵn sàng' : mode === 'login' ? 'Đăng nhập để đồng bộ' : 'Tạo tài khoản học'}</h2><p>{auth.status === 'unavailable' ? 'Không thể kết nối API. Bạn vẫn có thể xem content công khai.' : 'Cookie phiên bảo mật; không lưu mật khẩu trên trình duyệt.'}</p></div></div>{auth.status !== 'unavailable' && <form onSubmit={(event) => void submit(event)} className="v2-auth-form">{mode === 'register' && <label>Họ tên<input name="name" autoComplete="name" maxLength={80} /></label>}<label>Email<input name="email" type="email" autoComplete="email" required /></label><label>Mật khẩu<input name="password" type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength={8} maxLength={128} required /></label><div><button className="v2-primary-button" type="submit">{mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}</button><button className="v2-text-button" type="button" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setMessage(null) }}>{mode === 'login' ? 'Tạo tài khoản' : 'Đã có tài khoản'}</button></div></form>}{message && <p className="v2-auth-message">{message}</p>}</section>
}

function NotFoundPage({ title, description, actionHref, action }: { title: string; description: string; actionHref: string; action: string }) {
  return <section className="v2-page"><section className="v2-empty-state"><span><Icon name="search" size={31} /></span><h1>{title}</h1><p>{description}</p><AppLink href={actionHref} className="v2-primary-link">{action} <Icon name="arrow" size={18} /></AppLink></section></section>
}

function SearchDialog({ close }: { close: () => void }) {
  const [query, setQuery] = useState('')
  const results = useMemo(() => query.trim() ? listVocabulary({ query, limit: 7 }).items : [], [query])
  const submit = (event: FormEvent) => { event.preventDefault(); if (query.trim()) { navigate(`/dictionary?q=${encodeURIComponent(query.trim())}`); close() } }
  return <div className="v2-search-layer" role="dialog" aria-modal="true" aria-label="Tìm nhanh từ vựng" onMouseDown={close}><section className="v2-search-dialog" onMouseDown={(event) => event.stopPropagation()}><div className="v2-search-dialog-top"><form className="v2-field" onSubmit={submit}><Icon name="search" size={19} /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm Hán tự, pinyin, nghĩa Việt…" /><kbd>Esc</kbd></form><button className="v2-icon-button" onClick={close} aria-label="Đóng tìm kiếm"><Icon name="close" /></button></div>{!query && <p className="v2-search-hint">Nhập Hán tự, Pinyin có hoặc không dấu, hay nghĩa Việt. Enter để mở Tra từ; kết quả nhanh mở thẻ học tương ứng.</p>}{query && <div className="v2-search-results">{results.length ? results.map((word) => <AppLink href={`/learn/vocabulary/${encodeURIComponent(word.id)}`} onClick={close} key={word.id}><span lang="zh-CN">{word.hanzi}</span><div><strong>{word.meaning}</strong><small>{word.pinyin} · HSK {word.introducedAtLevel}</small></div><Icon name="chevron" size={18} /></AppLink>) : <p>Chưa thấy mục phù hợp trong danh mục HSK 2.0/2015. Nhấn Enter để xem Tra từ đầy đủ.</p>}</div>}</section></div>
}

function MobileNav({ route }: { route: RouteKey }) {
  const items = NAVIGATION.filter((item) => ['today', 'vocabulary', 'practice', 'progress'].includes(item.route))
  return <nav className="v2-bottom-nav" aria-label="Điều hướng di động">{items.map((item) => <AppLink key={item.route} href={item.href} className={route === item.route || (item.route === 'practice' && route === 'mistakes') ? 'is-active' : ''}><Icon name={item.icon} size={19} /><span>{item.route === 'vocabulary' ? 'Học' : item.route === 'practice' ? 'Ôn' : item.label}</span></AppLink>)}<AppLink href="/settings" className={route === 'settings' ? 'is-active' : ''}><Icon name="settings" size={19} /><span>Tôi</span></AppLink></nav>
}
