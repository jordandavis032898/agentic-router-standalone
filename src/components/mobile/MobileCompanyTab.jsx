import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  Loader2,
  ArrowLeft,
  Share2,
  ChevronRight,
  ChevronDown,
  CheckCircle2,
  AlertTriangle,
  Minus,
  TrendingUp,
  TrendingDown,
  Clock,
  ExternalLink,
  RotateCcw,
  Building2,
  X,
} from 'lucide-react'
import { COMPANIES, CompanyLogo, fuzzyMatch } from '../../utils/companies.jsx'
import { timeAgo } from '../../utils/timeUtils'
import {
  analyzeFinancialData,
  findFirstMetric,
  toSortedPairs,
  formatMoney,
  getSeverityStyle,
  SEVERITY,
} from '../../utils/insightEngine'
import { useTheme } from '../../ThemeContext'

// ─── Constants ───────────────────────────────────────────────────────────────

const POPULAR_TICKERS = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA']

const LOADING_STAGES = [
  'Connecting to SEC EDGAR...',
  'Fetching financial data...',
  'Analyzing statements...',
  'Building scorecard...',
]

const RECENT_KEY = 'recent_companies'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getRecentCompanies() {
  try {
    const raw = localStorage.getItem(RECENT_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveRecentCompany(ticker, name) {
  try {
    let recent = getRecentCompanies()
    recent = recent.filter((r) => r.ticker !== ticker)
    recent.unshift({ ticker, name, timestamp: Date.now() })
    if (recent.length > 10) recent = recent.slice(0, 10)
    localStorage.setItem(RECENT_KEY, JSON.stringify(recent))
  } catch {
    // localStorage may be unavailable
  }
}

function findCompanyByTicker(ticker) {
  return COMPANIES.find((c) => c.ticker === ticker.toUpperCase())
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function MobileCompanyTab({
  apiUrl,
  addToast,
  edgarData,
  reportCardData,
  reportCardLoading,
  onSearch,
  onRefreshReportCard,
  merlinOffline = false,
}) {
  const { isDark } = useTheme()

  // Internal view state: 'search' | 'loading' | 'scorecard'
  const [view, setView] = useState('search')
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState(null)
  const [showAutocomplete, setShowAutocomplete] = useState(false)
  const [recentCompanies, setRecentCompanies] = useState(getRecentCompanies)

  // Loading view state
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [loadingStage, setLoadingStage] = useState(0)
  const [loadingTicker, setLoadingTicker] = useState('')
  const [loadingName, setLoadingName] = useState('')

  // Scorecard expanded category
  const [expandedCategory, setExpandedCategory] = useState(null)

  // News
  const [companyNews, setCompanyNews] = useState([])

  // Refs
  const abortRef = useRef(null)
  const inputRef = useRef(null)
  const progressTimerRef = useRef(null)
  const stageTimerRef = useRef(null)

  // ─── Detect external edgarData changes ──────────────────────────────────

  useEffect(() => {
    if (edgarData && edgarData.results && view === 'search') {
      const company = findCompanyByTicker(edgarData.ticker)
      if (company) {
        saveRecentCompany(company.ticker, company.name)
        setRecentCompanies(getRecentCompanies())
      }
      setView('scorecard')
    }
  }, [edgarData]) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Transition from loading to scorecard when data arrives ─────────────

  useEffect(() => {
    if (view === 'loading' && reportCardData && !reportCardLoading) {
      clearTimers()
      setView('scorecard')
    }
  }, [view, reportCardData, reportCardLoading])

  // Also switch when edgarData arrives while loading (report card may be null for a moment)
  useEffect(() => {
    if (view === 'loading' && edgarData && edgarData.ticker === loadingTicker) {
      // Give reportCard a few seconds to come in, then show scorecard anyway
      const timer = setTimeout(() => {
        if (view === 'loading') {
          clearTimers()
          setView('scorecard')
        }
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [view, edgarData, loadingTicker]) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Fetch company news ─────────────────────────────────────────────────

  useEffect(() => {
    if (view !== 'scorecard' || !edgarData?.ticker) return
    const controller = new AbortController()
    ;(async () => {
      try {
        // DATA CALL: AUTOMATIC
        // Triggered by: scorecard view shown (fetches company-related news)
        const res = await fetch(
          `${apiUrl}/api/market-news?category=all&page=1`,
          { signal: controller.signal }
        )
        if (!res.ok) return
        const data = await res.json()
        const articles = (data.articles || data.data || []).filter((a) => {
          const text = `${a.headline || a.title || ''} ${a.summary || a.description || ''}`.toUpperCase()
          return text.includes(edgarData.ticker)
        })
        setCompanyNews(articles.slice(0, 3))
      } catch {
        // ignore
      }
    })()
    return () => controller.abort()
  }, [view, edgarData?.ticker, apiUrl])

  // ─── Cleanup ────────────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      if (abortRef.current) abortRef.current.abort()
      clearTimers()
    }
  }, [])

  function clearTimers() {
    if (progressTimerRef.current) clearInterval(progressTimerRef.current)
    if (stageTimerRef.current) clearInterval(stageTimerRef.current)
    progressTimerRef.current = null
    stageTimerRef.current = null
  }

  // ─── Autocomplete matches ──────────────────────────────────────────────

  const autocompleteResults = useMemo(() => {
    if (!query.trim() || query.trim().length < 1) return []
    return COMPANIES.filter(
      (c) =>
        fuzzyMatch(c.name, query) ||
        fuzzyMatch(c.ticker, query) ||
        fuzzyMatch(c.desc || '', query)
    ).slice(0, 5)
  }, [query])

  // ─── Search function ───────────────────────────────────────────────────

  const doSearch = useCallback(
    async (ticker) => {
      if (!ticker || searching) return

      const upperTicker = ticker.toUpperCase()
      const company = findCompanyByTicker(upperTicker)
      const displayName = company ? company.name : upperTicker

      setSearching(true)
      setSearchError(null)
      setShowAutocomplete(false)
      setLoadingTicker(upperTicker)
      setLoadingName(displayName)
      setLoadingProgress(0)
      setLoadingStage(0)
      setView('loading')

      // Start fake progress
      clearTimers()
      let prog = 0
      progressTimerRef.current = setInterval(() => {
        prog += Math.random() * 8 + 2
        if (prog > 90) prog = 90
        setLoadingProgress(prog)
      }, 300)

      let stg = 0
      stageTimerRef.current = setInterval(() => {
        stg += 1
        if (stg >= LOADING_STAGES.length) stg = LOADING_STAGES.length - 1
        setLoadingStage(stg)
      }, 1000)

      // Abort previous
      if (abortRef.current) abortRef.current.abort()
      const controller = new AbortController()
      abortRef.current = controller

      try {
        // EDGAR DATA CALL: USER-TRIGGERED
        // Triggered by: user searches for a company on mobile
        const response = await fetch(
          `${apiUrl}/edgar/${upperTicker}?include_quarterly=true`,
          { signal: controller.signal }
        )
        const data = await response.json()

        if (response.ok && data.success) {
          setLoadingProgress(100)
          saveRecentCompany(upperTicker, displayName)
          setRecentCompanies(getRecentCompanies())
          onSearch(upperTicker, data.data)
          // View will transition via useEffect when reportCardData arrives
        } else {
          throw new Error(data.error || data.message || 'Could not load data')
        }
      } catch (err) {
        if (err.name === 'AbortError') return
        clearTimers()
        setSearchError('Could not load company data right now')
        if (addToast) addToast('Could not load company data right now', 'warning')
      } finally {
        setSearching(false)
      }
    },
    [apiUrl, onSearch, addToast, searching]
  )

  const handleSearchSubmit = useCallback(() => {
    const trimmed = query.trim()
    if (!trimmed) return

    // Check if it looks like a ticker
    if (/^[A-Za-z]{1,5}$/.test(trimmed)) {
      doSearch(trimmed)
    } else {
      // Fuzzy match
      const match = COMPANIES.find(
        (c) =>
          c.name.toLowerCase() === trimmed.toLowerCase() ||
          c.ticker.toLowerCase() === trimmed.toLowerCase()
      ) || COMPANIES.find((c) => fuzzyMatch(c.name, trimmed))
      if (match) {
        doSearch(match.ticker)
      } else {
        // Try as ticker anyway
        doSearch(trimmed.replace(/[^A-Za-z]/g, '').slice(0, 5))
      }
    }
  }, [query, doSearch])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSearchSubmit()
    }
  }

  const handleBack = () => {
    setView('search')
    setExpandedCategory(null)
    setCompanyNews([])
    setSearchError(null)
    setQuery('')
  }

  // ─── Key metrics extraction ─────────────────────────────────────────────

  const keyMetrics = useMemo(() => {
    if (!edgarData?.results) return []
    const is = edgarData.results.income_statement
    const bs = edgarData.results.balance_sheet
    const cf = edgarData.results.cash_flow

    const metrics = []

    // Revenue
    const revenue = findFirstMetric(is, [
      ['revenue', 'net revenue', 'total revenue'],
      ['net sales', 'total net sales', 'sales'],
    ])
    const revSeries = toSortedPairs(revenue)
    const latestRev = revSeries.length > 0 ? revSeries[revSeries.length - 1].val : null
    const prevRev = revSeries.length > 1 ? revSeries[revSeries.length - 2].val : null
    const revChange =
      latestRev && prevRev
        ? ((latestRev - prevRev) / Math.abs(prevRev)) * 100
        : null
    metrics.push({
      label: 'Revenue',
      value: formatMoney(latestRev),
      change: revChange,
    })

    // Net Income
    const netIncome = findFirstMetric(is, [['net income', 'net earnings']])
    const niSeries = toSortedPairs(netIncome)
    const latestNI = niSeries.length > 0 ? niSeries[niSeries.length - 1].val : null
    const prevNI = niSeries.length > 1 ? niSeries[niSeries.length - 2].val : null
    const niChange =
      latestNI && prevNI
        ? ((latestNI - prevNI) / Math.abs(prevNI)) * 100
        : null
    metrics.push({
      label: 'Net Income',
      value: formatMoney(latestNI),
      change: niChange,
    })

    // Gross Margin
    const grossProfit = findFirstMetric(is, [['gross profit', 'gross margin']])
    const gpSeries = toSortedPairs(grossProfit)
    if (gpSeries.length > 0 && revSeries.length > 0) {
      const latestGP = gpSeries[gpSeries.length - 1].val
      const grossMargin =
        latestRev && latestRev !== 0
          ? ((latestGP / latestRev) * 100).toFixed(1) + '%'
          : '--'
      metrics.push({ label: 'Gross Margin', value: grossMargin, change: null })
    } else {
      metrics.push({ label: 'Gross Margin', value: '--', change: null })
    }

    // Free Cash Flow
    const operatingCF = findFirstMetric(cf, [
      ['net cash provided by operating', 'cash from operations', 'operating activities'],
    ])
    const capex = findFirstMetric(cf, [
      ['capital expenditures', 'purchases of property', 'capex'],
    ])
    const opSeries = toSortedPairs(operatingCF)
    const capexSeries = toSortedPairs(capex)
    if (opSeries.length > 0 && capexSeries.length > 0) {
      const latestOp = opSeries[opSeries.length - 1].val
      const latestCapex = capexSeries[capexSeries.length - 1].val
      const fcf = latestOp - Math.abs(latestCapex)
      metrics.push({ label: 'Free Cash Flow', value: formatMoney(fcf), change: null })
    } else {
      metrics.push({ label: 'Free Cash Flow', value: '--', change: null })
    }

    // Total Debt
    const longTermDebt = findFirstMetric(bs, [
      ['long-term debt', 'long term debt'],
    ])
    const debtSeries = toSortedPairs(longTermDebt)
    const latestDebt = debtSeries.length > 0 ? debtSeries[debtSeries.length - 1].val : null
    metrics.push({
      label: 'Total Debt',
      value: formatMoney(latestDebt),
      change: null,
    })

    return metrics
  }, [edgarData])

  // ─── Insights ───────────────────────────────────────────────────────────

  const insights = useMemo(() => {
    if (!edgarData?.results) return []
    const { insights: ins } = analyzeFinancialData(edgarData.results)
    // Sort by severity: critical first
    const order = {
      [SEVERITY.CRITICAL]: 0,
      [SEVERITY.WARNING]: 1,
      [SEVERITY.OPPORTUNITY]: 2,
      [SEVERITY.POSITIVE]: 3,
    }
    return ins
      .sort((a, b) => (order[a.severity] ?? 4) - (order[b.severity] ?? 4))
      .slice(0, 4)
  }, [edgarData])

  // ─── RENDER: Search View ───────────────────────────────────────────────

  function renderSearchView() {
    return (
      <motion.div
        key="search-view"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.2 }}
        style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
      >
        {/* Merlin offline banner */}
        {merlinOffline && (
          <div style={{
            padding: '0.625rem 0.75rem',
            borderRadius: '10px',
            background: 'rgba(245, 158, 11, 0.1)',
            border: '1px solid rgba(245, 158, 11, 0.25)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}>
            <span style={{ fontSize: '1rem' }}>{'\u{1FA84}'}</span>
            <span style={{ fontSize: '0.8rem', color: '#fbbf24' }}>
              Merlin is recharging {'\u2014'} search below
            </span>
          </div>
        )}

        {/* Search Input */}
        <div style={{ position: 'relative' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              border: merlinOffline ? '1px solid rgba(245, 158, 11, 0.5)' : '1px solid var(--border-secondary)',
              borderRadius: '12px',
              overflow: 'hidden',
              boxShadow: merlinOffline ? '0 0 12px rgba(245, 158, 11, 0.3)' : 'none',
              background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
            }}
          >
            <div
              style={{
                paddingLeft: '12px',
                display: 'flex',
                alignItems: 'center',
                color: 'var(--text-muted)',
              }}
            >
              <Search style={{ width: 18, height: 18 }} />
            </div>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setShowAutocomplete(e.target.value.trim().length > 0)
              }}
              onFocus={() => {
                if (query.trim().length > 0) setShowAutocomplete(true)
              }}
              onBlur={() => {
                // Delay to allow tap on autocomplete
                setTimeout(() => setShowAutocomplete(false), 200)
              }}
              onKeyDown={handleKeyDown}
              placeholder="Search a company..."
              style={{
                flex: 1,
                border: 'none',
                outline: 'none',
                background: 'transparent',
                padding: '12px',
                fontSize: '16px',
                color: 'var(--text-primary)',
                minHeight: '44px',
                WebkitAppearance: 'none',
              }}
            />
            <button
              onClick={handleSearchSubmit}
              disabled={!query.trim() || searching}
              style={{
                padding: '0 16px',
                minHeight: '44px',
                border: 'none',
                background:
                  !query.trim() || searching
                    ? isDark
                      ? 'rgba(245,158,11,0.3)'
                      : 'rgba(245,158,11,0.4)'
                    : '#f59e0b',
                color: 'white',
                fontWeight: 700,
                fontSize: '15px',
                cursor: !query.trim() || searching ? 'default' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                touchAction: 'manipulation',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {searching ? (
                <Loader2 style={{ width: 18, height: 18, animation: 'spin 1s linear infinite' }} />
              ) : (
                'Go'
              )}
            </button>
          </div>

          {/* Autocomplete Dropdown */}
          <AnimatePresence>
            {showAutocomplete && autocompleteResults.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  marginTop: '4px',
                  borderRadius: '12px',
                  border: '1px solid var(--border-secondary)',
                  background: isDark ? 'rgba(15, 25, 45, 0.98)' : 'rgba(255, 255, 255, 0.98)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  zIndex: 20,
                  overflow: 'hidden',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
                }}
              >
                {autocompleteResults.map((company) => (
                  <button
                    key={company.ticker}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setQuery(company.name)
                      setShowAutocomplete(false)
                      doSearch(company.ticker)
                    }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '10px 12px',
                      border: 'none',
                      borderBottom: '1px solid var(--border-secondary)',
                      background: 'transparent',
                      cursor: 'pointer',
                      textAlign: 'left',
                      minHeight: '44px',
                      touchAction: 'manipulation',
                      WebkitTapHighlightColor: 'transparent',
                    }}
                  >
                    <CompanyLogo domain={company.domain} name={company.name} size={32} />
                    <span
                      style={{
                        flex: 1,
                        fontSize: '15px',
                        color: 'var(--text-primary)',
                        fontWeight: 500,
                      }}
                    >
                      {company.name}
                    </span>
                    <span
                      style={{
                        fontSize: '12px',
                        fontWeight: 700,
                        color: '#f59e0b',
                        background: 'rgba(245,158,11,0.12)',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        letterSpacing: '0.04em',
                      }}
                    >
                      {company.ticker}
                    </span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Popular Ticker Chips */}
        <div>
          <div
            style={{
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--text-muted)',
              marginBottom: '8px',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            Popular
          </div>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '8px',
            }}
          >
            {POPULAR_TICKERS.map((ticker) => (
              <button
                key={ticker}
                onClick={() => {
                  setQuery(ticker)
                  doSearch(ticker)
                }}
                disabled={searching}
                style={{
                  padding: '8px 16px',
                  minHeight: '44px',
                  border: '1.5px solid rgba(245,158,11,0.35)',
                  borderRadius: '22px',
                  background: 'transparent',
                  color: '#f59e0b',
                  fontWeight: 700,
                  fontSize: '14px',
                  cursor: searching ? 'default' : 'pointer',
                  letterSpacing: '0.04em',
                  touchAction: 'manipulation',
                  WebkitTapHighlightColor: 'transparent',
                  transition: 'background 0.15s, border-color 0.15s',
                }}
              >
                {ticker}
              </button>
            ))}
          </div>
        </div>

        {/* Recent Companies */}
        {recentCompanies.length > 0 && (
          <div>
            <div
              style={{
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--text-muted)',
                marginBottom: '8px',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Clock style={{ width: 14, height: 14 }} />
              Recent
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                border: '1px solid var(--border-secondary)',
                borderRadius: '12px',
                overflow: 'hidden',
              }}
            >
              {recentCompanies.slice(0, 5).map((recent, idx) => {
                const company = findCompanyByTicker(recent.ticker)
                return (
                  <button
                    key={recent.ticker}
                    onClick={() => {
                      setQuery(recent.ticker)
                      doSearch(recent.ticker)
                    }}
                    disabled={searching}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '10px 12px',
                      border: 'none',
                      borderBottom:
                        idx < Math.min(recentCompanies.length, 5) - 1
                          ? '1px solid var(--border-secondary)'
                          : 'none',
                      background: 'transparent',
                      cursor: searching ? 'default' : 'pointer',
                      textAlign: 'left',
                      minHeight: '44px',
                      touchAction: 'manipulation',
                      WebkitTapHighlightColor: 'transparent',
                      width: '100%',
                    }}
                  >
                    <CompanyLogo
                      domain={company?.domain || `${recent.ticker.toLowerCase()}.com`}
                      name={recent.name || recent.ticker}
                      size={32}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: '15px',
                          fontWeight: 500,
                          color: 'var(--text-primary)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {recent.name || recent.ticker}
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: '12px',
                        fontWeight: 700,
                        color: 'var(--text-muted)',
                        background: 'var(--bg-hover)',
                        padding: '2px 8px',
                        borderRadius: '6px',
                      }}
                    >
                      {recent.ticker}
                    </span>
                    <ChevronRight
                      style={{ width: 16, height: 16, color: 'var(--text-dim)', flexShrink: 0 }}
                    />
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </motion.div>
    )
  }

  // ─── RENDER: Loading View ──────────────────────────────────────────────

  function renderLoadingView() {
    const company = findCompanyByTicker(loadingTicker)

    return (
      <motion.div
        key="loading-view"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.2 }}
        style={{
          padding: '2rem 1rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1.5rem',
        }}
      >
        {/* Company info */}
        <div style={{ textAlign: 'center' }}>
          {company && (
            <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'center' }}>
              <CompanyLogo domain={company.domain} name={company.name} size={56} />
            </div>
          )}
          <div
            style={{
              fontSize: '20px',
              fontWeight: 700,
              color: 'var(--text-primary)',
              marginBottom: '4px',
            }}
          >
            {loadingName}
          </div>
          <div
            style={{
              fontSize: '14px',
              fontWeight: 700,
              color: '#f59e0b',
              letterSpacing: '0.06em',
            }}
          >
            {loadingTicker}
          </div>
        </div>

        {/* Progress bar */}
        <div
          style={{
            width: '100%',
            maxWidth: '280px',
            height: '8px',
            borderRadius: '4px',
            background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
            overflow: 'hidden',
          }}
        >
          <motion.div
            animate={{ width: `${loadingProgress}%` }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            style={{
              height: '100%',
              borderRadius: '4px',
              background: 'linear-gradient(90deg, #f59e0b, #d97706)',
            }}
          />
        </div>

        {/* Stage message */}
        <AnimatePresence mode="wait">
          <motion.div
            key={loadingStage}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            style={{
              fontSize: '14px',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Loader2
              style={{ width: 16, height: 16, animation: 'spin 1s linear infinite', color: '#f59e0b' }}
            />
            {LOADING_STAGES[loadingStage] || LOADING_STAGES[LOADING_STAGES.length - 1]}
          </motion.div>
        </AnimatePresence>

        {/* Error state */}
        {searchError && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{
              textAlign: 'center',
              padding: '1rem',
              border: '1px solid rgba(245,158,11,0.3)',
              borderRadius: '12px',
              background: 'rgba(245,158,11,0.08)',
            }}
          >
            <div style={{ fontSize: '15px', color: '#fbbf24', marginBottom: '12px' }}>
              {searchError}
            </div>
            <button
              onClick={() => {
                setSearchError(null)
                setView('search')
              }}
              style={{
                padding: '10px 24px',
                minHeight: '44px',
                border: '1px solid rgba(245,158,11,0.3)',
                borderRadius: '10px',
                background: 'transparent',
                color: '#fbbf24',
                fontWeight: 600,
                fontSize: '15px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                touchAction: 'manipulation',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              <RotateCcw style={{ width: 16, height: 16 }} />
              Try Again
            </button>
          </motion.div>
        )}
      </motion.div>
    )
  }

  // ─── RENDER: Scorecard View ────────────────────────────────────────────

  function renderScorecardView() {
    const company = findCompanyByTicker(edgarData?.ticker)
    const companyName =
      reportCardData?.company_name || company?.name || edgarData?.ticker || ''
    const ticker = edgarData?.ticker || ''

    return (
      <motion.div
        key="scorecard-view"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.25 }}
        style={{ display: 'flex', flexDirection: 'column', gap: '0' }}
      >
        {/* Top Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '10px 1rem',
            borderBottom: '1px solid var(--border-secondary)',
            gap: '8px',
            minHeight: '44px',
          }}
        >
          <button
            onClick={handleBack}
            style={{
              width: '36px',
              height: '36px',
              minHeight: '44px',
              border: 'none',
              background: 'transparent',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '10px',
              touchAction: 'manipulation',
              WebkitTapHighlightColor: 'transparent',
              padding: 0,
              flexShrink: 0,
            }}
          >
            <ArrowLeft style={{ width: 20, height: 20 }} />
          </button>
          <div
            style={{
              flex: 1,
              textAlign: 'center',
              overflow: 'hidden',
              minWidth: 0,
            }}
          >
            <div
              style={{
                fontSize: '16px',
                fontWeight: 700,
                color: 'var(--text-primary)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {companyName}
            </div>
            <div
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: '#f59e0b',
                letterSpacing: '0.06em',
              }}
            >
              {ticker}
            </div>
          </div>
          <button
            onClick={() => {
              if (addToast) addToast('Coming soon', 'info')
            }}
            style={{
              width: '36px',
              height: '36px',
              minHeight: '44px',
              border: 'none',
              background: 'transparent',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '10px',
              touchAction: 'manipulation',
              WebkitTapHighlightColor: 'transparent',
              padding: 0,
              flexShrink: 0,
            }}
          >
            <Share2 style={{ width: 18, height: 18 }} />
          </button>
        </div>

        <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Overall Grade Card */}
          {reportCardLoading && !reportCardData ? (
            <div
              className="card"
              style={{
                padding: '2rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <Loader2
                style={{
                  width: 32,
                  height: 32,
                  color: '#f59e0b',
                  animation: 'spin 1s linear infinite',
                }}
              />
              <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                Generating scorecard...
              </div>
            </div>
          ) : reportCardData ? (
            <div
              className="card"
              style={{
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                {/* Grade circle */}
                <div
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '16px',
                    background: reportCardData.grade_color
                      ? `${reportCardData.grade_color}22`
                      : 'rgba(245,158,11,0.12)',
                    border: `2px solid ${reportCardData.grade_color || '#f59e0b'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <span
                    style={{
                      fontSize: '28px',
                      fontWeight: 800,
                      color: reportCardData.grade_color || '#f59e0b',
                      lineHeight: 1,
                    }}
                  >
                    {reportCardData.grade || '--'}
                  </span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: '16px',
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                      marginBottom: '4px',
                    }}
                  >
                    {companyName}
                  </div>
                  <div
                    style={{
                      fontSize: '13px',
                      color: 'var(--text-muted)',
                      lineHeight: 1.4,
                    }}
                  >
                    {reportCardData.summary || 'Financial scorecard analysis'}
                  </div>
                </div>
              </div>

              {/* Progress bar: passed/total */}
              <div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '6px',
                  }}
                >
                  <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                    {reportCardData.passed} of {reportCardData.total} checks passing
                    {reportCardData.periods_checked
                      ? ` across ${reportCardData.periods_checked} years`
                      : ''}
                  </span>
                  <span
                    style={{
                      fontSize: '13px',
                      fontWeight: 700,
                      color: reportCardData.grade_color || '#f59e0b',
                    }}
                  >
                    {reportCardData.total > 0
                      ? Math.round((reportCardData.passed / reportCardData.total) * 100)
                      : 0}
                    %
                  </span>
                </div>
                <div
                  style={{
                    height: '6px',
                    borderRadius: '3px',
                    background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                    overflow: 'hidden',
                  }}
                >
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{
                      width: `${
                        reportCardData.total > 0
                          ? (reportCardData.passed / reportCardData.total) * 100
                          : 0
                      }%`,
                    }}
                    transition={{ duration: 0.6, ease: 'easeOut', delay: 0.2 }}
                    style={{
                      height: '100%',
                      borderRadius: '3px',
                      background: reportCardData.grade_color || '#f59e0b',
                    }}
                  />
                </div>
              </div>
            </div>
          ) : null}

          {/* Category Score Cards */}
          {reportCardData?.categories && (
            <div>
              <div
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  marginBottom: '10px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                Categories
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '8px',
                }}
              >
                {Object.entries(reportCardData.categories).map(([key, cat]) => {
                  const isExpanded = expandedCategory === key

                  return (
                    <div key={key} style={{ gridColumn: isExpanded ? '1 / -1' : undefined }}>
                      <button
                        onClick={() => setExpandedCategory(isExpanded ? null : key)}
                        className="card"
                        style={{
                          width: '100%',
                          padding: '10px 8px',
                          border: isExpanded
                            ? `1.5px solid ${cat.grade_color || 'var(--border-secondary)'}`
                            : '1px solid var(--border-secondary)',
                          cursor: 'pointer',
                          textAlign: 'center',
                          minHeight: '44px',
                          touchAction: 'manipulation',
                          WebkitTapHighlightColor: 'transparent',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '4px',
                          background: isExpanded
                            ? isDark
                              ? 'rgba(255,255,255,0.04)'
                              : 'rgba(0,0,0,0.02)'
                            : undefined,
                          borderRadius: isExpanded ? '12px 12px 0 0' : '12px',
                          transition: 'border-color 0.15s, background 0.15s',
                        }}
                      >
                        <div style={{ fontSize: '18px', lineHeight: 1 }}>{cat.emoji}</div>
                        <div
                          style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            color: 'var(--text-muted)',
                            lineHeight: 1.2,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            maxWidth: '100%',
                          }}
                        >
                          {cat.label}
                        </div>
                        <div
                          style={{
                            fontSize: '20px',
                            fontWeight: 800,
                            color: cat.grade_color || 'var(--text-primary)',
                            lineHeight: 1,
                          }}
                        >
                          {cat.grade || '--'}
                        </div>
                        <div
                          style={{
                            fontSize: '11px',
                            color: 'var(--text-dim)',
                          }}
                        >
                          {cat.passed}/{cat.total}
                        </div>
                        {/* Mini progress bar */}
                        <div
                          style={{
                            width: '100%',
                            height: '3px',
                            borderRadius: '2px',
                            background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
                            overflow: 'hidden',
                            marginTop: '2px',
                          }}
                        >
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{
                              width: `${cat.total > 0 ? (cat.passed / cat.total) * 100 : 0}%`,
                            }}
                            transition={{ duration: 0.5, ease: 'easeOut', delay: 0.3 }}
                            style={{
                              height: '100%',
                              borderRadius: '2px',
                              background: cat.grade_color || '#f59e0b',
                            }}
                          />
                        </div>
                      </button>

                      {/* Expanded checks */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.25 }}
                            style={{
                              overflow: 'hidden',
                              border: `1px solid ${cat.grade_color || 'var(--border-secondary)'}`,
                              borderTop: 'none',
                              borderRadius: '0 0 12px 12px',
                              background: isDark
                                ? 'rgba(255,255,255,0.02)'
                                : 'rgba(0,0,0,0.01)',
                            }}
                          >
                            <div style={{ padding: '8px' }}>
                              {cat.summary && (
                                <div
                                  style={{
                                    fontSize: '13px',
                                    color: 'var(--text-muted)',
                                    padding: '6px 8px',
                                    marginBottom: '6px',
                                    lineHeight: 1.4,
                                  }}
                                >
                                  {cat.summary}
                                </div>
                              )}
                              {(reportCardData.checks || [])
                                .filter(
                                  (check) =>
                                    check.category === key ||
                                    check.category === cat.label?.toLowerCase()
                                )
                                .map((check, ci) => {
                                  const CheckIcon =
                                    check.passed === true
                                      ? CheckCircle2
                                      : check.passed === false
                                      ? AlertTriangle
                                      : Minus
                                  const iconColor =
                                    check.passed === true
                                      ? '#10b981'
                                      : check.passed === false
                                      ? '#f59e0b'
                                      : 'var(--text-dim)'

                                  return (
                                    <div
                                      key={ci}
                                      style={{
                                        display: 'flex',
                                        alignItems: 'flex-start',
                                        gap: '8px',
                                        padding: '8px',
                                        borderRadius: '8px',
                                      }}
                                    >
                                      <CheckIcon
                                        style={{
                                          width: 16,
                                          height: 16,
                                          color: iconColor,
                                          flexShrink: 0,
                                          marginTop: '1px',
                                        }}
                                      />
                                      <div style={{ flex: 1, minWidth: 0 }}>
                                        <div
                                          style={{
                                            fontSize: '14px',
                                            fontWeight: 600,
                                            color: 'var(--text-primary)',
                                            lineHeight: 1.3,
                                          }}
                                        >
                                          {check.name}
                                        </div>
                                        {check.description && (
                                          <div
                                            style={{
                                              fontSize: '12px',
                                              color: 'var(--text-dim)',
                                              lineHeight: 1.3,
                                              marginTop: '2px',
                                            }}
                                          >
                                            {check.description}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )
                                })}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Key Metrics */}
          {keyMetrics.length > 0 && keyMetrics.some((m) => m.value !== '--') && (
            <div>
              <div
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  marginBottom: '10px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                Key Metrics
              </div>
              <div
                className="card"
                style={{
                  padding: '4px 0',
                  overflow: 'hidden',
                }}
              >
                {keyMetrics.map((metric, idx) => (
                  <div
                    key={metric.label}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      borderBottom:
                        idx < keyMetrics.length - 1
                          ? '1px solid var(--border-secondary)'
                          : 'none',
                      minHeight: '44px',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '14px',
                        color: 'var(--text-muted)',
                        fontWeight: 500,
                      }}
                    >
                      {metric.label}
                    </span>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '15px',
                          fontWeight: 700,
                          color: 'var(--text-primary)',
                        }}
                      >
                        {metric.value}
                      </span>
                      {metric.change !== null && metric.change !== undefined && (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '2px',
                            fontSize: '12px',
                            fontWeight: 700,
                            color: metric.change >= 0 ? '#10b981' : '#ef4444',
                            background:
                              metric.change >= 0
                                ? 'rgba(16,185,129,0.1)'
                                : 'rgba(239,68,68,0.1)',
                            padding: '2px 6px',
                            borderRadius: '6px',
                          }}
                        >
                          {metric.change >= 0 ? (
                            <TrendingUp style={{ width: 12, height: 12 }} />
                          ) : (
                            <TrendingDown style={{ width: 12, height: 12 }} />
                          )}
                          {metric.change >= 0 ? '+' : ''}
                          {metric.change.toFixed(1)}%
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Key Takeaways */}
          {insights.length > 0 && (
            <div>
              <div
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  marginBottom: '10px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                Key Takeaways
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {insights.map((insight, idx) => {
                  const style = getSeverityStyle(insight.severity)
                  return (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.2, delay: idx * 0.08 }}
                      className="card"
                      style={{
                        padding: '12px 14px',
                        borderLeft: `3px solid ${style.text}`,
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '10px',
                      }}
                    >
                      <div
                        style={{
                          width: '10px',
                          height: '10px',
                          borderRadius: '50%',
                          background: style.text,
                          flexShrink: 0,
                          marginTop: '4px',
                        }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: '14px',
                            fontWeight: 700,
                            color: 'var(--text-primary)',
                            lineHeight: 1.3,
                            marginBottom: '2px',
                          }}
                        >
                          {insight.title}
                        </div>
                        <div
                          style={{
                            fontSize: '13px',
                            color: 'var(--text-muted)',
                            lineHeight: 1.4,
                          }}
                        >
                          {insight.description.length > 120
                            ? insight.description.slice(0, 120) + '...'
                            : insight.description}
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Company News */}
          {companyNews.length > 0 && (
            <div>
              <div
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  marginBottom: '10px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                Recent News
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {companyNews.map((article, idx) => (
                  <a
                    key={idx}
                    href={article.url || article.link || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="card"
                    style={{
                      padding: '12px 14px',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '10px',
                      textDecoration: 'none',
                      minHeight: '44px',
                      cursor: 'pointer',
                      touchAction: 'manipulation',
                      WebkitTapHighlightColor: 'transparent',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: '14px',
                          fontWeight: 600,
                          color: 'var(--text-primary)',
                          lineHeight: 1.3,
                          marginBottom: '4px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                        }}
                      >
                        {article.headline || article.title || 'Untitled'}
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          fontSize: '12px',
                          color: 'var(--text-dim)',
                        }}
                      >
                        <span>{article.source || ''}</span>
                        {(article.datetime || article.published_at) && (
                          <>
                            <span style={{ opacity: 0.5 }}>&#183;</span>
                            <span>
                              {article.datetime
                                ? typeof article.datetime === 'number'
                                  ? timeAgo(new Date(article.datetime * 1000).toISOString())
                                  : timeAgo(article.datetime)
                                : timeAgo(article.published_at)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <ExternalLink
                      style={{
                        width: 14,
                        height: 14,
                        color: 'var(--text-dim)',
                        flexShrink: 0,
                        marginTop: '2px',
                      }}
                    />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Bottom spacer for safe area / nav bar */}
          <div style={{ height: '80px' }} />
        </div>
      </motion.div>
    )
  }

  // ─── Main Render ────────────────────────────────────────────────────────

  return (
    <div
      style={{
        height: '100%',
        overflowY: 'auto',
        overflowX: 'hidden',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      {/* Spin animation for Loader2 */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

      <AnimatePresence mode="wait">
        {view === 'search' && renderSearchView()}
        {view === 'loading' && renderLoadingView()}
        {view === 'scorecard' && renderScorecardView()}
      </AnimatePresence>
    </div>
  )
}
