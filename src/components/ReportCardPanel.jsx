import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ClipboardCheck,
  Building2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Minus,
} from 'lucide-react'

// ── Helpers ──────────────────────────────────────────────────────────────────

const SEVERITY_ICON = {
  critical: { Icon: XCircle, color: '#ef4444' },
  standard: { Icon: AlertTriangle, color: '#f59e0b' },
  minor:    { Icon: AlertTriangle, color: '#94a3b8' },
}

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

// ── Mini progress bar ────────────────────────────────────────────────────────

function ProgressBar({ passed, total, height = 6, color }) {
  const pct = total > 0 ? (passed / total) * 100 : 0
  return (
    <div style={{
      width: '100%',
      height,
      borderRadius: height,
      background: 'rgba(255,255,255,0.08)',
      overflow: 'hidden',
    }}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        style={{
          height: '100%',
          borderRadius: height,
          background: color || '#3b82f6',
        }}
      />
    </div>
  )
}

// ── Category card ────────────────────────────────────────────────────────────

function CategoryCard({ cat, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="card"
      style={{
        padding: '1.25rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.25rem' }}>{cat.emoji}</span>
          <span style={{
            fontFamily: 'Outfit, sans-serif',
            fontWeight: 600,
            fontSize: '0.95rem',
            color: 'var(--text-primary)',
          }}>{cat.label}</span>
        </div>
        <span style={{
          fontFamily: 'Outfit, sans-serif',
          fontWeight: 700,
          fontSize: '1.5rem',
          color: cat.grade_color,
        }}>{cat.grade}</span>
      </div>
      <ProgressBar passed={cat.passed} total={cat.total} color={cat.grade_color} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{cat.summary}</span>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
          {cat.passed}/{cat.total}
        </span>
      </div>
    </motion.div>
  )
}

// ── Check row ────────────────────────────────────────────────────────────────

function CheckRow({ check }) {
  const passed = check.passed
  const notApplicable = !check.applicable

  let StatusIcon, statusColor
  if (notApplicable) {
    StatusIcon = Minus
    statusColor = '#475569'
  } else if (passed) {
    StatusIcon = CheckCircle2
    statusColor = '#10b981'
  } else {
    const sev = SEVERITY_ICON[check.severity] || SEVERITY_ICON.standard
    StatusIcon = sev.Icon
    statusColor = sev.color
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: '0.75rem',
      padding: '0.625rem 0',
      borderBottom: '1px solid rgba(255,255,255,0.04)',
    }}>
      <StatusIcon style={{ width: 18, height: 18, color: statusColor, flexShrink: 0, marginTop: 2 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span style={{
            fontSize: '0.85rem',
            fontWeight: 500,
            color: notApplicable ? 'var(--text-dim)' : 'var(--text-primary)',
          }}>
            {check.name}
          </span>
          <span style={{
            fontSize: '0.65rem',
            padding: '1px 6px',
            borderRadius: 4,
            background: 'rgba(255,255,255,0.06)',
            color: 'var(--text-dim)',
          }}>{check.check_id}</span>
        </div>
        <p style={{
          fontSize: '0.78rem',
          color: 'var(--text-muted)',
          marginTop: 2,
          lineHeight: 1.4,
        }}>
          {notApplicable
            ? 'Not enough data to evaluate'
            : check.description}
        </p>
        {!passed && !notApplicable && check.failed_years.length > 0 && (
          <p style={{
            fontSize: '0.72rem',
            color: statusColor,
            marginTop: 4,
          }}>
            Failed in: {check.failed_years.join(', ')}
          </p>
        )}
      </div>
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────────────────

export default function ReportCardPanel({
  edgarData,
  apiUrl,
  addToast,
  onSwitchToEdgar,
  preloadedData,
  preloadedLoading,
  preloadedCheckedAt,
  onRefresh,
}) {
  const [showAll, setShowAll] = useState(false)

  const ticker = edgarData?.ticker || ''
  const data = preloadedData
  const loading = preloadedLoading

  // Derive lists
  const checks = useMemo(() => data?.checks || [], [data])
  const failedChecks = useMemo(
    () => checks.filter(c => c.applicable && !c.passed),
    [checks],
  )
  const categories = useMemo(() => {
    if (!data?.categories) return []
    return Object.entries(data.categories).map(([id, cat]) => ({ id, ...cat }))
  }, [data])

  // ── Empty state ──
  if (!edgarData?.results) {
    return (
      <div style={{
        height: '100%', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', textAlign: 'center',
      }}>
        <div style={{
          width: 80, height: 80, borderRadius: 20,
          background: 'rgba(10, 22, 40, 0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: '1.5rem',
        }}>
          <ClipboardCheck style={{ width: 40, height: 40, color: '#64748b' }} />
        </div>
        <h3 style={{
          fontFamily: 'Outfit, sans-serif', fontWeight: 600,
          color: 'var(--text-primary)', marginBottom: '0.5rem',
        }}>
          No Data Yet
        </h3>
        <p style={{ color: '#94a3b8', maxWidth: 340, lineHeight: 1.6, marginBottom: '1.25rem' }}>
          Search for a company on the EDGAR tab first, then come back here to see its report card.
        </p>
        <button
          onClick={onSwitchToEdgar}
          className="btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <Building2 style={{ width: 18, height: 18 }} />
          Go to EDGAR
        </button>
      </div>
    )
  }

  // ── Loading state ──
  if (loading && !data) {
    return (
      <div style={{
        height: '100%', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          width: 48, height: 48, borderRadius: '50%',
          border: '3px solid rgba(59, 130, 246, 0.3)',
          borderTopColor: '#3b82f6',
          animation: 'spin 1s linear infinite',
        }} />
        <p style={{ color: 'var(--text-muted)', marginTop: '1rem' }}>
          Running {ticker} quality checks...
        </p>
      </div>
    )
  }

  // ── No data from API yet ──
  if (!data) {
    return (
      <div style={{
        height: '100%', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', textAlign: 'center',
      }}>
        <div style={{
          width: 80, height: 80, borderRadius: 20,
          background: 'rgba(10, 22, 40, 0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: '1.5rem',
        }}>
          <ClipboardCheck style={{ width: 40, height: 40, color: '#64748b' }} />
        </div>
        <h3 style={{
          fontFamily: 'Outfit, sans-serif', fontWeight: 600,
          color: 'var(--text-primary)', marginBottom: '0.5rem',
        }}>
          Loading Report Card...
        </h3>
        <p style={{ color: '#94a3b8', maxWidth: 340, lineHeight: 1.6, marginBottom: '1.25rem' }}>
          Quality checks are running in the background. This usually takes a few seconds.
        </p>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <RefreshCw style={{ width: 18, height: 18 }} />
            Run Checks Now
          </button>
        )}
      </div>
    )
  }

  // ── Main report card ──
  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* ── Top: Grade + Summary ── */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="card"
        style={{
          padding: '2rem',
          display: 'flex',
          alignItems: 'center',
          gap: '2rem',
          marginBottom: '1.25rem',
          flexWrap: 'wrap',
        }}
      >
        {/* Letter grade */}
        <div style={{
          width: 100, height: 100, borderRadius: 20,
          background: `${data.grade_color}22`,
          border: `2px solid ${data.grade_color}44`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <span style={{
            fontFamily: 'Outfit, sans-serif',
            fontWeight: 800,
            fontSize: '3.5rem',
            lineHeight: 1,
            color: data.grade_color,
          }}>
            {data.grade}
          </span>
        </div>

        {/* Summary */}
        <div style={{ flex: 1, minWidth: 200 }}>
          <h2 style={{
            fontFamily: 'Outfit, sans-serif',
            fontWeight: 700,
            fontSize: '1.35rem',
            color: 'var(--text-primary)',
            marginBottom: '0.5rem',
          }}>
            {data.company_name || ticker}
          </h2>
          <p style={{
            color: 'var(--text-muted)',
            fontSize: '0.9rem',
            lineHeight: 1.5,
            marginBottom: '0.75rem',
          }}>
            {data.summary}
          </p>
          <ProgressBar
            passed={data.passed}
            total={data.total}
            height={8}
            color={data.grade_color}
          />
          <p style={{
            fontSize: '0.75rem',
            color: 'var(--text-dim)',
            marginTop: '0.35rem',
          }}>
            {data.passed} of {data.total} applicable checks passing
            {data.periods_checked ? ` across ${data.periods_checked} year${data.periods_checked !== 1 ? 's' : ''}` : ''}
          </p>
        </div>
      </motion.div>

      {/* ── Middle: Category cards ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '1rem',
        marginBottom: '1.25rem',
      }}>
        {categories.map((cat, i) => (
          <CategoryCard key={cat.id} cat={cat} delay={0.1 + i * 0.1} />
        ))}
      </div>

      {/* ── Failed / warning items ── */}
      {failedChecks.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
          className="card"
          style={{ padding: '1.25rem', marginBottom: '1.25rem' }}
        >
          <h3 style={{
            fontFamily: 'Outfit, sans-serif',
            fontWeight: 700,
            fontSize: '1rem',
            color: 'var(--text-primary)',
            marginBottom: '0.75rem',
          }}>
            Issues Found ({failedChecks.length})
          </h3>
          {failedChecks.map(c => <CheckRow key={c.check_id} check={c} />)}
        </motion.div>
      )}

      {/* ── Accordion: show all checks ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.5 }}
        className="card"
        style={{ padding: '1.25rem', marginBottom: '1.25rem' }}
      >
        <button
          onClick={() => setShowAll(prev => !prev)}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text-primary)',
            padding: 0,
          }}
        >
          <span style={{
            fontFamily: 'Outfit, sans-serif',
            fontWeight: 600,
            fontSize: '0.95rem',
          }}>
            {showAll ? 'Hide' : 'Show'} All Checks ({checks.length})
          </span>
          {showAll
            ? <ChevronUp style={{ width: 20, height: 20, color: 'var(--text-muted)' }} />
            : <ChevronDown style={{ width: 20, height: 20, color: 'var(--text-muted)' }} />}
        </button>

        <AnimatePresence>
          {showAll && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              style={{ overflow: 'hidden' }}
            >
              <div style={{ marginTop: '0.75rem' }}>
                {checks.map(c => <CheckRow key={c.check_id} check={c} />)}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ── Footer ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem',
        padding: '0.5rem 0',
      }}>
        <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
          {preloadedCheckedAt
            ? `Last checked: ${timeAgo(preloadedCheckedAt)}`
            : ''}
        </span>
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={loading}
            className="btn-primary"
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              opacity: loading ? 0.6 : 1,
              fontSize: '0.85rem',
              padding: '0.5rem 1rem',
            }}
          >
            <RefreshCw style={{
              width: 16, height: 16,
              animation: loading ? 'spin 1s linear infinite' : 'none',
            }} />
            {loading ? 'Checking...' : 'Re-run Checks'}
          </button>
        )}
      </div>
    </div>
  )
}
