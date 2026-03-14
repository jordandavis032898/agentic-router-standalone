/**
 * DCF Calculation Engine — client-side recalculation for inline editing.
 *
 * Mirrors the Python logic in models/dcf_excel_builder.py so that
 * assumption changes recalculate instantly in the browser.
 */

/**
 * Exponential decay toward 3% long-term growth rate.
 * Matches _apply_exponential_decay in dcf_excel_builder.py.
 */
export function applyExponentialDecay(avgGrowth) {
  const longTerm = 0.03
  const decay = 0.55
  const rates = []
  for (let i = 0; i < 5; i++) {
    const blended = longTerm + (avgGrowth - longTerm) * Math.pow(decay, i)
    rates.push(Math.max(blended, 0.01))
  }
  return rates
}

/**
 * Exponential decay/recovery of EBIT margin toward terminal margin.
 * Matches _apply_margin_decay in dcf_excel_builder.py.
 */
export function applyMarginDecay(currentMargin, terminalMargin = 0.12) {
  const decay = 0.65
  const rates = []
  for (let i = 0; i < 5; i++) {
    const blended = terminalMargin + (currentMargin - terminalMargin) * Math.pow(decay, i)
    rates.push(blended)
  }
  return rates
}

/**
 * Compute implied share price given assumptions and a revenue growth rate.
 * Mirrors compute_implied_price in dcf_excel_builder.py.
 *
 * @param {Object} edgarScaled - { base_rev, debt, cash, stub }
 * @param {Object} assumptions - raw assumptions (decimal form)
 * @param {number} revGrowth   - revenue growth rate (decimal, e.g. 0.08)
 * @param {number} sharePriceMult - 1 or 1000 depending on unit scale
 * @returns {number} implied share price
 */
export function computeImpliedPrice(edgarScaled, assumptions, revGrowth, sharePriceMult) {
  const baseRev = edgarScaled.base_rev
  const debtScaled = edgarScaled.debt
  const cashScaled = edgarScaled.cash
  const sharesM = assumptions.shares_m
  const stub = edgarScaled.stub

  // Project revenues using exponential decay
  const decayRates = applyExponentialDecay(revGrowth)
  const revProj = []
  let r = baseRev
  for (let i = 0; i < 5; i++) {
    r = r * (1 + decayRates[i])
    revProj.push(r)
  }

  // EBIT margin decay
  const marginRates = applyMarginDecay(
    assumptions.current_ebit_margin,
    assumptions.terminal_ebit_margin
  )

  // Free cash flows
  const fcfs = []
  for (let i = 0; i < 5; i++) {
    const rev = revProj[i]
    const nopat = rev * marginRates[i] * (1 - assumptions.tax_rate)
    const da = rev * assumptions.da_pct
    const capex = -rev * assumptions.capex_pct
    const prevRev = i > 0 ? revProj[i - 1] : baseRev
    const nwc = -assumptions.nwc_pct * (rev - prevRev)
    fcfs.push(nopat + da + capex + nwc)
  }

  // Discount periods
  const wacc = assumptions.wacc
  const periods = []
  for (let i = 0; i < 5; i++) {
    periods.push(stub + i)
  }

  // PV of FCFs
  let pvFcfs = 0
  for (let i = 0; i < 5; i++) {
    pvFcfs += fcfs[i] / Math.pow(1 + wacc, periods[i])
  }

  // Terminal value
  const tg = assumptions.terminal_growth
  const spread = wacc - tg
  let tv = 0
  if (Math.abs(spread) > 1e-10) {
    const termMargin = assumptions.terminal_ebit_margin
    const tRev = revProj[4] * (1 + tg)
    const tNopat = tRev * termMargin * (1 - assumptions.tax_rate)
    const tDa = revProj[4] * assumptions.da_pct
    const tCapex = -revProj[4] * assumptions.capex_pct
    const prevR = revProj.length > 1 ? revProj[3] : baseRev
    const tWc = -assumptions.nwc_pct * (revProj[4] - prevR)
    const tFcf = tNopat + tDa + tCapex + tWc
    tv = tFcf / spread
  }
  const pvTv = tv / Math.pow(1 + wacc, periods[4])

  const ev = pvFcfs + pvTv
  const equity = ev - debtScaled + cashScaled

  return sharesM > 0 ? (equity * sharePriceMult) / sharesM : 0
}

/**
 * Bisection solver: find the revenue growth rate that yields the market price.
 * Mirrors solve_implied_growth in dcf_excel_builder.py.
 */
export function solveImpliedGrowth(edgarScaled, assumptions, marketPrice, sharePriceMult) {
  let lo = -0.20
  let hi = 1.50
  let pLo = computeImpliedPrice(edgarScaled, assumptions, lo, sharePriceMult)
  const pHi = computeImpliedPrice(edgarScaled, assumptions, hi, sharePriceMult)

  if ((pLo - marketPrice) * (pHi - marketPrice) > 0) {
    return null // no root in range
  }

  for (let iter = 0; iter < 60; iter++) {
    const mid = (lo + hi) / 2
    const pMid = computeImpliedPrice(edgarScaled, assumptions, mid, sharePriceMult)
    if (Math.abs(pMid - marketPrice) < 0.001) {
      return mid
    }
    if ((pLo - marketPrice) * (pMid - marketPrice) < 0) {
      hi = mid
    } else {
      lo = mid
      pLo = pMid
    }
  }
  return (lo + hi) / 2
}

/**
 * Full recalculation given edited assumptions.
 * Returns all the derived values the UI needs to display.
 *
 * @param {Object} edgarScaled    - from API response edgar_scaled
 * @param {Object} rawAssumptions - base raw_assumptions from API
 * @param {Object} overrides      - user-edited values (percentage form, e.g. { rev_growth: 8.5 })
 * @param {number} sharePriceMult - 1 or 1000
 * @returns {Object} { impliedPrice, upside, wacc, ev, tvPct, pvProjection, pvTerminal, reverseDcf }
 */
export function recalculate(edgarScaled, rawAssumptions, overrides, sharePriceMult, currentPrice) {
  // Merge overrides into assumptions (convert from % to decimal)
  const a = { ...rawAssumptions }
  if (overrides.rev_growth !== undefined) a.rev_growth = overrides.rev_growth / 100
  if (overrides.ebit_margin !== undefined) {
    a.current_ebit_margin = overrides.ebit_margin / 100
    a.ebit_margin = overrides.ebit_margin / 100
  }
  if (overrides.terminal_growth !== undefined) a.terminal_growth = overrides.terminal_growth / 100
  if (overrides.tax_rate !== undefined) a.tax_rate = overrides.tax_rate / 100
  if (overrides.da_pct !== undefined) a.da_pct = overrides.da_pct / 100
  if (overrides.capex_pct !== undefined) a.capex_pct = overrides.capex_pct / 100
  if (overrides.nwc_pct !== undefined) a.nwc_pct = overrides.nwc_pct / 100

  // Recompute WACC if tax rate changed (affects after-tax cost of debt)
  const afterTaxDebt = a.pretax_cost_of_debt * (1 - a.tax_rate)
  a.after_tax_cost_of_debt = afterTaxDebt
  a.wacc = a.equity_weight * a.cost_of_equity + a.debt_weight * afterTaxDebt
  a.wacc = Math.max(0.06, Math.min(a.wacc, 0.20))

  // Recompute decay schedules
  a.decay_growth_rates = applyExponentialDecay(a.rev_growth)
  a.decay_margin_rates = applyMarginDecay(a.current_ebit_margin, a.terminal_ebit_margin)

  // Implied price
  const impliedPrice = computeImpliedPrice(edgarScaled, a, a.rev_growth, sharePriceMult)

  // EV breakdown
  const baseRev = edgarScaled.base_rev
  const stub = edgarScaled.stub
  const decayRates = a.decay_growth_rates
  const marginRates = a.decay_margin_rates

  const revProj = []
  let r = baseRev
  for (let i = 0; i < 5; i++) {
    r = r * (1 + decayRates[i])
    revProj.push(r)
  }

  const periods = []
  for (let i = 0; i < 5; i++) periods.push(stub + i)

  let pvFcfs = 0
  for (let i = 0; i < 5; i++) {
    const rev = revProj[i]
    const nopat = rev * marginRates[i] * (1 - a.tax_rate)
    const da = rev * a.da_pct
    const capex = -rev * a.capex_pct
    const prevRev = i > 0 ? revProj[i - 1] : baseRev
    const nwc = -a.nwc_pct * (rev - prevRev)
    const fcf = nopat + da + capex + nwc
    pvFcfs += fcf / Math.pow(1 + a.wacc, periods[i])
  }

  const tg = a.terminal_growth
  const spread = a.wacc - tg
  let pvTv = 0
  if (Math.abs(spread) > 1e-10) {
    const termRev = revProj[4] * (1 + tg)
    const termNopat = termRev * a.terminal_ebit_margin * (1 - a.tax_rate)
    const termDa = revProj[4] * a.da_pct
    const termCapex = -revProj[4] * a.capex_pct
    const prevR = revProj.length > 1 ? revProj[3] : baseRev
    const termWc = -a.nwc_pct * (revProj[4] - prevR)
    const termFcf = termNopat + termDa + termCapex + termWc
    const tv = termFcf / spread
    pvTv = tv / Math.pow(1 + a.wacc, periods[4])
  }

  const ev = pvFcfs + pvTv
  const totalPv = pvFcfs + pvTv

  // Reverse DCF
  const impliedGrowth = solveImpliedGrowth(edgarScaled, a, currentPrice, sharePriceMult)

  return {
    impliedPrice: Math.round(impliedPrice * 100) / 100,
    upside: currentPrice > 0 ? Math.round((impliedPrice / currentPrice - 1) * 1000) / 10 : 0,
    wacc: Math.round(a.wacc * 1000) / 10,
    ev: Math.round(ev * 100) / 100,
    tvPct: totalPv > 0 ? Math.round(pvTv / totalPv * 1000) / 10 : 0,
    pvProjection: Math.round(pvFcfs * 100) / 100,
    pvTerminal: Math.round(pvTv * 100) / 100,
    reverseDcf: {
      modelGrowthPct: Math.round(a.rev_growth * 10000) / 100,
      impliedGrowthPct: impliedGrowth !== null ? Math.round(impliedGrowth * 10000) / 100 : null,
      growthGapPct: impliedGrowth !== null
        ? Math.round((a.rev_growth - impliedGrowth) * 10000) / 100
        : null,
    },
  }
}
