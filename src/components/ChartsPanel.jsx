import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { BarChart3, Building2 } from 'lucide-react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Filler,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import { Bar, Line, Doughnut } from 'react-chartjs-2'

ChartJS.register(
  CategoryScale, LinearScale, BarElement, LineElement, PointElement,
  ArcElement, Filler, Title, Tooltip, Legend
)

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseNum(val) {
  if (val === null || val === undefined || val === '') return null
  // Unwrap XBRL metadata objects: {value: "14,264", meta: {...}}
  while (typeof val === 'object' && val !== null && !Array.isArray(val) && val.value !== undefined) {
    val = val.value
  }
  // Still an object after unwrapping — try .amount or .raw
  if (typeof val === 'object' && val !== null) {
    if (typeof val.amount === 'number') return val.amount
    if (typeof val.raw === 'number') return val.raw
    return null
  }
  if (typeof val === 'number') return val
  const str = String(val).replace(/[$,\s%]/g, '').replace(/\((.+)\)/, '-$1')
  const n = parseFloat(str)
  return isNaN(n) ? null : n
}

function formatMoney(value) {
  if (value === null || value === undefined) return '—'
  const abs = Math.abs(value)
  const sign = value < 0 ? '-' : ''
  if (abs >= 1e12) return `${sign}$${(abs / 1e12).toFixed(1)}T`
  if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(1)}B`
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(0)}M`
  if (abs >= 1e3) return `${sign}$${(abs / 1e3).toFixed(0)}K`
  return `${sign}$${abs.toFixed(0)}`
}

function findMetric(statementData, keywords) {
  if (!statementData?.sections) return {}
  const result = {}
  for (const filing of statementData.sections) {
    for (const section of (filing.sections || [])) {
      for (const item of (section.items || [])) {
        const label = (item.label || '').toLowerCase()
        if (keywords.some(k => label.includes(k.toLowerCase()))) {
          for (const [period, value] of Object.entries(item.values || {})) {
            if (result[period] === undefined) {
              const v = parseNum(value)
              if (v !== null) result[period] = v
            }
          }
        }
      }
    }
  }
  return result
}

function findFirstMetric(statementData, keywordSets) {
  for (const keywords of keywordSets) {
    const r = findMetric(statementData, keywords)
    if (Object.keys(r).length > 0) return r
  }
  return {}
}

function toSortedSeries(obj) {
  return Object.entries(obj)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([year, val]) => ({ year, val }))
}

// ─── Common Chart Options ─────────────────────────────────────────────────────

const COLORS = {
  green: '#10b981',
  greenBg: 'rgba(16, 185, 129, 0.2)',
  red: '#f43f5e',
  redBg: 'rgba(244, 63, 94, 0.2)',
  blue: '#3b82f6',
  blueBg: 'rgba(59, 130, 246, 0.2)',
  gold: '#f59e0b',
  goldBg: 'rgba(245, 158, 11, 0.2)',
  purple: '#8b5cf6',
  purpleBg: 'rgba(139, 92, 246, 0.2)',
  orange: '#f97316',
  orangeBg: 'rgba(249, 115, 22, 0.2)',
  teal: '#14b8a6',
  tealBg: 'rgba(20, 184, 166, 0.2)',
  pink: '#ec4899',
}

function baseOptions(yFormat) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 800, easing: 'easeOutQuart' },
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: {
        labels: { color: '#cbd5e1', font: { size: 13, family: 'DM Sans' }, padding: 16, usePointStyle: true },
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        titleColor: '#f1f5f9',
        bodyColor: '#cbd5e1',
        padding: 14,
        cornerRadius: 10,
        bodyFont: { size: 14, family: 'DM Sans' },
        titleFont: { size: 14, weight: 600, family: 'DM Sans' },
        boxPadding: 4,
      },
    },
    scales: {
      x: {
        ticks: { color: '#94a3b8', font: { size: 14, weight: 600, family: 'DM Sans' } },
        grid: { color: 'rgba(100, 116, 139, 0.12)' },
        border: { color: 'rgba(100, 116, 139, 0.2)' },
      },
      y: {
        ticks: {
          color: '#94a3b8',
          font: { size: 12, family: 'DM Sans' },
          callback: yFormat || ((v) => formatMoney(v)),
        },
        grid: { color: 'rgba(100, 116, 139, 0.12)' },
        border: { display: false },
      },
    },
  }
}

// ─── Chart Wrapper ────────────────────────────────────────────────────────────

function ChartCard({ emoji, title, subtitle, children, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className="card chart-card"
      style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column' }}
    >
      <h3 style={{
        fontFamily: 'Outfit, sans-serif',
        fontWeight: 700,
        fontSize: '1.1rem',
        color: 'white',
        marginBottom: '0.25rem',
      }}>
        {emoji} {title}
      </h3>
      <p style={{ color: '#94a3b8', fontSize: '0.8rem', marginBottom: '1rem', lineHeight: 1.4 }}>
        {subtitle}
      </p>
      <div style={{ flex: 1, minHeight: 0, position: 'relative', height: '280px' }}>
        {children}
      </div>
    </motion.div>
  )
}

// ─── Individual Charts ────────────────────────────────────────────────────────

function RevenueChart({ data, companyName }) {
  const series = toSortedSeries(data)
  if (series.length === 0) return <NoData />

  const chartData = {
    labels: series.map(s => s.year),
    datasets: [{
      label: 'Revenue',
      data: series.map(s => s.val),
      backgroundColor: series.map((s, i) =>
        i === 0 ? COLORS.green : s.val >= series[i - 1].val ? COLORS.green : COLORS.red
      ),
      borderRadius: 8,
      borderSkipped: false,
    }],
  }

  const opts = {
    ...baseOptions(),
    plugins: {
      ...baseOptions().plugins,
      legend: { display: false },
      tooltip: {
        ...baseOptions().plugins.tooltip,
        callbacks: {
          label: (ctx) => `In ${ctx.label}, ${companyName} made ${formatMoney(ctx.parsed.y)}`,
        },
      },
    },
  }

  return <Bar data={chartData} options={opts} />
}

function RevenueGrowthChart({ data, companyName }) {
  const series = toSortedSeries(data)
  if (series.length < 2) return <NoData msg="Need at least 2 years of data" />

  const growthData = series.slice(1).map((s, i) => ({
    year: s.year,
    pct: ((s.val - series[i].val) / Math.abs(series[i].val)) * 100,
  }))

  const chartData = {
    labels: growthData.map(g => g.year),
    datasets: [{
      label: 'Revenue Growth %',
      data: growthData.map(g => g.pct),
      borderColor: COLORS.green,
      backgroundColor: COLORS.greenBg,
      segment: {
        borderColor: (ctx) => {
          const val = ctx.p1.parsed.y
          return val >= 0 ? COLORS.green : COLORS.red
        },
      },
      pointBackgroundColor: growthData.map(g => g.pct >= 0 ? COLORS.green : COLORS.red),
      pointRadius: 6,
      pointHoverRadius: 9,
      tension: 0.3,
      fill: false,
      borderWidth: 3,
    }],
  }

  const opts = {
    ...baseOptions((v) => `${v.toFixed(0)}%`),
    plugins: {
      ...baseOptions().plugins,
      legend: { display: false },
      tooltip: {
        ...baseOptions().plugins.tooltip,
        callbacks: {
          label: (ctx) => {
            const pct = ctx.parsed.y.toFixed(1)
            return pct >= 0
              ? `Revenue grew ${pct}% in ${ctx.label}`
              : `Revenue shrank ${Math.abs(pct)}% in ${ctx.label}`
          },
        },
      },
      annotation: undefined,
    },
    scales: {
      ...baseOptions((v) => `${v.toFixed(0)}%`).scales,
      y: {
        ...baseOptions((v) => `${v.toFixed(0)}%`).scales.y,
        ticks: {
          ...baseOptions((v) => `${v.toFixed(0)}%`).scales.y.ticks,
          callback: (v) => `${v.toFixed(0)}%`,
        },
      },
    },
  }

  return <Line data={chartData} options={opts} />
}

function ExpenseBreakdownChart({ incomeData, companyName }) {
  const revenue = findFirstMetric(incomeData, [
    ['total revenue', 'net revenue', 'revenue'],
    ['net sales', 'total net sales'],
    ['sales'],
  ])
  const cogs = findFirstMetric(incomeData, [
    ['cost of revenue', 'cost of sales', 'cost of goods'],
    ['cost of products'],
  ])
  const rd = findFirstMetric(incomeData, [
    ['research and development', 'research & development', 'r&d'],
  ])
  const sga = findFirstMetric(incomeData, [
    ['selling, general', 'selling and marketing'],
    ['marketing', 'sales and marketing'],
    ['general and administrative'],
  ])
  const netIncome = findFirstMetric(incomeData, [
    ['net income', 'net earnings'],
  ])

  // Use the latest year that has revenue data
  const revSeries = toSortedSeries(revenue)
  if (revSeries.length === 0) return <NoData msg="No revenue data found" />
  const latestYear = revSeries[revSeries.length - 1].year
  const latestRev = revSeries[revSeries.length - 1].val

  const slices = []
  const cogsVal = cogs[latestYear]
  const rdVal = rd[latestYear]
  const sgaVal = sga[latestYear]
  const niVal = netIncome[latestYear]

  if (cogsVal && cogsVal > 0) slices.push({ label: 'Cost of Products/Services', val: Math.abs(cogsVal), color: COLORS.red })
  if (rdVal && rdVal > 0) slices.push({ label: 'Research & Development', val: Math.abs(rdVal), color: COLORS.blue })
  if (sgaVal && sgaVal > 0) slices.push({ label: 'Sales & Marketing', val: Math.abs(sgaVal), color: COLORS.orange })
  if (niVal) slices.push({ label: 'Profit (what\'s left!)', val: Math.abs(niVal), color: COLORS.green })

  // If we have revenue but few breakdowns, show what we have
  const accountedFor = slices.reduce((a, s) => a + s.val, 0)
  const other = latestRev - accountedFor
  if (other > 0 && slices.length > 0) slices.push({ label: 'Other Costs', val: other, color: COLORS.purple })

  if (slices.length === 0) return <NoData msg="Can't break down expenses for this company" />

  const total = slices.reduce((a, s) => a + s.val, 0)

  const chartData = {
    labels: slices.map(s => s.label),
    datasets: [{
      data: slices.map(s => s.val),
      backgroundColor: slices.map(s => s.color),
      borderColor: 'rgba(10, 22, 40, 0.8)',
      borderWidth: 3,
      hoverOffset: 8,
    }],
  }

  const opts = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 800, easing: 'easeOutQuart', animateRotate: true },
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: '#cbd5e1',
          font: { size: 12, family: 'DM Sans' },
          padding: 12,
          usePointStyle: true,
          generateLabels: (chart) => {
            const data = chart.data
            return data.labels.map((label, i) => {
              const val = data.datasets[0].data[i]
              const pct = ((val / total) * 100).toFixed(0)
              return {
                text: `${label} (${pct}%)`,
                fillStyle: data.datasets[0].backgroundColor[i],
                strokeStyle: 'transparent',
                pointStyle: 'circle',
                index: i,
              }
            })
          },
        },
      },
      tooltip: {
        ...baseOptions().plugins.tooltip,
        callbacks: {
          label: (ctx) => {
            const pct = ((ctx.parsed / total) * 100).toFixed(1)
            return `${ctx.label}: ${formatMoney(ctx.parsed)} (${pct}%)`
          },
        },
      },
    },
  }

  return <Doughnut data={chartData} options={opts} />
}

function ProfitMarginsChart({ incomeData, companyName }) {
  const revenue = findFirstMetric(incomeData, [
    ['total revenue', 'net revenue', 'revenue'], ['net sales'], ['sales'],
  ])
  const cogs = findFirstMetric(incomeData, [
    ['cost of revenue', 'cost of sales', 'cost of goods'], ['cost of products'],
  ])
  const opIncome = findFirstMetric(incomeData, [
    ['operating income', 'income from operations'], ['operating profit'],
  ])
  const netIncome = findFirstMetric(incomeData, [
    ['net income', 'net earnings'],
  ])

  const revSeries = toSortedSeries(revenue)
  if (revSeries.length === 0) return <NoData msg="No revenue data found" />

  const years = revSeries.map(s => s.year)
  const grossMargin = years.map(y => {
    const r = revenue[y]; const c = cogs[y]
    return (r && c) ? ((r - Math.abs(c)) / r) * 100 : null
  })
  const opMargin = years.map(y => {
    const r = revenue[y]; const o = opIncome[y]
    return (r && o) ? (o / r) * 100 : null
  })
  const netMargin = years.map(y => {
    const r = revenue[y]; const n = netIncome[y]
    return (r && n) ? (n / r) * 100 : null
  })

  const datasets = []
  if (grossMargin.some(v => v !== null))
    datasets.push({
      label: 'Gross Profit %',
      data: grossMargin,
      borderColor: COLORS.green, backgroundColor: COLORS.greenBg,
      pointRadius: 5, pointHoverRadius: 8, tension: 0.3, borderWidth: 3, fill: false,
    })
  if (opMargin.some(v => v !== null))
    datasets.push({
      label: 'Operating Profit %',
      data: opMargin,
      borderColor: COLORS.blue, backgroundColor: COLORS.blueBg,
      pointRadius: 5, pointHoverRadius: 8, tension: 0.3, borderWidth: 3, fill: false,
    })
  if (netMargin.some(v => v !== null))
    datasets.push({
      label: 'Net Profit %',
      data: netMargin,
      borderColor: COLORS.gold, backgroundColor: COLORS.goldBg,
      pointRadius: 5, pointHoverRadius: 8, tension: 0.3, borderWidth: 3, fill: false,
    })

  if (datasets.length === 0) return <NoData msg="Not enough data for margin calculations" />

  const chartData = { labels: years, datasets }

  const latestRev = revSeries[revSeries.length - 1]
  const latestNetMargin = netMargin[netMargin.length - 1]

  const opts = {
    ...baseOptions((v) => `${v.toFixed(0)}%`),
    scales: {
      ...baseOptions((v) => `${v.toFixed(0)}%`).scales,
      y: {
        ...baseOptions((v) => `${v.toFixed(0)}%`).scales.y,
        ticks: {
          ...baseOptions((v) => `${v.toFixed(0)}%`).scales.y.ticks,
          callback: (v) => `${v.toFixed(0)}%`,
        },
      },
    },
    plugins: {
      ...baseOptions().plugins,
      tooltip: {
        ...baseOptions().plugins.tooltip,
        callbacks: {
          label: (ctx) => {
            const pct = ctx.parsed.y?.toFixed(1)
            if (ctx.dataset.label.includes('Net')) {
              const cents = Math.round(Math.abs(pct))
              return `In ${ctx.label}, ${companyName} kept ${cents} cents of every dollar as profit`
            }
            return `${ctx.dataset.label}: ${pct}% in ${ctx.label}`
          },
        },
      },
    },
  }

  return <Line data={chartData} options={opts} />
}

function BalanceSheetChart({ bsData, companyName }) {
  const assets = findFirstMetric(bsData, [['total assets']])
  const liabilities = findFirstMetric(bsData, [
    ['total liabilities'], ['total liabilities and'],
  ])
  const equity = findFirstMetric(bsData, [
    ['stockholders\' equity', 'stockholders equity', 'shareholders equity', 'total equity'],
    ['total shareholders'],
  ])

  const assetsSeries = toSortedSeries(assets)
  if (assetsSeries.length === 0) return <NoData msg="No balance sheet totals found" />
  const years = assetsSeries.map(s => s.year)

  const datasets = []
  datasets.push({
    label: 'Assets (what they own)',
    data: years.map(y => assets[y] || 0),
    backgroundColor: COLORS.green,
    borderRadius: 6,
    borderSkipped: false,
  })
  if (Object.keys(liabilities).length > 0)
    datasets.push({
      label: 'Liabilities (what they owe)',
      data: years.map(y => Math.abs(liabilities[y] || 0)),
      backgroundColor: COLORS.red,
      borderRadius: 6,
      borderSkipped: false,
    })
  if (Object.keys(equity).length > 0)
    datasets.push({
      label: 'Equity (shareholders)',
      data: years.map(y => Math.abs(equity[y] || 0)),
      backgroundColor: COLORS.blue,
      borderRadius: 6,
      borderSkipped: false,
    })

  const chartData = { labels: years, datasets }

  const opts = {
    ...baseOptions(),
    plugins: {
      ...baseOptions().plugins,
      tooltip: {
        ...baseOptions().plugins.tooltip,
        callbacks: {
          label: (ctx) => {
            const category = ctx.dataset.label.split(' (')[0]
            return `In ${ctx.label}, ${companyName} had ${formatMoney(ctx.parsed.y)} in ${category}`
          },
        },
      },
    },
  }

  return <Bar data={chartData} options={opts} />
}

function CashFlowChart({ cfData, companyName }) {
  const opCF = findFirstMetric(cfData, [
    ['operating activities', 'cash from operations', 'cash provided by operating'],
    ['net cash from operating'],
  ])
  const invCF = findFirstMetric(cfData, [
    ['investing activities', 'cash from investing', 'cash used in investing'],
    ['net cash from investing', 'net cash used in investing'],
  ])
  const finCF = findFirstMetric(cfData, [
    ['financing activities', 'cash from financing', 'cash used in financing'],
    ['net cash from financing', 'net cash used in financing'],
  ])

  const allYears = new Set([
    ...Object.keys(opCF), ...Object.keys(invCF), ...Object.keys(finCF),
  ])
  const years = [...allYears].sort()
  if (years.length === 0) return <NoData msg="No cash flow data found" />

  const chartData = {
    labels: years,
    datasets: [
      {
        label: 'Operating (running the business)',
        data: years.map(y => opCF[y] || 0),
        backgroundColor: COLORS.green,
        borderRadius: 6, borderSkipped: false,
      },
      {
        label: 'Investing (buying/selling stuff)',
        data: years.map(y => invCF[y] || 0),
        backgroundColor: COLORS.orange,
        borderRadius: 6, borderSkipped: false,
      },
      {
        label: 'Financing (borrowing/paying back)',
        data: years.map(y => finCF[y] || 0),
        backgroundColor: COLORS.blue,
        borderRadius: 6, borderSkipped: false,
      },
    ],
  }

  const opts = {
    ...baseOptions(),
    plugins: {
      ...baseOptions().plugins,
      tooltip: {
        ...baseOptions().plugins.tooltip,
        callbacks: {
          label: (ctx) => {
            const type = ctx.dataset.label.split(' (')[0]
            const val = ctx.parsed.y
            const verb = val >= 0 ? 'generated' : 'used'
            return `${companyName} ${verb} ${formatMoney(Math.abs(val))} from ${type} in ${ctx.label}`
          },
        },
      },
    },
  }

  return <Bar data={chartData} options={opts} />
}

function NoData({ msg }) {
  return (
    <div style={{
      height: '100%', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', color: '#64748b',
    }}>
      <BarChart3 style={{ width: 40, height: 40, marginBottom: '0.75rem', opacity: 0.4 }} />
      <p style={{ fontSize: '0.85rem' }}>{msg || 'No data available'}</p>
    </div>
  )
}

// ─── Company Logo (reused from EdgarPanel) ────────────────────────────────────

const COMPANY_DOMAINS = {
  AAPL: 'apple.com', GOOGL: 'google.com', AMZN: 'amazon.com', TSLA: 'tesla.com',
  MSFT: 'microsoft.com', NFLX: 'netflix.com', NKE: 'nike.com', DIS: 'disney.com',
  NVDA: 'nvidia.com', META: 'meta.com', MCD: 'mcdonalds.com', SBUX: 'starbucks.com',
  KO: 'coca-cola.com', PEP: 'pepsico.com', CMG: 'chipotle.com', RBLX: 'roblox.com',
  EA: 'ea.com', SPOT: 'spotify.com', WBD: 'wbd.com', TTWO: 'take2games.com',
  WMT: 'walmart.com', TGT: 'target.com', COST: 'costco.com', LULU: 'lululemon.com',
  RL: 'ralphlauren.com', JNJ: 'jnj.com', PFE: 'pfizer.com', UNH: 'unitedhealthgroup.com',
  JPM: 'jpmorganchase.com', V: 'visa.com', PYPL: 'paypal.com', GS: 'goldmansachs.com',
  UBER: 'uber.com', ABNB: 'airbnb.com', F: 'ford.com', DAL: 'delta.com',
  XOM: 'exxonmobil.com', NEE: 'nexteraenergy.com',
}

// ─── Main ChartsPanel ─────────────────────────────────────────────────────────

export default function ChartsPanel({ edgarData, onSwitchToEdgar }) {
  const ticker = edgarData?.ticker || ''
  const results = edgarData?.results

  const companyName = ticker || 'Company'
  const domain = COMPANY_DOMAINS[ticker]

  // Extract revenue for Chart 1 & 2
  const revenue = useMemo(() => {
    if (!results?.income_statement) return {}
    return findFirstMetric(results.income_statement, [
      ['total revenue', 'net revenue', 'revenue'],
      ['net sales', 'total net sales'],
      ['sales'],
    ])
  }, [results])

  if (!results) {
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
          <BarChart3 style={{ width: 40, height: 40, color: '#64748b' }} />
        </div>
        <h3 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 600, color: 'white', marginBottom: '0.5rem' }}>
          No Data Yet
        </h3>
        <p style={{ color: '#94a3b8', maxWidth: 340, lineHeight: 1.6, marginBottom: '1.25rem' }}>
          Search for a company on the EDGAR tab first, then come back here to see charts.
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

  return (
    <div style={{ paddingBottom: '2rem' }}>
      {/* Company header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        {domain ? (
          <img
            src={`https://logo.clearbit.com/${domain}`}
            alt={companyName}
            width={48} height={48}
            style={{ borderRadius: 12, background: 'white', objectFit: 'contain' }}
            onError={(e) => { e.target.style.display = 'none' }}
          />
        ) : (
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: 'linear-gradient(135deg, #3b82f6, #10b981)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, color: 'white', fontSize: '1.1rem',
          }}>
            {ticker.slice(0, 2)}
          </div>
        )}
        <div>
          <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, color: 'white', fontSize: '1.5rem' }}>
            {companyName} Charts
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
            Financial data visualized from SEC 10-K filings
          </p>
        </div>
      </div>

      {/* Charts grid */}
      <div className="charts-grid">
        <ChartCard
          emoji="💰"
          title="How Much Money Does This Company Make?"
          subtitle="Total revenue (money coming in) for each year. Green bars mean growth, red means decline."
          delay={0}
        >
          <RevenueChart data={revenue} companyName={companyName} />
        </ChartCard>

        <ChartCard
          emoji="📈"
          title="Is the Company Growing or Shrinking?"
          subtitle="How much revenue changed compared to the year before."
          delay={0.1}
        >
          <RevenueGrowthChart data={revenue} companyName={companyName} />
        </ChartCard>

        <ChartCard
          emoji="🍕"
          title="Where Does the Money Go?"
          subtitle="How the company splits its money between costs, research, marketing, and profit."
          delay={0.2}
        >
          <ExpenseBreakdownChart incomeData={results.income_statement} companyName={companyName} />
        </ChartCard>

        <ChartCard
          emoji="💵"
          title="How Much Does the Company Keep?"
          subtitle="Profit margins — how many cents of every dollar the company keeps after costs."
          delay={0.3}
        >
          <ProfitMarginsChart incomeData={results.income_statement} companyName={companyName} />
        </ChartCard>

        <ChartCard
          emoji="🏦"
          title="What Does the Company Own vs Owe?"
          subtitle="Assets (what they own), Liabilities (what they owe), and Equity (what belongs to shareholders)."
          delay={0.4}
        >
          <BalanceSheetChart bsData={results.balance_sheet} companyName={companyName} />
        </ChartCard>

        <ChartCard
          emoji="💸"
          title="Cash Flow — Is Money Coming In or Going Out?"
          subtitle="Where cash comes from (operations) and where it goes (investing and financing)."
          delay={0.5}
        >
          <CashFlowChart cfData={results.cash_flow} companyName={companyName} />
        </ChartCard>
      </div>
    </div>
  )
}
