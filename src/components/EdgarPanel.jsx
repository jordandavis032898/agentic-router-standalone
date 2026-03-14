import { useState, useMemo, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Building2,
  Search,
  Loader2,
  FileText,
  Calendar,
  ExternalLink,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  DollarSign,
  PieChart,
  BarChart3,
  ChevronDown,
  ChevronRight,
  Clock,
  Layers,
  ArrowDown,
  Sparkles
} from 'lucide-react'
import { COMPANIES, CATEGORIES, CompanyLogo, fuzzyMatch } from '../utils/companies.jsx'

// ─── Financial Display Components (unchanged) ─────────────────────────────────

const getDisplayValue = (rawValue) => {
  if (rawValue === null || rawValue === undefined || rawValue === '') return '—'
  // Unwrap XBRL metadata objects: {value: "14,264", meta: {...}}
  // Keep unwrapping .value in case of nested wrappers
  if (typeof rawValue === 'object' && rawValue !== null) {
    let v = rawValue
    while (typeof v === 'object' && v !== null && !Array.isArray(v) && v.value !== undefined) {
      v = v.value
    }
    // If we extracted a primitive, use it
    if (typeof v === 'string') return v || '—'
    if (typeof v === 'number') return String(v)
    // Still an object — try other common numeric property names
    if (typeof rawValue.amount === 'number') return String(rawValue.amount)
    if (typeof rawValue.raw === 'number') return String(rawValue.raw)
    if (typeof rawValue.raw === 'string') return rawValue.raw || '—'
    // Never return [object Object]
    return '—'
  }
  if (typeof rawValue === 'number') return String(rawValue)
  return String(rawValue) || '—'
}

// ─── Cell Annotation Helper ──────────────────────────────────────────────────

function getCellAnnotation(label, values, period, periods) {
  const lowerLabel = label.toLowerCase()
  const displayVal = getDisplayValue(values[period])
  const isNegative = displayVal.startsWith('-') || displayVal.startsWith('(')

  // Parse numeric value
  let numVal = null
  let raw = values[period]
  while (typeof raw === 'object' && raw !== null && !Array.isArray(raw) && raw.value !== undefined) raw = raw.value
  if (typeof raw === 'number') numVal = raw
  else if (typeof raw === 'string') {
    const cleaned = raw.replace(/[$,\s%]/g, '').replace(/\((.+)\)/, '-$1')
    numVal = parseFloat(cleaned)
    if (isNaN(numVal)) numVal = null
  }

  if (numVal === null) return null

  // Check YoY change
  const periodIdx = periods.indexOf(period)
  if (periodIdx > 0) {
    const prevPeriod = periods[periodIdx - 1]
    let prevVal = values[prevPeriod]
    while (typeof prevVal === 'object' && prevVal !== null && !Array.isArray(prevVal) && prevVal.value !== undefined) prevVal = prevVal.value
    if (typeof prevVal === 'string') { prevVal = parseFloat(prevVal.replace(/[$,\s%]/g, '').replace(/\((.+)\)/, '-$1')) }
    if (typeof prevVal === 'number' && !isNaN(prevVal) && prevVal !== 0) {
      const yoyChange = (numVal - prevVal) / Math.abs(prevVal)

      // Revenue/sales declining
      if (/\b(revenue|net sales|total revenue|total net sales)\b/i.test(lowerLabel) && yoyChange < -0.1) {
        return { bg: 'rgba(239, 68, 68, 0.08)', tooltip: `\u{1F4C9} Declined ${Math.abs(Math.round(yoyChange * 100))}% YoY` }
      }
      // Revenue/sales surging
      if (/\b(revenue|net sales|total revenue|total net sales)\b/i.test(lowerLabel) && yoyChange > 0.3) {
        return { bg: 'rgba(59, 130, 246, 0.08)', tooltip: `\u{1F4C8} Surged ${Math.round(yoyChange * 100)}% YoY` }
      }
      // Big YoY swing on any metric
      if (Math.abs(yoyChange) > 0.5) {
        return { bg: 'rgba(245, 158, 11, 0.08)', tooltip: `\u26A0\uFE0F ${yoyChange > 0 ? 'Up' : 'Down'} ${Math.abs(Math.round(yoyChange * 100))}% YoY \u2014 unusual swing` }
      }
    }
  }

  // Negative values where positive is expected
  if (isNegative) {
    if (/\b(net income|earnings|gross profit|operating income)\b/i.test(lowerLabel)) {
      return { bg: 'rgba(239, 68, 68, 0.08)', tooltip: `\u{1F534} Negative ${label} \u2014 worth investigating` }
    }
    if (/\b(cash.*operating|operating.*cash)\b/i.test(lowerLabel)) {
      return { bg: 'rgba(239, 68, 68, 0.1)', tooltip: `\u{1F534} Negative operating cash flow \u2014 cash burn risk` }
    }
  }

  return null
}

function FinancialSection({ section, periods, isExpanded, onToggle }) {
  const items = section.items || []
  const sectionName = section.section || 'General'
  if (items.length === 0) return null

  return (
    <div style={{
      marginBottom: '0.75rem',
      borderRadius: '10px',
      background: 'rgba(15, 23, 42, 0.5)',
      border: '1px solid rgba(100, 116, 139, 0.15)',
      overflow: 'hidden',
    }}>
      <button
        onClick={onToggle}
        style={{
          width: '100%',
          padding: '0.75rem 1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(59, 130, 246, 0.08)',
          border: 'none',
          borderBottom: isExpanded ? '1px solid rgba(100, 116, 139, 0.15)' : 'none',
          cursor: 'pointer',
          color: 'white',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Layers style={{ width: '14px', height: '14px', color: '#60a5fa' }} />
          <span style={{ fontWeight: 600, color: '#93c5fd', fontSize: '0.875rem' }}>{sectionName}</span>
          <span style={{ fontSize: '0.7rem', color: '#64748b' }}>({items.length} items)</span>
        </div>
        {isExpanded ?
          <ChevronDown style={{ width: '16px', height: '16px', color: '#64748b' }} /> :
          <ChevronRight style={{ width: '16px', height: '16px', color: '#64748b' }} />
        }
      </button>
      {isExpanded && (
        <div style={{ padding: '0.5rem', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '0.5rem', borderBottom: '1px solid rgba(100, 116, 139, 0.2)', color: '#94a3b8', fontWeight: 500, width: '45%' }}>
                  Line Item
                </th>
                {periods.map((period, idx) => (
                  <th key={idx} style={{ textAlign: 'right', padding: '0.5rem', borderBottom: '1px solid rgba(100, 116, 139, 0.2)', color: '#94a3b8', fontWeight: 500, whiteSpace: 'nowrap' }}>
                    {period}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => {
                const values = item.values || {}
                const label = item.label || ''
                return (
                  <tr key={idx} style={{ background: idx % 2 === 0 ? 'transparent' : 'rgba(10, 22, 40, 0.2)' }}>
                    <td style={{ padding: '0.4rem 0.5rem', borderBottom: '1px solid rgba(100, 116, 139, 0.08)', color: '#e2e8f0', fontSize: '0.75rem' }} title={label}>
                      {label}
                    </td>
                    {periods.map((period, pIdx) => {
                      const displayVal = getDisplayValue(values[period])
                      const isNegative = displayVal.startsWith('-') || displayVal.startsWith('(')
                      const annotation = getCellAnnotation(label, values, period, periods)
                      return (
                        <td
                          key={pIdx}
                          title={annotation?.tooltip || ''}
                          style={{
                            textAlign: 'right',
                            padding: '0.4rem 0.5rem',
                            borderBottom: '1px solid rgba(100, 116, 139, 0.08)',
                            color: isNegative ? '#f87171' : '#e2e8f0',
                            fontFamily: 'JetBrains Mono, monospace',
                            fontSize: '0.7rem',
                            whiteSpace: 'nowrap',
                            background: annotation?.bg || 'transparent',
                            cursor: annotation ? 'help' : 'default',
                            borderRadius: annotation ? '3px' : 0,
                          }}
                        >
                          {displayVal}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function FilingCard({ filing, icon: Icon, iconColor, index, expandedSections, toggleSection, parentKey }) {
  const filingKey = `${parentKey}-filing-${index}`
  const isFilingExpanded = expandedSections[filingKey] !== false
  const filingYear = filing.filing_year || `Filing ${index + 1}`
  const filingDate = filing.filing_date || ''
  const periods = filing.periods || []
  const sections = filing.sections || []

  return (
    <div style={{
      marginBottom: '1rem',
      borderRadius: '12px',
      background: 'rgba(10, 22, 40, 0.5)',
      border: '1px solid rgba(100, 116, 139, 0.25)',
      overflow: 'hidden',
    }}>
      <button
        onClick={() => toggleSection(filingKey)}
        style={{
          width: '100%',
          padding: '1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: `rgba(${iconColor}, 0.1)`,
          border: 'none',
          cursor: 'pointer',
          color: 'white',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: `rgba(${iconColor}, 0.25)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Calendar style={{ width: '18px', height: '18px', color: `rgb(${iconColor})` }} />
          </div>
          <div style={{ textAlign: 'left' }}>
            <span style={{ fontWeight: 600, fontSize: '1.1rem', display: 'block', color: 'white' }}>
              FY {filingYear}
            </span>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
              {filingDate ? `Filed: ${filingDate}` : ''}
              {sections.length > 0 && ` • ${sections.length} sections`}
              {periods.length > 0 && ` • ${periods.length} periods`}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {sections.length > 0 && (
            <span style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem', background: `rgba(${iconColor}, 0.2)`, borderRadius: '4px', color: `rgb(${iconColor})` }}>
              {sections.reduce((acc, s) => acc + (s.items?.length || 0), 0)} items
            </span>
          )}
          {isFilingExpanded ?
            <ChevronDown style={{ width: '20px', height: '20px', color: '#94a3b8' }} /> :
            <ChevronRight style={{ width: '20px', height: '20px', color: '#94a3b8' }} />
          }
        </div>
      </button>
      {isFilingExpanded && (
        <div style={{ padding: '1rem' }}>
          {sections.length > 0 ? (
            sections.map((section, sIdx) => {
              const sectionKey = `${filingKey}-section-${sIdx}`
              const isSectionExpanded = expandedSections[sectionKey] !== undefined ? expandedSections[sectionKey] : sIdx === 0
              return (
                <FinancialSection
                  key={sIdx}
                  section={section}
                  periods={periods}
                  isExpanded={isSectionExpanded}
                  onToggle={() => toggleSection(sectionKey)}
                />
              )
            })
          ) : (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b', fontSize: '0.875rem' }}>
              <FileText style={{ width: '32px', height: '32px', marginBottom: '0.5rem', opacity: 0.5 }} />
              <p>No detailed sections available for this filing</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function StatementDisplay({ title, icon: Icon, iconColor, data, expandedSections, toggleSection, statementKey }) {
  const filings = data?.sections || []

  if (!filings || filings.length === 0) {
    return (
      <div style={{
        padding: '3rem',
        borderRadius: '16px',
        background: 'rgba(10, 22, 40, 0.4)',
        border: '1px solid rgba(100, 116, 139, 0.3)',
        textAlign: 'center',
      }}>
        <div style={{
          width: '56px', height: '56px', borderRadius: '14px',
          background: `rgba(${iconColor}, 0.15)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 1rem',
        }}>
          <Icon style={{ width: '28px', height: '28px', color: `rgb(${iconColor})` }} />
        </div>
        <h4 style={{ fontWeight: 600, color: 'white', marginBottom: '0.5rem' }}>{title}</h4>
        <p style={{ fontSize: '0.875rem', color: '#64748b' }}>No data available for this statement</p>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', padding: '0.5rem 0' }}>
        <div style={{
          width: '40px', height: '40px', borderRadius: '12px',
          background: `rgba(${iconColor}, 0.2)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon style={{ width: '20px', height: '20px', color: `rgb(${iconColor})` }} />
        </div>
        <div>
          <h4 style={{ fontWeight: 600, color: 'white', fontFamily: 'Outfit, sans-serif' }}>{title}</h4>
          <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{filings.length} fiscal year(s) of data</p>
        </div>
      </div>
      {filings.map((filing, fIdx) => (
        <FilingCard
          key={fIdx}
          filing={filing}
          icon={Icon}
          iconColor={iconColor}
          index={fIdx}
          expandedSections={expandedSections}
          toggleSection={toggleSection}
          parentKey={statementKey}
        />
      ))}
    </div>
  )
}

// ─── Company Card ─────────────────────────────────────────────────────────────

function CompanyCard({ company, onClick, isLoading, loadingTicker }) {
  const isThisLoading = isLoading && loadingTicker === company.ticker

  return (
    <motion.button
      whileHover={{ scale: 1.03, y: -2 }}
      whileTap={{ scale: 0.97 }}
      onClick={() => onClick(company)}
      disabled={isLoading}
      className="company-card"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.875rem',
        padding: '0.875rem 1rem',
        borderRadius: '14px',
        border: '1px solid rgba(100, 116, 139, 0.2)',
        background: isThisLoading
          ? 'rgba(59, 130, 246, 0.15)'
          : 'rgba(10, 22, 40, 0.5)',
        cursor: isLoading ? 'not-allowed' : 'pointer',
        opacity: isLoading && !isThisLoading ? 0.5 : 1,
        width: '100%',
        textAlign: 'left',
        color: 'white',
        transition: 'background 0.2s, border-color 0.2s',
        touchAction: 'manipulation',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      {isThisLoading ? (
        <Loader2 style={{ width: 48, height: 48, color: '#60a5fa', animation: 'spin 1s linear infinite', flexShrink: 0 }} />
      ) : (
        <CompanyLogo domain={company.domain} name={company.name} size={48} />
      )}
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{
          fontFamily: 'Outfit, sans-serif',
          fontWeight: 700,
          fontSize: '1rem',
          color: 'white',
          lineHeight: 1.2,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {company.name}
        </div>
        <div style={{
          fontSize: '0.7rem',
          fontWeight: 600,
          color: '#60a5fa',
          fontFamily: 'JetBrains Mono, monospace',
          letterSpacing: '0.05em',
          marginTop: '0.125rem',
        }}>
          {company.ticker}
        </div>
        <div style={{
          fontSize: '0.75rem',
          color: '#94a3b8',
          marginTop: '0.25rem',
          lineHeight: 1.3,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {company.desc}
        </div>
      </div>
    </motion.button>
  )
}

// ─── Rich Loading Experience ──────────────────────────────────────────────────

const LOADING_STAGES = [
  { label: 'Finding filings on SEC EDGAR...', emoji: '\u{1F50D}', duration: 8 },
  { label: 'Downloading annual reports...', emoji: '\u{1F4C4}', duration: 12 },
  { label: 'Extracting financial tables...', emoji: '\u{1F9EE}', duration: 15 },
  { label: 'Linking financial statements...', emoji: '\u{1F517}', duration: 8 },
  { label: 'Building your model...', emoji: '\u2728', duration: 7 },
]

function LoadingExperience({ companyName, ticker, includeQuarterly }) {
  const [currentStage, setCurrentStage] = useState(0)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    // Simulate progress through stages
    const totalDuration = LOADING_STAGES.reduce((a, s) => a + s.duration, 0)
    let elapsed = 0
    const interval = setInterval(() => {
      elapsed += 0.5
      const pct = Math.min((elapsed / totalDuration) * 100, 95)
      setProgress(pct)

      // Calculate current stage
      let acc = 0
      for (let i = 0; i < LOADING_STAGES.length; i++) {
        acc += LOADING_STAGES[i].duration
        if (elapsed < acc) {
          setCurrentStage(i)
          break
        }
        if (i === LOADING_STAGES.length - 1) setCurrentStage(i)
      }
    }, 500)

    return () => clearInterval(interval)
  }, [])

  const stageBreakpoints = []
  let acc = 0
  const totalDuration = LOADING_STAGES.reduce((a, s) => a + s.duration, 0)
  for (const stage of LOADING_STAGES) {
    stageBreakpoints.push((acc / totalDuration) * 100)
    acc += stage.duration
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card"
      style={{ padding: '2.5rem 2rem', maxWidth: '560px', margin: '0 auto', width: '100%' }}
    >
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <div style={{
          width: 64, height: 64, borderRadius: 16,
          background: 'linear-gradient(135deg, #3b82f6, #10b981)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 1rem',
          boxShadow: '0 8px 24px rgba(59, 130, 246, 0.3)',
        }}>
          <Building2 style={{ width: 32, height: 32, color: 'white' }} />
        </div>
        <h3 style={{
          fontFamily: 'Outfit, sans-serif',
          fontWeight: 700,
          color: 'white',
          fontSize: '1.2rem',
          marginBottom: '0.25rem',
        }}>
          Building {companyName}'s Model
        </h3>
        <p style={{ color: '#64748b', fontSize: '0.8rem' }}>
          {ticker} &middot; 10-K{includeQuarterly ? ' + 10-Q' : ''} filings
        </p>
      </div>

      {/* Progress bar */}
      <div style={{
        width: '100%',
        height: '6px',
        borderRadius: '3px',
        background: 'rgba(100, 116, 139, 0.15)',
        marginBottom: '1.5rem',
        overflow: 'hidden',
      }}>
        <motion.div
          initial={{ width: '0%' }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          style={{
            height: '100%',
            borderRadius: '3px',
            background: 'linear-gradient(90deg, #3b82f6, #10b981)',
          }}
        />
      </div>

      {/* Stages */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
        {LOADING_STAGES.map((stage, i) => {
          const isComplete = progress > stageBreakpoints[i] + (LOADING_STAGES[i].duration / totalDuration) * 80
          const isActive = i === currentStage
          const isPending = i > currentStage

          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.5rem 0.75rem',
                borderRadius: '10px',
                background: isActive ? 'rgba(59, 130, 246, 0.08)' : 'transparent',
              }}
            >
              {/* Status icon */}
              <div style={{
                width: 24, height: 24, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.7rem',
                flexShrink: 0,
                ...(isComplete
                  ? { background: 'rgba(16, 185, 129, 0.15)' }
                  : isActive
                    ? { background: 'rgba(59, 130, 246, 0.15)' }
                    : { background: 'rgba(100, 116, 139, 0.1)' }
                ),
              }}>
                {isComplete ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : isActive ? (
                  <Loader2 style={{ width: 14, height: 14, color: '#60a5fa', animation: 'spin 1s linear infinite' }} />
                ) : (
                  <span style={{ color: '#4a5568' }}>{i + 1}</span>
                )}
              </div>

              {/* Label */}
              <span style={{
                fontSize: '0.85rem',
                color: isComplete ? '#10b981' : isActive ? '#e2e8f0' : '#64748b',
                fontWeight: isActive ? 500 : 400,
              }}>
                {stage.emoji} {stage.label}
              </span>
            </motion.div>
          )
        })}
      </div>

      {/* Progress percentage */}
      <div style={{
        textAlign: 'center',
        marginTop: '1.25rem',
        fontSize: '0.75rem',
        color: '#64748b',
      }}>
        {Math.round(progress)}% complete
      </div>
    </motion.div>
  )
}

// ─── Main EdgarPanel ──────────────────────────────────────────────────────────

export default function EdgarPanel({ apiUrl, addToast, onDataFetched }) {
  const [ticker, setTicker] = useState('')
  const [results, setResults] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [loadingCompanyName, setLoadingCompanyName] = useState('')
  const [loadingTicker, setLoadingTicker] = useState('')
  const [error, setError] = useState(null)
  const [expandedSections, setExpandedSections] = useState({})
  const [activeTab, setActiveTab] = useState('balance_sheet')
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('popular')
  const [includeQuarterly, setIncludeQuarterly] = useState(false)
  const [viewMode, setViewMode] = useState('annual') // 'annual' | 'quarterly'
  const resultsRef = useRef(null)
  const categoryScrollRef = useRef(null)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)')
    setIsMobile(mq.matches)
    const handler = (e) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const toggleSection = (key) => {
    setExpandedSections(prev => ({
      ...prev,
      [key]: prev[key] === undefined ? false : !prev[key]
    }))
  }

  // Filter companies based on search query
  const filteredCompanies = useMemo(() => {
    if (!searchQuery.trim()) return null // null means "show categories view"
    const q = searchQuery.trim()
    return COMPANIES.filter(c =>
      fuzzyMatch(c.name, q) ||
      fuzzyMatch(c.ticker, q) ||
      fuzzyMatch(c.desc, q)
    )
  }, [searchQuery])

  // Companies for the active category
  const categoryCompanies = useMemo(() => {
    return COMPANIES.filter(c => c.category === activeCategory)
  }, [activeCategory])

  const handleSearch = async (tickerToSearch, companyName) => {
    const t = tickerToSearch || ticker
    if (!t.trim()) {
      addToast('Please enter a ticker symbol', 'warning')
      return
    }

    setIsLoading(true)
    setLoadingTicker(t.toUpperCase())
    setLoadingCompanyName(companyName || t.toUpperCase())
    setResults(null)
    setError(null)
    setExpandedSections({})
    setViewMode('annual')

    try {
      const qp = includeQuarterly ? '?include_quarterly=true' : ''
      // EDGAR DATA CALL: USER-TRIGGERED
      // Triggered by: user searches for a company in the EDGAR panel
      const response = await fetch(`${apiUrl}/edgar/${t.toUpperCase()}${qp}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setResults(data.data)
        if (onDataFetched) onDataFetched(t.toUpperCase(), data.data)
        addToast(`SEC filings retrieved for ${t.toUpperCase()}!`, 'success')
        // Scroll to results
        setTimeout(() => {
          resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }, 200)
      } else {
        const errorMsg = data.detail?.message || data.error || data.detail || 'Could not load data'
        setError(errorMsg)
        addToast(`Could not load company data`, 'warning')
      }
    } catch (err) {
      setError(err.message)
      addToast('Could not reach the server right now', 'warning')
    } finally {
      setIsLoading(false)
      setLoadingTicker('')
      setLoadingCompanyName('')
    }
  }

  const handleCompanyClick = (company) => {
    setTicker(company.ticker)
    setSearchQuery('')
    handleSearch(company.ticker, company.name)
  }

  const handleManualSearch = () => {
    handleSearch(ticker)
  }

  const tabs = [
    { id: 'balance_sheet', label: 'Balance Sheet', icon: PieChart, color: '59, 130, 246' },
    { id: 'income_statement', label: 'Income', icon: TrendingUp, color: '16, 185, 129' },
    { id: 'cash_flow', label: 'Cash Flow', icon: DollarSign, color: '168, 85, 247' },
  ]

  // ─── Browse / Loading / Results View ──────────────────────────────────────

  const showBrowse = !results && !isLoading && !error

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '1.5rem' }}>
      {/* ─── Rich Loading Experience ────────────────────────────────────── */}
      {isLoading && (
        <LoadingExperience
          companyName={loadingCompanyName}
          ticker={loadingTicker}
          includeQuarterly={includeQuarterly}
        />
      )}

      {/* ─── Error State ───────────────────────────────────────────────── */}
      {error && !isLoading && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card"
          style={{ textAlign: 'center', padding: '3rem 2rem' }}
        >
          <div style={{
            width: 64, height: 64, borderRadius: 16,
            background: 'rgba(245, 158, 11, 0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1rem',
          }}>
            <AlertCircle style={{ width: 32, height: 32, color: '#fbbf24' }} />
          </div>
          <p style={{ color: '#fbbf24', fontWeight: 500, marginBottom: '0.5rem' }}>Could not load data</p>
          <p style={{ fontSize: '0.875rem', color: '#94a3b8', maxWidth: 400, margin: '0 auto 1rem' }}>{error}</p>
          <button
            onClick={() => { setError(null); setResults(null) }}
            className="btn-secondary"
            style={{ fontSize: '0.875rem' }}
          >
            Try Again
          </button>
        </motion.div>
      )}

      {/* ─── Browse Companies Section ──────────────────────────────────── */}
      {showBrowse && (
        <div>
          {/* Hero Search Bar */}
          <div style={{
            textAlign: 'center',
            marginBottom: '2rem',
            padding: isMobile ? '1.5rem 0' : '2rem 0',
          }}>
            <h2 style={{
              fontFamily: 'Outfit, sans-serif',
              fontWeight: 700,
              fontSize: isMobile ? '1.5rem' : '2rem',
              color: 'white',
              marginBottom: '0.5rem',
            }}>
              What would you like to build?
            </h2>
            <p style={{ color: '#94a3b8', fontSize: isMobile ? '0.85rem' : '0.95rem', marginBottom: '1.5rem' }}>
              Search by company name, ticker, or describe what you need
            </p>

            {/* Smart Search Input */}
            <div style={{
              position: 'relative',
              maxWidth: '600px',
              margin: '0 auto',
            }}>
              <Sparkles style={{
                position: 'absolute',
                left: '1.25rem',
                top: '50%',
                transform: 'translateY(-50%)',
                width: 22,
                height: 22,
                color: '#f59e0b',
                pointerEvents: 'none',
              }} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && searchQuery.trim()) {
                    // Try to resolve as ticker first
                    const upper = searchQuery.trim().toUpperCase()
                    if (/^[A-Z]{1,5}(-[A-Z])?$/.test(upper)) {
                      handleSearch(upper)
                    } else {
                      // Try company name lookup
                      const match = COMPANIES.find(c =>
                        c.name.toLowerCase() === searchQuery.trim().toLowerCase() ||
                        c.ticker.toLowerCase() === searchQuery.trim().toLowerCase()
                      )
                      if (match) {
                        handleCompanyClick(match)
                      } else {
                        // Use as raw ticker
                        handleSearch(searchQuery.trim().toUpperCase())
                      }
                    }
                  }
                }}
                placeholder={isMobile
                  ? "Try 'Apple' or 'NVDA'..."
                  : "Try 'COMPS on Apple', 'compare Tesla vs Google', or just a ticker..."
                }
                className="company-search-input"
                style={{
                  width: '100%',
                  padding: '1.125rem 1.25rem 1.125rem 3.25rem',
                  background: 'rgba(10, 22, 40, 0.8)',
                  border: '2px solid rgba(245, 158, 11, 0.2)',
                  borderRadius: '16px',
                  color: 'white',
                  fontSize: isMobile ? '1rem' : '1.1rem',
                  outline: 'none',
                  transition: 'border-color 0.2s, box-shadow 0.2s',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'rgba(245, 158, 11, 0.5)'
                  e.target.style.boxShadow = '0 4px 30px rgba(245, 158, 11, 0.15)'
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(245, 158, 11, 0.2)'
                  e.target.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.2)'
                }}
              />
            </div>

            {/* Quick example chips */}
            <div style={{
              display: 'flex',
              gap: '0.5rem',
              justifyContent: 'center',
              flexWrap: 'wrap',
              marginTop: '1rem',
            }}>
              {[
                { label: 'AAPL', action: () => handleCompanyClick(COMPANIES.find(c => c.ticker === 'AAPL')) },
                { label: 'NVDA', action: () => handleCompanyClick(COMPANIES.find(c => c.ticker === 'NVDA')) },
                { label: 'TSLA', action: () => handleCompanyClick(COMPANIES.find(c => c.ticker === 'TSLA')) },
                { label: 'GOOGL', action: () => handleCompanyClick(COMPANIES.find(c => c.ticker === 'GOOGL')) },
              ].map(chip => (
                <button
                  key={chip.label}
                  onClick={chip.action}
                  disabled={isLoading}
                  style={{
                    padding: '0.375rem 0.875rem',
                    borderRadius: '20px',
                    background: 'rgba(59, 130, 246, 0.08)',
                    border: '1px solid rgba(59, 130, 246, 0.2)',
                    color: '#93c5fd',
                    fontSize: '0.8rem',
                    fontFamily: 'JetBrains Mono, monospace',
                    fontWeight: 500,
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            marginBottom: '1.25rem',
          }}>
            <div style={{ flex: 1, height: '1px', background: 'rgba(100, 116, 139, 0.2)' }} />
            <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>Or browse companies</span>
            <div style={{ flex: 1, height: '1px', background: 'rgba(100, 116, 139, 0.2)' }} />
          </div>

          {/* Search results mode */}
          {filteredCompanies !== null ? (
            <div>
              {filteredCompanies.length > 0 ? (
                <>
                  <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.75rem' }}>
                    {filteredCompanies.length} result{filteredCompanies.length !== 1 ? 's' : ''} for "{searchQuery}"
                  </p>
                  <div className="company-grid">
                    {filteredCompanies.map(c => (
                      <CompanyCard
                        key={c.ticker}
                        company={c}
                        onClick={handleCompanyClick}
                        isLoading={isLoading}
                        loadingTicker={loadingTicker}
                      />
                    ))}
                  </div>
                </>
              ) : (
                <div style={{
                  textAlign: 'center',
                  padding: '2.5rem 1rem',
                  borderRadius: '16px',
                  background: 'rgba(10, 22, 40, 0.4)',
                  border: '1px solid rgba(100, 116, 139, 0.15)',
                }}>
                  <Search style={{ width: 40, height: 40, color: '#475569', margin: '0 auto 1rem' }} />
                  <p style={{ color: '#94a3b8', fontWeight: 500, marginBottom: '0.75rem' }}>
                    No companies found for "{searchQuery}"
                  </p>
                  <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '1rem' }}>
                    Don't see your company? Type the ticker symbol directly:
                  </p>
                  <div style={{
                    display: 'flex',
                    gap: '0.5rem',
                    justifyContent: 'center',
                    maxWidth: 360,
                    margin: '0 auto',
                    flexDirection: isMobile ? 'column' : 'row',
                  }}>
                    <input
                      type="text"
                      value={ticker}
                      onChange={(e) => setTicker(e.target.value.toUpperCase())}
                      placeholder="e.g. AAPL"
                      inputMode="text"
                      autoCapitalize="characters"
                      autoCorrect="off"
                      autoComplete="off"
                      onKeyDown={(e) => e.key === 'Enter' && handleManualSearch()}
                      style={{
                        flex: isMobile ? 'none' : 1,
                        width: isMobile ? '100%' : undefined,
                        padding: '0.75rem 1rem',
                        background: 'rgba(10, 22, 40, 0.5)',
                        border: '1px solid rgba(100, 116, 139, 0.5)',
                        borderRadius: '10px',
                        color: 'white',
                        fontSize: '1rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        textAlign: 'center',
                        outline: 'none',
                      }}
                    />
                    <button
                      onClick={handleManualSearch}
                      disabled={isLoading || !ticker.trim()}
                      className="btn-primary"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.375rem',
                        opacity: (!ticker.trim() || isLoading) ? 0.5 : 1,
                        cursor: (!ticker.trim() || isLoading) ? 'not-allowed' : 'pointer',
                        whiteSpace: 'nowrap',
                        touchAction: 'manipulation',
                        WebkitTapHighlightColor: 'transparent',
                        width: isMobile ? '100%' : undefined,
                        padding: isMobile ? '0.875rem 1.5rem' : undefined,
                      }}
                    >
                      {isLoading ? (
                        <Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} />
                      ) : (
                        <Search style={{ width: 16, height: 16 }} />
                      )}
                      {isLoading ? 'Fetching...' : 'Fetch'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Category chips */}
              <div
                ref={categoryScrollRef}
                className="category-chips"
                style={{
                  display: 'flex',
                  gap: '0.5rem',
                  marginBottom: '1.25rem',
                  overflowX: 'auto',
                  paddingBottom: '0.5rem',
                }}
              >
                {CATEGORIES.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.375rem',
                      padding: '0.5rem 1rem',
                      borderRadius: '999px',
                      border: activeCategory === cat.id
                        ? '1px solid rgba(59, 130, 246, 0.5)'
                        : '1px solid rgba(100, 116, 139, 0.2)',
                      background: activeCategory === cat.id
                        ? 'rgba(59, 130, 246, 0.2)'
                        : 'rgba(10, 22, 40, 0.5)',
                      color: activeCategory === cat.id ? '#60a5fa' : '#94a3b8',
                      fontWeight: activeCategory === cat.id ? 600 : 400,
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                      transition: 'all 0.2s',
                    }}
                  >
                    <span>{cat.emoji}</span>
                    <span>{cat.label}</span>
                  </button>
                ))}
              </div>

              {/* Category title */}
              <div style={{ marginBottom: '0.75rem' }}>
                <h3 style={{
                  fontFamily: 'Outfit, sans-serif',
                  fontWeight: 600,
                  color: 'white',
                  fontSize: '1.1rem',
                }}>
                  {CATEGORIES.find(c => c.id === activeCategory)?.emoji}{' '}
                  {CATEGORIES.find(c => c.id === activeCategory)?.label}
                </h3>
              </div>

              {/* Company grid */}
              <div className="company-grid">
                {categoryCompanies.map(c => (
                  <CompanyCard
                    key={c.ticker}
                    company={c}
                    onClick={handleCompanyClick}
                    isLoading={isLoading}
                    loadingTicker={loadingTicker}
                  />
                ))}
              </div>
            </>
          )}

          {/* Advanced: manual ticker entry */}
          <div style={{
            marginTop: '2rem',
            padding: '1.25rem',
            borderRadius: '14px',
            background: 'rgba(10, 22, 40, 0.3)',
            border: '1px solid rgba(100, 116, 139, 0.12)',
          }}>
            <label style={{
              fontSize: '0.8rem',
              color: '#64748b',
              fontWeight: 500,
              display: 'block',
              marginBottom: '0.625rem',
            }}>
              Already know the ticker? Enter it here:
            </label>
            <div style={{
              display: 'flex',
              gap: '0.5rem',
              flexDirection: isMobile ? 'column' : 'row',
            }}>
              <input
                type="text"
                value={ticker}
                onChange={(e) => setTicker(e.target.value.toUpperCase())}
                placeholder="e.g. AAPL"
                maxLength={10}
                inputMode="text"
                autoCapitalize="characters"
                autoCorrect="off"
                autoComplete="off"
                onKeyDown={(e) => e.key === 'Enter' && handleManualSearch()}
                style={{
                  flex: isMobile ? 'none' : 1,
                  width: isMobile ? '100%' : undefined,
                  padding: '0.75rem 1rem',
                  background: 'rgba(10, 22, 40, 0.5)',
                  border: '1px solid rgba(100, 116, 139, 0.4)',
                  borderRadius: '10px',
                  color: 'white',
                  fontSize: '1.1rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  textAlign: 'center',
                  outline: 'none',
                }}
              />
              <button
                onClick={handleManualSearch}
                disabled={isLoading || !ticker.trim()}
                className="btn-primary"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  opacity: (isLoading || !ticker.trim()) ? 0.5 : 1,
                  cursor: (isLoading || !ticker.trim()) ? 'not-allowed' : 'pointer',
                  whiteSpace: 'nowrap',
                  touchAction: 'manipulation',
                  WebkitTapHighlightColor: 'transparent',
                  width: isMobile ? '100%' : undefined,
                  padding: isMobile ? '0.875rem 1.5rem' : undefined,
                  fontSize: isMobile ? '1rem' : undefined,
                }}
              >
                {isLoading ? (
                  <Loader2 style={{ width: 18, height: 18, animation: 'spin 1s linear infinite' }} />
                ) : (
                  <Search style={{ width: 18, height: 18 }} />
                )}
                Fetch from SEC EDGAR
              </button>
            </div>
            {/* Include 10-Q checkbox */}
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginTop: '0.75rem',
              cursor: 'pointer',
              fontSize: '0.8rem',
              color: '#94a3b8',
              userSelect: 'none',
            }}>
              <input
                type="checkbox"
                checked={includeQuarterly}
                onChange={(e) => setIncludeQuarterly(e.target.checked)}
                style={{ accentColor: '#3b82f6', width: 16, height: 16, cursor: 'pointer' }}
              />
              Include 10-Q quarterly data
            </label>
          </div>
        </div>
      )}

      {/* ─── Results Section ────────────────────────────────────────────── */}
      {results && !isLoading && (
        <div ref={resultsRef}>
          {/* Back button */}
          <button
            onClick={() => { setResults(null); setError(null) }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.375rem',
              padding: '0.5rem 0.875rem',
              borderRadius: '8px',
              border: '1px solid rgba(100, 116, 139, 0.2)',
              background: 'rgba(10, 22, 40, 0.5)',
              color: '#94a3b8',
              cursor: 'pointer',
              fontSize: '0.8rem',
              marginBottom: '1rem',
              transition: 'all 0.2s',
            }}
          >
            <ChevronRight style={{ width: 14, height: 14, transform: 'rotate(180deg)' }} />
            Browse Companies
          </button>

          <div className="card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Header with company info */}
            <div style={{
              display: 'flex',
              alignItems: isMobile ? 'flex-start' : 'center',
              justifyContent: 'space-between',
              paddingBottom: '1rem',
              borderBottom: '1px solid rgba(100, 116, 139, 0.2)',
              marginBottom: '1rem',
              flexShrink: 0,
              flexWrap: 'wrap',
              gap: '0.5rem',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                {(() => {
                  const company = COMPANIES.find(c => c.ticker === (results.ticker || ticker))
                  if (company) {
                    return <CompanyLogo domain={company.domain} name={company.name} size={52} />
                  }
                  return (
                    <div style={{
                      width: 52, height: 52, borderRadius: 14,
                      background: 'linear-gradient(135deg, #10b981, #3b82f6)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 800, color: 'white', fontSize: '1.1rem', letterSpacing: '-0.02em',
                    }}>
                      {(results.ticker || ticker).slice(0, 4)}
                    </div>
                  )
                })()}
                <div>
                  <h3 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, color: 'white', fontSize: '1.25rem' }}>
                    {(() => {
                      const company = COMPANIES.find(c => c.ticker === (results.ticker || ticker))
                      return company ? company.name : (results.ticker || ticker)
                    })()}
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                    <span style={{
                      fontSize: '0.75rem', fontWeight: 600, color: '#60a5fa',
                      fontFamily: 'JetBrains Mono, monospace',
                    }}>
                      {results.ticker || ticker}
                    </span>
                    <span style={{
                      fontSize: '0.75rem', color: '#10b981',
                      background: 'rgba(16, 185, 129, 0.1)',
                      padding: '0.125rem 0.5rem', borderRadius: '4px', fontWeight: 500,
                    }}>
                      {results.filings_count || 0} filings
                    </span>
                    {results.metadata?.fetched_at && (
                      <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                        {new Date(results.metadata.fetched_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div style={{
              display: 'flex', gap: '0.375rem', marginBottom: '1rem',
              paddingBottom: '0.75rem',
              borderBottom: '1px solid rgba(100, 116, 139, 0.15)',
              flexShrink: 0,
              overflowX: 'auto',
              WebkitOverflowScrolling: 'touch',
            }}>
              {tabs.map(tab => {
                const tabData = results[tab.id]
                const filingCount = tabData?.sections?.length || 0
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.5rem',
                      padding: isMobile ? '0.625rem 0.75rem' : '0.5rem 0.875rem',
                      borderRadius: '8px',
                      border: 'none', cursor: 'pointer',
                      background: activeTab === tab.id ? `rgba(${tab.color}, 0.2)` : 'transparent',
                      color: activeTab === tab.id ? `rgb(${tab.color})` : '#94a3b8',
                      fontWeight: activeTab === tab.id ? 600 : 400,
                      fontSize: isMobile ? '0.8rem' : '0.875rem',
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                      touchAction: 'manipulation',
                    }}
                  >
                    <tab.icon style={{ width: 16, height: 16 }} />
                    {tab.label}
                    {filingCount > 0 && (
                      <span style={{
                        fontSize: '0.65rem',
                        background: activeTab === tab.id ? `rgba(${tab.color}, 0.3)` : 'rgba(100, 116, 139, 0.2)',
                        padding: '0.125rem 0.375rem', borderRadius: '4px',
                      }}>
                        {filingCount}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Annual / Quarterly toggle */}
            {results.quarterly && (
              <div style={{
                display: 'flex',
                gap: '0.25rem',
                marginBottom: '1rem',
                padding: '0.25rem',
                background: 'rgba(10, 22, 40, 0.5)',
                borderRadius: '8px',
                width: 'fit-content',
              }}>
                {[
                  { key: 'annual', label: 'Annual (10-K)' },
                  { key: 'quarterly', label: 'Quarterly (10-Q)' },
                ].map(mode => (
                  <button
                    key={mode.key}
                    onClick={() => { setViewMode(mode.key); setExpandedSections({}) }}
                    style={{
                      padding: '0.4rem 0.875rem',
                      borderRadius: '6px',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      fontWeight: viewMode === mode.key ? 600 : 400,
                      background: viewMode === mode.key ? 'rgba(59, 130, 246, 0.25)' : 'transparent',
                      color: viewMode === mode.key ? '#60a5fa' : '#94a3b8',
                      transition: 'all 0.2s',
                    }}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            )}

            {/* Active tab content */}
            <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
              {tabs.map(tab => {
                if (activeTab !== tab.id) return null
                const dataSource = viewMode === 'quarterly' && results.quarterly
                  ? results.quarterly[tab.id]
                  : results[tab.id]
                return (
                  <StatementDisplay
                    key={`${tab.id}-${viewMode}`}
                    title={tab.label}
                    icon={tab.icon}
                    iconColor={tab.color}
                    data={dataSource}
                    expandedSections={expandedSections}
                    toggleSection={toggleSection}
                    statementKey={tab.id}
                  />
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
