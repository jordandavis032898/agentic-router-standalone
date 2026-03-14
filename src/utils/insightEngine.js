/**
 * Proactive Insight Engine
 * Automatically analyzes EDGAR financial data and surfaces insights.
 */

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseNum(val) {
  if (val === null || val === undefined || val === '') return null
  while (typeof val === 'object' && val !== null && !Array.isArray(val) && val.value !== undefined) {
    val = val.value
  }
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

export function findFirstMetric(statementData, keywordSets) {
  for (const keywords of keywordSets) {
    const r = findMetric(statementData, keywords)
    if (Object.keys(r).length > 0) return r
  }
  return {}
}

export function toSortedPairs(obj) {
  return Object.entries(obj)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([year, val]) => ({ year, val }))
}

export function formatMoney(value) {
  if (value === null || value === undefined) return '--'
  const abs = Math.abs(value)
  const sign = value < 0 ? '-' : ''
  if (abs >= 1e12) return `${sign}$${(abs / 1e12).toFixed(1)}T`
  if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(1)}B`
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(0)}M`
  if (abs >= 1e3) return `${sign}$${(abs / 1e3).toFixed(0)}K`
  return `${sign}$${abs.toFixed(0)}`
}

export function pct(val) {
  if (val === null || val === undefined) return '--'
  return `${(val * 100).toFixed(1)}%`
}

// ─── Severity levels ─────────────────────────────────────────────────────────

export const SEVERITY = {
  CRITICAL: 'critical',   // Red
  WARNING: 'warning',     // Yellow
  OPPORTUNITY: 'opportunity', // Blue
  POSITIVE: 'positive',   // Green
}

const SEVERITY_COLORS = {
  [SEVERITY.CRITICAL]: { bg: 'rgba(239, 68, 68, 0.1)', border: 'rgba(239, 68, 68, 0.3)', text: '#ef4444', emoji: '\u{1F534}' },
  [SEVERITY.WARNING]: { bg: 'rgba(245, 158, 11, 0.1)', border: 'rgba(245, 158, 11, 0.3)', text: '#f59e0b', emoji: '\u{1F7E1}' },
  [SEVERITY.OPPORTUNITY]: { bg: 'rgba(59, 130, 246, 0.1)', border: 'rgba(59, 130, 246, 0.3)', text: '#3b82f6', emoji: '\u{1F535}' },
  [SEVERITY.POSITIVE]: { bg: 'rgba(16, 185, 129, 0.1)', border: 'rgba(16, 185, 129, 0.3)', text: '#10b981', emoji: '\u{1F7E2}' },
}

export function getSeverityStyle(severity) {
  return SEVERITY_COLORS[severity] || SEVERITY_COLORS[SEVERITY.WARNING]
}

// ─── Main analysis function ──────────────────────────────────────────────────

export function analyzeFinancialData(results) {
  if (!results) return { insights: [], healthScore: null }

  const insights = []
  const is = results.income_statement
  const bs = results.balance_sheet
  const cf = results.cash_flow

  // Extract key metrics
  const revenue = findFirstMetric(is, [
    ['revenue', 'net revenue', 'total revenue'],
    ['net sales', 'total net sales', 'sales'],
  ])
  const netIncome = findFirstMetric(is, [
    ['net income', 'net earnings'],
  ])
  const grossProfit = findFirstMetric(is, [
    ['gross profit', 'gross margin'],
  ])
  const operatingIncome = findFirstMetric(is, [
    ['operating income', 'income from operations'],
  ])
  const costOfRevenue = findFirstMetric(is, [
    ['cost of revenue', 'cost of goods sold', 'cost of sales', 'cogs'],
  ])

  // Balance sheet metrics
  const totalAssets = findFirstMetric(bs, [['total assets']])
  const totalLiabilities = findFirstMetric(bs, [['total liabilities']])
  const currentAssets = findFirstMetric(bs, [['total current assets', 'current assets']])
  const currentLiabilities = findFirstMetric(bs, [['total current liabilities', 'current liabilities']])
  const longTermDebt = findFirstMetric(bs, [['long-term debt', 'long term debt', 'notes payable']])
  const totalEquity = findFirstMetric(bs, [
    ['total stockholders', 'total equity', "shareholders' equity", 'stockholders equity'],
  ])
  const cash = findFirstMetric(bs, [
    ['cash and cash equivalents', 'cash and equivalents', 'cash'],
  ])
  const inventory = findFirstMetric(bs, [['inventory', 'inventories']])

  // Cash flow metrics
  const operatingCF = findFirstMetric(cf, [
    ['net cash provided by operating', 'cash from operations', 'operating activities'],
  ])
  const capex = findFirstMetric(cf, [
    ['capital expenditures', 'purchases of property', 'capex'],
  ])

  // ─── 1. Revenue Analysis ────────────────────────────────────────────────
  const revSeries = toSortedPairs(revenue)
  if (revSeries.length >= 2) {
    const growthRates = []
    for (let i = 1; i < revSeries.length; i++) {
      if (revSeries[i - 1].val !== 0) {
        growthRates.push({
          year: revSeries[i].year,
          rate: (revSeries[i].val - revSeries[i - 1].val) / Math.abs(revSeries[i - 1].val),
        })
      }
    }

    if (growthRates.length >= 1) {
      const latest = growthRates[growthRates.length - 1]
      const latestPct = (latest.rate * 100).toFixed(1)

      if (latest.rate > 0.3) {
        insights.push({
          severity: SEVERITY.POSITIVE,
          category: 'Revenue',
          title: `Revenue surging ${latestPct}% YoY`,
          description: `Revenue grew by ${latestPct}% in ${latest.year}. This is exceptional growth that significantly outpaces most companies.`,
          metric: { label: 'Revenue Growth', value: `${latestPct}%` },
        })
      } else if (latest.rate > 0.1) {
        insights.push({
          severity: SEVERITY.POSITIVE,
          category: 'Revenue',
          title: `Healthy revenue growth at ${latestPct}%`,
          description: `Revenue grew by ${latestPct}% in ${latest.year}, indicating solid business momentum.`,
          metric: { label: 'Revenue Growth', value: `${latestPct}%` },
        })
      } else if (latest.rate < -0.1) {
        insights.push({
          severity: SEVERITY.CRITICAL,
          category: 'Revenue',
          title: `Revenue declined ${Math.abs(latestPct)}% YoY`,
          description: `Revenue fell by ${Math.abs(latestPct)}% in ${latest.year}. This is a significant decline that warrants investigation into the underlying causes.`,
          metric: { label: 'Revenue Decline', value: `${latestPct}%` },
        })
      } else if (latest.rate < 0) {
        insights.push({
          severity: SEVERITY.WARNING,
          category: 'Revenue',
          title: `Revenue slightly declined ${Math.abs(latestPct)}%`,
          description: `Revenue dipped ${Math.abs(latestPct)}% in ${latest.year}. Worth monitoring whether this is a temporary blip or the start of a trend.`,
          metric: { label: 'Revenue Change', value: `${latestPct}%` },
        })
      }

      // Check for deceleration
      if (growthRates.length >= 2) {
        const prev = growthRates[growthRates.length - 2]
        if (prev.rate > 0.05 && latest.rate > 0 && latest.rate < prev.rate * 0.6) {
          insights.push({
            severity: SEVERITY.WARNING,
            category: 'Revenue',
            title: 'Revenue growth decelerating',
            description: `Growth slowed from ${(prev.rate * 100).toFixed(1)}% to ${latestPct}%. This deceleration could indicate market saturation or increased competition.`,
            metric: { label: 'Growth Deceleration', value: `${(prev.rate * 100).toFixed(1)}% \u2192 ${latestPct}%` },
          })
        }
      }

      // Consecutive declines
      if (growthRates.length >= 3) {
        const last3 = growthRates.slice(-3)
        if (last3.every(g => g.rate < 0)) {
          insights.push({
            severity: SEVERITY.CRITICAL,
            category: 'Revenue',
            title: 'Revenue declining 3+ consecutive periods',
            description: `Revenue has declined for ${last3.length} consecutive periods. This persistent decline signals fundamental challenges in the business.`,
            metric: { label: 'Consecutive Declines', value: `${last3.length} periods` },
          })
        }
      }
    }
  }

  // ─── 2. Margin Analysis ─────────────────────────────────────────────────
  const revSorted = toSortedPairs(revenue)
  const grossSorted = toSortedPairs(grossProfit)

  if (revSorted.length >= 2 && grossSorted.length >= 2) {
    // Calculate gross margins by year
    const margins = {}
    for (const { year, val } of grossSorted) {
      const rev = revenue[year]
      if (rev && rev !== 0) {
        margins[year] = val / rev
      }
    }
    const marginSeries = toSortedPairs(margins)

    if (marginSeries.length >= 2) {
      const latest = marginSeries[marginSeries.length - 1]
      const prev = marginSeries[marginSeries.length - 2]
      const changeBps = Math.round((latest.val - prev.val) * 10000)

      if (changeBps < -300) {
        insights.push({
          severity: SEVERITY.CRITICAL,
          category: 'Profitability',
          title: `Gross margin compressed ${Math.abs(changeBps)}bps`,
          description: `Gross margin fell from ${(prev.val * 100).toFixed(1)}% to ${(latest.val * 100).toFixed(1)}% (${changeBps}bps). This suggests rising costs or pricing pressure that's eating into profitability.`,
          metric: { label: 'Gross Margin', value: `${(latest.val * 100).toFixed(1)}%` },
        })
      } else if (changeBps > 300) {
        insights.push({
          severity: SEVERITY.OPPORTUNITY,
          category: 'Profitability',
          title: `Gross margin expanded ${changeBps}bps`,
          description: `Gross margin improved from ${(prev.val * 100).toFixed(1)}% to ${(latest.val * 100).toFixed(1)}% (+${changeBps}bps). This indicates improving pricing power or cost efficiency.`,
          metric: { label: 'Gross Margin', value: `${(latest.val * 100).toFixed(1)}%` },
        })
      }
    }
  }

  // Operating margin
  if (revSorted.length >= 1) {
    const opMargins = {}
    for (const { year } of revSorted) {
      const rev = revenue[year]
      const opInc = operatingIncome[year]
      if (rev && rev !== 0 && opInc !== undefined) {
        opMargins[year] = opInc / rev
      }
    }
    const opMarginSeries = toSortedPairs(opMargins)
    if (opMarginSeries.length >= 1) {
      const latest = opMarginSeries[opMarginSeries.length - 1]
      if (latest.val < 0) {
        insights.push({
          severity: SEVERITY.CRITICAL,
          category: 'Profitability',
          title: `Negative operating margin (${(latest.val * 100).toFixed(1)}%)`,
          description: `Operating income is negative, meaning core operations are not profitable. This is a major concern unless the company is in a high-growth investment phase.`,
          metric: { label: 'Operating Margin', value: `${(latest.val * 100).toFixed(1)}%` },
        })
      } else if (latest.val > 0.25) {
        insights.push({
          severity: SEVERITY.POSITIVE,
          category: 'Profitability',
          title: `Strong operating margin (${(latest.val * 100).toFixed(1)}%)`,
          description: `An operating margin above 25% indicates excellent operational efficiency and strong competitive positioning.`,
          metric: { label: 'Operating Margin', value: `${(latest.val * 100).toFixed(1)}%` },
        })
      }
    }
  }

  // ─── 3. Balance Sheet Health ────────────────────────────────────────────
  const curAssets = toSortedPairs(currentAssets)
  const curLiabilities = toSortedPairs(currentLiabilities)

  if (curAssets.length > 0 && curLiabilities.length > 0) {
    const latestCA = curAssets[curAssets.length - 1]
    const latestCL = curLiabilities[curLiabilities.length - 1]
    if (latestCL.val && latestCL.val !== 0) {
      const currentRatio = latestCA.val / latestCL.val

      if (currentRatio < 1.0) {
        insights.push({
          severity: SEVERITY.CRITICAL,
          category: 'Liquidity',
          title: `Current ratio below 1.0 (${currentRatio.toFixed(2)})`,
          description: `Current liabilities exceed current assets. This means the company may struggle to meet short-term obligations. Industry median is typically 1.5-2.0. A ratio below 1.0 signals potential liquidity risk.`,
          metric: { label: 'Current Ratio', value: currentRatio.toFixed(2) },
        })
      } else if (currentRatio > 3.0) {
        insights.push({
          severity: SEVERITY.OPPORTUNITY,
          category: 'Liquidity',
          title: `High current ratio (${currentRatio.toFixed(2)})`,
          description: `Current ratio of ${currentRatio.toFixed(2)} suggests very strong liquidity but may also indicate inefficient use of assets. Some investors see this as excess cash not being deployed for growth.`,
          metric: { label: 'Current Ratio', value: currentRatio.toFixed(2) },
        })
      } else if (currentRatio >= 1.5) {
        insights.push({
          severity: SEVERITY.POSITIVE,
          category: 'Liquidity',
          title: `Healthy current ratio (${currentRatio.toFixed(2)})`,
          description: `Current ratio of ${currentRatio.toFixed(2)} is in a healthy range, indicating the company can comfortably meet short-term obligations.`,
          metric: { label: 'Current Ratio', value: currentRatio.toFixed(2) },
        })
      }
    }
  }

  // Debt-to-equity
  const debtSeries = toSortedPairs(longTermDebt)
  const equitySeries = toSortedPairs(totalEquity)
  if (debtSeries.length > 0 && equitySeries.length > 0) {
    const latestDebt = debtSeries[debtSeries.length - 1]
    const latestEquity = equitySeries[equitySeries.length - 1]
    if (latestEquity.val && latestEquity.val !== 0) {
      const deRatio = latestDebt.val / latestEquity.val
      if (deRatio > 2.0) {
        insights.push({
          severity: SEVERITY.WARNING,
          category: 'Leverage',
          title: `High debt-to-equity ratio (${deRatio.toFixed(2)})`,
          description: `D/E of ${deRatio.toFixed(2)} means the company relies heavily on debt financing. This increases financial risk, especially if interest rates rise. S&P 500 median is around 0.8-1.2.`,
          metric: { label: 'Debt/Equity', value: deRatio.toFixed(2) },
        })
      } else if (deRatio < 0.3 && latestDebt.val > 0) {
        insights.push({
          severity: SEVERITY.POSITIVE,
          category: 'Leverage',
          title: `Low leverage (D/E: ${deRatio.toFixed(2)})`,
          description: `Debt-to-equity of ${deRatio.toFixed(2)} indicates conservative financial management. The company has strong balance sheet flexibility.`,
          metric: { label: 'Debt/Equity', value: deRatio.toFixed(2) },
        })
      }
    }

    // Check for debt increase
    if (debtSeries.length >= 2) {
      const prev = debtSeries[debtSeries.length - 2]
      if (prev.val && prev.val !== 0) {
        const debtChange = (latestDebt.val - prev.val) / Math.abs(prev.val)
        if (debtChange > 0.4) {
          insights.push({
            severity: SEVERITY.WARNING,
            category: 'Leverage',
            title: `Long-term debt up ${(debtChange * 100).toFixed(0)}% YoY`,
            description: `Long-term debt increased from ${formatMoney(prev.val)} to ${formatMoney(latestDebt.val)}. Check if this was used for growth investments or to cover operating shortfalls.`,
            metric: { label: 'Debt Change', value: `+${(debtChange * 100).toFixed(0)}%` },
          })
        }
      }
    }
  }

  // ─── 4. Cash Flow Analysis ──────────────────────────────────────────────
  const opCFSeries = toSortedPairs(operatingCF)
  if (opCFSeries.length > 0) {
    const latest = opCFSeries[opCFSeries.length - 1]
    if (latest.val < 0) {
      insights.push({
        severity: SEVERITY.CRITICAL,
        category: 'Cash Flow',
        title: `Negative operating cash flow (${formatMoney(latest.val)})`,
        description: `The company is burning cash from core operations. This is sustainable only if the company has significant cash reserves and is in a growth investment phase. Otherwise, it's a major red flag.`,
        metric: { label: 'Operating CF', value: formatMoney(latest.val) },
      })
    } else if (latest.val > 0) {
      // Check cash conversion quality
      const netIncomeSeries = toSortedPairs(netIncome)
      if (netIncomeSeries.length > 0) {
        const latestNI = netIncomeSeries[netIncomeSeries.length - 1]
        if (latestNI.val && latestNI.val > 0) {
          const cashConversion = latest.val / latestNI.val
          if (cashConversion > 1.2) {
            insights.push({
              severity: SEVERITY.POSITIVE,
              category: 'Cash Flow',
              title: `Strong cash conversion (${(cashConversion * 100).toFixed(0)}%)`,
              description: `Operating cash flow is ${(cashConversion * 100).toFixed(0)}% of net income, indicating high-quality earnings. Cash from operations significantly exceeds reported profit, which is a sign of strong underlying economics.`,
              metric: { label: 'Cash Conversion', value: `${(cashConversion * 100).toFixed(0)}%` },
            })
          } else if (cashConversion < 0.5) {
            insights.push({
              severity: SEVERITY.WARNING,
              category: 'Cash Flow',
              title: `Weak cash conversion (${(cashConversion * 100).toFixed(0)}%)`,
              description: `Operating cash flow is only ${(cashConversion * 100).toFixed(0)}% of net income. This suggests earnings quality issues \u2014 the company reports profits but isn't generating proportional cash.`,
              metric: { label: 'Cash Conversion', value: `${(cashConversion * 100).toFixed(0)}%` },
            })
          }
        }
      }
    }
  }

  // Free cash flow
  const capexSeries = toSortedPairs(capex)
  if (opCFSeries.length > 0 && capexSeries.length > 0) {
    const latestOp = opCFSeries[opCFSeries.length - 1]
    const latestCapex = capexSeries[capexSeries.length - 1]
    const fcf = latestOp.val - Math.abs(latestCapex.val)
    if (fcf < 0 && latestOp.val > 0) {
      insights.push({
        severity: SEVERITY.WARNING,
        category: 'Cash Flow',
        title: `Negative free cash flow (${formatMoney(fcf)})`,
        description: `Despite positive operating cash flow, capital expenditures exceed it, resulting in negative free cash flow. This is common during expansion phases but unsustainable long-term.`,
        metric: { label: 'Free Cash Flow', value: formatMoney(fcf) },
      })
    }
  }

  // ─── 5. Calculate Health Score ──────────────────────────────────────────
  const healthScore = calculateHealthScore(insights, {
    revenue, netIncome, grossProfit, currentAssets, currentLiabilities,
    longTermDebt, totalEquity, operatingCF, capex,
  })

  return { insights, healthScore }
}

// ─── Health Score Calculator ─────────────────────────────────────────────────

function calculateHealthScore(insights, metrics) {
  let score = 75 // Start at baseline

  // Deduct/add based on insights
  for (const insight of insights) {
    switch (insight.severity) {
      case SEVERITY.CRITICAL:
        score -= 12
        break
      case SEVERITY.WARNING:
        score -= 5
        break
      case SEVERITY.OPPORTUNITY:
        score += 3
        break
      case SEVERITY.POSITIVE:
        score += 5
        break
    }
  }

  // Bonus for data completeness
  const hasRevenue = Object.keys(metrics.revenue || {}).length > 0
  const hasNetIncome = Object.keys(metrics.netIncome || {}).length > 0
  const hasBalanceSheet = Object.keys(metrics.currentAssets || {}).length > 0
  const hasCashFlow = Object.keys(metrics.operatingCF || {}).length > 0

  const dataComplete = [hasRevenue, hasNetIncome, hasBalanceSheet, hasCashFlow].filter(Boolean).length
  score += dataComplete * 2

  // Clamp
  score = Math.max(0, Math.min(100, score))

  return {
    score: Math.round(score),
    grade: getLetterGrade(score),
    dataCompleteness: dataComplete,
  }
}

function getLetterGrade(score) {
  if (score >= 95) return 'A+'
  if (score >= 90) return 'A'
  if (score >= 85) return 'B+'
  if (score >= 80) return 'B'
  if (score >= 70) return 'C'
  if (score >= 60) return 'D'
  return 'F'
}

// ─── Format insights as chat message ─────────────────────────────────────────

export function formatInsightsAsMessage(insights, ticker, healthScore) {
  if (insights.length === 0) {
    return `I analyzed **${ticker}**'s financials but didn't find any notable anomalies. The data looks clean!`
  }

  let msg = `## Financial Health Check: ${ticker}\n\n`

  if (healthScore) {
    msg += `**Health Score: ${healthScore.score}/100 (${healthScore.grade})**\n\n`
  }

  const critical = insights.filter(i => i.severity === SEVERITY.CRITICAL)
  const warnings = insights.filter(i => i.severity === SEVERITY.WARNING)
  const opportunities = insights.filter(i => i.severity === SEVERITY.OPPORTUNITY)
  const positive = insights.filter(i => i.severity === SEVERITY.POSITIVE)

  if (critical.length > 0) {
    msg += `### \u{1F534} Needs Attention\n`
    for (const i of critical) {
      msg += `- **${i.title}** \u2014 ${i.description}\n`
    }
    msg += '\n'
  }

  if (warnings.length > 0) {
    msg += `### \u{1F7E1} Worth Checking\n`
    for (const i of warnings) {
      msg += `- **${i.title}** \u2014 ${i.description}\n`
    }
    msg += '\n'
  }

  if (opportunities.length > 0) {
    msg += `### \u{1F535} Opportunities\n`
    for (const i of opportunities) {
      msg += `- **${i.title}** \u2014 ${i.description}\n`
    }
    msg += '\n'
  }

  if (positive.length > 0) {
    msg += `### \u{1F7E2} Positive Signs\n`
    for (const i of positive) {
      msg += `- **${i.title}** \u2014 ${i.description}\n`
    }
    msg += '\n'
  }

  msg += `\nWant me to dig deeper into any of these findings?`
  return msg
}
