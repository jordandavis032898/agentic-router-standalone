import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  TrendingUp,
  Building2,
  DollarSign,
  RotateCcw,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
  Calculator,
  Percent,
  BarChart3,
  Target,
  ChevronDown,
  ChevronUp,
  Info,
} from 'lucide-react'
import { recalculate } from '../utils/dcfEngine'

// ── Assumption definitions ──────────────────────────────────────────────────

const ASSUMPTION_DEFS = [
  { key: 'rev_growth',      label: 'Revenue Growth',   sublabel: '3yr CAGR', icon: TrendingUp,  suffix: '%', step: 0.5, min: -50, max: 100 },
  { key: 'ebit_margin',     label: 'EBIT Margin',      sublabel: 'Current',  icon: BarChart3,   suffix: '%', step: 0.5, min: -50, max: 80  },
  { key: 'terminal_growth', label: 'Terminal Growth',   sublabel: 'Gordon',   icon: Target,      suffix: '%', step: 0.25, min: 0, max: 10  },
  { key: 'tax_rate',        label: 'Tax Rate',          sublabel: 'Effective',icon: Percent,     suffix: '%', step: 0.5, min: 0, max: 60   },
  { key: 'da_pct',          label: 'D&A',               sublabel: '% of Rev', icon: Calculator,  suffix: '%', step: 0.25, min: 0, max: 30  },
  { key: 'capex_pct',       label: 'CapEx',              sublabel: '% of Rev', icon: DollarSign,  suffix: '%', step: 0.25, min: 0, max: 30  },
  { key: 'nwc_pct',         label: 'NWC',                sublabel: '% of Inc Rev', icon: BarChart3, suffix: '%', step: 0.25, min: 0, max: 15 },
]

// ── Inline editable value ───────────────────────────────────────────────────

function EditableValue({ value, onChange, suffix, step, min, max, isModified }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const inputRef = useRef(null)

  const startEdit = () => {
    setDraft(String(value))
    setEditing(true)
  }

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editing])

  const commit = () => {
    setEditing(false)
    const parsed = parseFloat(draft)
    if (!isNaN(parsed) && parsed >= min && parsed <= max && parsed !== value) {
      onChange(Math.round(parsed * 100) / 100)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') commit()
    if (e.key === 'Escape') setEditing(false)
  }

  if (editing) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <input
          ref={inputRef}
          type="number"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={handleKeyDown}
          step={step}
          min={min}
          max={max}
          style={{
            width: '72px',
            padding: '2px 6px',
            borderRadius: '6px',
            border: '1.5px solid #3b82f6',
            background: 'rgba(59, 130, 246, 0.1)',
            color: 'var(--text-primary)',
            fontSize: '1.25rem',
            fontWeight: 700,
            fontFamily: 'Outfit, sans-serif',
            textAlign: 'right',
            outline: 'none',
          }}
        />
        <span style={{
          fontSize: '0.85rem',
          color: 'var(--text-muted)',
          fontWeight: 500,
        }}>{suffix}</span>
      </div>
    )
  }

  return (
    <button
      onClick={startEdit}
      title="Click to edit"
      style={{
        display: 'flex',
        alignItems: 'baseline',
        gap: 2,
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: '2px 4px',
        borderRadius: '6px',
        transition: 'background 0.15s',
      }}
      onMouseEnter={e => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.08)'}
      onMouseLeave={e => e.currentTarget.style.background = 'none'}
    >
      <span style={{
        fontSize: '1.25rem',
        fontWeight: 700,
        fontFamily: 'Outfit, sans-serif',
        color: isModified ? '#d97706' : 'var(--text-primary)',
      }}>
        {typeof value === 'number' ? value.toFixed(1) : '—'}
      </span>
      <span style={{
        fontSize: '0.85rem',
        color: 'var(--text-muted)',
        fontWeight: 500,
      }}>{suffix}</span>
    </button>
  )
}

// ── Assumption card ─────────────────────────────────────────────────────────

function AssumptionCard({ def, value, defaultValue, onChange, delay }) {
  const Icon = def.icon
  const isModified = value !== defaultValue

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      className="card"
      style={{
        padding: '1rem 1.25rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.375rem',
        position: 'relative',
        overflow: 'hidden',
        background: isModified
          ? 'linear-gradient(135deg, rgba(217, 119, 6, 0.08), rgba(245, 158, 11, 0.04))'
          : undefined,
        border: isModified
          ? '1px solid rgba(217, 119, 6, 0.25)'
          : undefined,
      }}
    >
      {/* Modified indicator dot */}
      {isModified && (
        <div style={{
          position: 'absolute',
          top: 8,
          right: 8,
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: '#d97706',
        }} />
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <div style={{
          width: 28,
          height: 28,
          borderRadius: 7,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: isModified ? 'rgba(217, 119, 6, 0.15)' : 'var(--bg-icon)',
        }}>
          <Icon style={{ width: 15, height: 15, color: isModified ? '#d97706' : 'var(--text-muted)' }} />
        </div>
        <div>
          <div style={{
            fontSize: '0.8rem',
            fontWeight: 600,
            color: 'var(--text-secondary)',
            fontFamily: 'Outfit, sans-serif',
            lineHeight: 1.2,
          }}>{def.label}</div>
          <div style={{
            fontSize: '0.65rem',
            color: 'var(--text-dim)',
            lineHeight: 1.2,
          }}>{def.sublabel}</div>
        </div>
      </div>

      <EditableValue
        value={value}
        onChange={onChange}
        suffix={def.suffix}
        step={def.step}
        min={def.min}
        max={def.max}
        isModified={isModified}
      />
    </motion.div>
  )
}

// ── Result metric card ──────────────────────────────────────────────────────

function MetricCard({ label, value, sublabel, color, large, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      className="card"
      style={{
        padding: large ? '1.5rem' : '1rem 1.25rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.25rem',
      }}
    >
      <span style={{
        fontSize: '0.75rem',
        color: 'var(--text-dim)',
        fontWeight: 500,
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
      }}>{label}</span>
      <span style={{
        fontSize: large ? '1.75rem' : '1.25rem',
        fontWeight: 700,
        fontFamily: 'Outfit, sans-serif',
        color: color || 'var(--text-primary)',
      }}>{value}</span>
      {sublabel && (
        <span style={{
          fontSize: '0.72rem',
          color: 'var(--text-muted)',
        }}>{sublabel}</span>
      )}
    </motion.div>
  )
}

// ── Reverse DCF section ─────────────────────────────────────────────────────

function ReverseDcfSection({ data, currentPrice }) {
  if (!data) return null
  const { modelGrowthPct, impliedGrowthPct, growthGapPct } = data

  const hasImplied = impliedGrowthPct !== null
  const gapPositive = growthGapPct > 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
    >
      <h3 style={{
        fontFamily: 'Outfit, sans-serif',
        fontSize: '1rem',
        fontWeight: 600,
        color: 'var(--text-primary)',
        marginBottom: '0.75rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
      }}>
        <Target style={{ width: 18, height: 18, color: '#8b5cf6' }} />
        Reverse DCF — Expectations Investing
      </h3>

      <div className="card" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem' }}>
          {/* Model growth */}
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>
              Model Growth (CAGR)
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, fontFamily: 'Outfit, sans-serif', color: '#3b82f6' }}>
              {modelGrowthPct.toFixed(1)}%
            </div>
          </div>

          {/* Implied growth */}
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>
              Market-Implied Growth
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, fontFamily: 'Outfit, sans-serif', color: hasImplied ? '#10b981' : 'var(--text-muted)' }}>
              {hasImplied ? `${impliedGrowthPct.toFixed(1)}%` : 'No solution'}
            </div>
          </div>

          {/* Growth gap */}
          {hasImplied && (
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>
                Growth Gap
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                fontSize: '1.25rem',
                fontWeight: 700,
                fontFamily: 'Outfit, sans-serif',
                color: gapPositive ? '#10b981' : '#ef4444',
              }}>
                {gapPositive
                  ? <ArrowUpRight style={{ width: 18, height: 18 }} />
                  : <ArrowDownRight style={{ width: 18, height: 18 }} />
                }
                {Math.abs(growthGapPct).toFixed(1)}%
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', marginTop: 2 }}>
                {gapPositive
                  ? 'Model expects more growth than market'
                  : 'Market expects more growth than model'}
              </div>
            </div>
          )}

          {/* Current price */}
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>
              Current Market Price
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, fontFamily: 'Outfit, sans-serif', color: 'var(--text-secondary)' }}>
              ${currentPrice.toFixed(2)}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// ── Empty state ─────────────────────────────────────────────────────────────

function EmptyState({ onSwitchToEdgar }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1.5rem',
        textAlign: 'center',
        padding: '3rem',
      }}
    >
      <div style={{
        width: 64,
        height: 64,
        borderRadius: 16,
        background: 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(139,92,246,0.15))',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <Calculator style={{ width: 32, height: 32, color: '#60a5fa' }} />
      </div>
      <div>
        <h2 style={{
          fontFamily: 'Outfit, sans-serif',
          fontSize: '1.25rem',
          fontWeight: 600,
          color: 'var(--text-primary)',
          marginBottom: '0.5rem',
        }}>DCF Valuation</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: 360 }}>
          Search for a company in the EDGAR tab first, then come back here to build and edit a live DCF model.
        </p>
      </div>
      <button
        onClick={onSwitchToEdgar}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.625rem 1.25rem',
          borderRadius: 10,
          border: '1px solid rgba(59,130,246,0.3)',
          background: 'rgba(59,130,246,0.1)',
          color: '#60a5fa',
          cursor: 'pointer',
          fontSize: '0.875rem',
          fontWeight: 500,
        }}
      >
        <Building2 style={{ width: 16, height: 16 }} />
        Go to EDGAR
      </button>
    </motion.div>
  )
}

// ── Main component ──────────────────────────────────────────────────────────

export default function DcfPanel({ edgarData, apiUrl, addToast, onSwitchToEdgar }) {
  const [loading, setLoading] = useState(false)
  const [dcfData, setDcfData] = useState(null)    // raw API response
  const [overrides, setOverrides] = useState({})   // user edits (% form)
  const [showDetails, setShowDetails] = useState(false)

  const ticker = edgarData?.ticker || ''

  // Fetch DCF data when ticker changes
  useEffect(() => {
    if (!ticker) {
      setDcfData(null)
      setOverrides({})
      return
    }

    let cancelled = false
    const fetchDcf = async () => {
      setLoading(true)
      setOverrides({})
      try {
        const res = await fetch(`${apiUrl}/api/dcf-data/${encodeURIComponent(ticker)}`)
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(err.detail || `HTTP ${res.status}`)
        }
        const json = await res.json()
        if (!cancelled) setDcfData(json)
      } catch (err) {
        console.error('DCF fetch failed:', err)
        if (!cancelled) addToast(`DCF failed: ${err.message}`, 'warning')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchDcf()
    return () => { cancelled = true }
  }, [ticker, apiUrl, addToast])

  // Default assumption values (from API)
  const defaults = useMemo(() => dcfData?.assumptions || {}, [dcfData])

  // Current values: defaults merged with user overrides
  const currentValues = useMemo(() => {
    const vals = {}
    for (const def of ASSUMPTION_DEFS) {
      vals[def.key] = overrides[def.key] !== undefined ? overrides[def.key] : (defaults[def.key] ?? 0)
    }
    return vals
  }, [defaults, overrides])

  // Has any assumption been modified?
  const hasModifications = Object.keys(overrides).length > 0

  // Recalculate results in real time
  const results = useMemo(() => {
    if (!dcfData) return null
    if (!hasModifications) {
      // Use server-computed values
      return {
        impliedPrice: dcfData.implied_price,
        upside: dcfData.upside_pct,
        wacc: dcfData.wacc_pct,
        ev: dcfData.ev,
        tvPct: dcfData.tv_pct,
        pvProjection: dcfData.pv_projection,
        pvTerminal: dcfData.pv_terminal,
        reverseDcf: {
          modelGrowthPct: dcfData.reverse_dcf.model_growth_pct,
          impliedGrowthPct: dcfData.reverse_dcf.implied_growth_pct,
          growthGapPct: dcfData.reverse_dcf.growth_gap_pct,
        },
      }
    }
    // Client-side recalculation
    return recalculate(
      dcfData.edgar_scaled,
      dcfData.raw_assumptions,
      overrides,
      dcfData.share_price_mult,
      dcfData.current_price,
    )
  }, [dcfData, overrides, hasModifications])

  const handleAssumptionChange = useCallback((key, value) => {
    setOverrides(prev => {
      // If value equals default, remove the override
      if (Math.abs(value - (defaults[key] ?? 0)) < 0.001) {
        const { [key]: _, ...rest } = prev
        return rest
      }
      return { ...prev, [key]: value }
    })
  }, [defaults])

  const resetAll = useCallback(() => {
    setOverrides({})
  }, [])

  // ── Render ──────────────────────────────────────────────────────────────────

  if (!ticker) {
    return <EmptyState onSwitchToEdgar={onSwitchToEdgar} />
  }

  if (loading) {
    return (
      <div style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1rem',
      }}>
        <Loader2 style={{ width: 32, height: 32, color: '#3b82f6', animation: 'spin 1s linear infinite' }} />
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Building DCF model for {ticker}...
        </p>
      </div>
    )
  }

  if (!dcfData || !results) return null

  const upside = results.upside
  const upsideColor = upside > 5 ? '#10b981' : upside < -5 ? '#ef4444' : '#f59e0b'
  const UpsideIcon = upside >= 0 ? ArrowUpRight : ArrowDownRight

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}
      >
        <div>
          <h2 style={{
            fontFamily: 'Outfit, sans-serif',
            fontSize: '1.375rem',
            fontWeight: 700,
            color: 'var(--text-primary)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}>
            <Calculator style={{ width: 22, height: 22, color: '#3b82f6' }} />
            DCF Valuation — {dcfData.company_name}
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: 2 }}>
            {dcfData.unit_label} &middot; Click any assumption to edit &middot; Updates in real time
          </p>
        </div>

        {/* Reset button */}
        <AnimatePresence>
          {hasModifications && (
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              onClick={resetAll}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.375rem',
                padding: '0.5rem 1rem',
                borderRadius: 8,
                border: '1px solid rgba(217, 119, 6, 0.3)',
                background: 'rgba(217, 119, 6, 0.08)',
                color: '#d97706',
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: 500,
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(217, 119, 6, 0.15)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(217, 119, 6, 0.08)'
              }}
            >
              <RotateCcw style={{ width: 14, height: 14 }} />
              Reset to Default
            </motion.button>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ── Result metrics row ───────────────────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '0.75rem',
        marginBottom: '1.5rem',
      }}>
        <MetricCard
          label="Implied Share Price"
          value={`$${results.impliedPrice.toFixed(2)}`}
          sublabel={`vs $${dcfData.current_price.toFixed(2)} market`}
          color="#3b82f6"
          large
          delay={0}
        />
        <MetricCard
          label="Upside / Downside"
          value={
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <UpsideIcon style={{ width: 20, height: 20 }} />
              {upside > 0 ? '+' : ''}{upside.toFixed(1)}%
            </span>
          }
          color={upsideColor}
          large
          delay={0.05}
        />
        <MetricCard
          label="WACC"
          value={`${results.wacc.toFixed(1)}%`}
          delay={0.1}
        />
        <MetricCard
          label="Enterprise Value"
          value={results.ev.toFixed(1)}
          sublabel={dcfData.unit_label}
          delay={0.15}
        />
        <MetricCard
          label="Terminal Value %"
          value={`${results.tvPct.toFixed(1)}%`}
          sublabel="of total value"
          delay={0.2}
        />
      </div>

      {/* ── EV breakdown detail (collapsible) ────────────────────────────── */}
      <div style={{ marginBottom: '1.5rem' }}>
        <button
          onClick={() => setShowDetails(!showDetails)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.375rem',
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            fontSize: '0.78rem',
            fontWeight: 500,
            padding: '0.25rem 0',
            marginBottom: showDetails ? '0.5rem' : 0,
          }}
        >
          <Info style={{ width: 14, height: 14 }} />
          Value breakdown
          {showDetails ? <ChevronUp style={{ width: 14, height: 14 }} /> : <ChevronDown style={{ width: 14, height: 14 }} />}
        </button>
        <AnimatePresence>
          {showDetails && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{ overflow: 'hidden' }}
            >
              <div className="card" style={{ padding: '1rem 1.25rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                      PV of Projection Period
                    </div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 600, fontFamily: 'Outfit, sans-serif', color: 'var(--text-primary)' }}>
                      {results.pvProjection.toFixed(1)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                      PV of Terminal Value
                    </div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 600, fontFamily: 'Outfit, sans-serif', color: 'var(--text-primary)' }}>
                      {results.pvTerminal.toFixed(1)}
                    </div>
                  </div>
                </div>

                {/* Simple bar showing projection vs terminal split */}
                <div style={{
                  marginTop: '0.75rem',
                  height: 8,
                  borderRadius: 4,
                  background: 'rgba(255,255,255,0.06)',
                  overflow: 'hidden',
                  display: 'flex',
                }}>
                  <div style={{
                    width: `${100 - results.tvPct}%`,
                    background: '#3b82f6',
                    borderRadius: '4px 0 0 4px',
                    transition: 'width 0.3s ease',
                  }} />
                  <div style={{
                    width: `${results.tvPct}%`,
                    background: '#8b5cf6',
                    borderRadius: '0 4px 4px 0',
                    transition: 'width 0.3s ease',
                  }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                  <span style={{ fontSize: '0.65rem', color: '#60a5fa' }}>Projection: {(100 - results.tvPct).toFixed(0)}%</span>
                  <span style={{ fontSize: '0.65rem', color: '#a78bfa' }}>Terminal: {results.tvPct.toFixed(0)}%</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Key Assumptions grid ─────────────────────────────────────────── */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h3 style={{
          fontFamily: 'Outfit, sans-serif',
          fontSize: '1rem',
          fontWeight: 600,
          color: 'var(--text-primary)',
          marginBottom: '0.75rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}>
          Key Assumptions
          {hasModifications && (
            <span style={{
              fontSize: '0.65rem',
              padding: '2px 8px',
              borderRadius: 4,
              background: 'rgba(217, 119, 6, 0.15)',
              color: '#d97706',
              fontWeight: 600,
            }}>
              {Object.keys(overrides).length} modified
            </span>
          )}
        </h3>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(155px, 1fr))',
          gap: '0.625rem',
        }}>
          {ASSUMPTION_DEFS.map((def, i) => (
            <AssumptionCard
              key={def.key}
              def={def}
              value={currentValues[def.key]}
              defaultValue={defaults[def.key] ?? 0}
              onChange={v => handleAssumptionChange(def.key, v)}
              delay={i * 0.05}
            />
          ))}
        </div>
      </div>

      {/* ── Reverse DCF ──────────────────────────────────────────────────── */}
      <ReverseDcfSection
        data={results.reverseDcf}
        currentPrice={dcfData.current_price}
      />
    </div>
  )
}
