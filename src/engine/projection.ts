import type { LoadedParameters } from '../db/parameterRepo'
import type { Assumption, Explanation } from '../knowledge/cite'
import { parameterSource, RAMP_CURVE, RAMP_CURVE_SLOW, SCENARIO_DEFAULTS, SENSITIVITY_SET } from '../knowledge/parameters'
import { quarterOf } from '../knowledge/seasons'
import type { ProductCategory } from '../types'
import { nextMonth } from './dates'

// The projection model of PLAN.md section 8 and research/finance-and-kpis.md section 17
// (TASK 001 step 7.4): month by month sales, margin, cash and inventory value for 12 to 36
// months of a scenario, with the capital requirement peak, the payback month and the fixed
// sensitivity set. Pure functions; the scenarios table (scenarioRepo) stores the params.

export interface FixedExpense {
  label: string
  amount: number
}

export interface CapexItem {
  label: string
  amount: number
  lifeYears: number
}

export interface ScenarioParams {
  startMonth: string // 'YYYY-MM'
  months: number // 12 to 36
  steadyStateSales: number // PHP a month at maturity
  ramp: 'default' | 'slow' | 'none'
  grossMarginPct: number
  salesMix: Partial<Record<ProductCategory, number>> // shares of sales by category, for the seasonal index; empty = flat
  fixedExpenses: FixedExpense[]
  variableExpensePct: number // percent of sales
  salesTaxPct: number // percent of sales paid as tax
  creditSalesPct: number
  dsoDays: number // collections lag on credit sales
  dpoDays: number // payment lag on purchases
  dioDays: number // days of COGS held as stock
  badDebtPct: number // of credit sales, never collected
  openingCapital: number
  capex: CapexItem[]
  loan?: { amount: number; ratePctPerYear: number; months: number }
}

export interface MonthRow {
  month: string
  index: number // 1-based
  ramp: number
  season: number
  sales: number
  cogs: number
  grossProfit: number
  variableExpenses: number
  fixedExpenses: number
  depreciation: number
  badDebt: number
  tax: number
  interest: number
  netIncome: number
  collections: number
  purchases: number
  purchasePayments: number
  loanPayment: number
  netCash: number
  cash: number
  inventory: number
}

export interface Opening {
  capex: number
  openingStock: number
  loan: number
  total: number // the outlay before the first month, loan aside
}

export interface Summary {
  totalSales: number
  totalNetIncome: number
  capitalPeak: number // the most owner's money needed at any point
  capitalPeakMonth: number // 0 = before opening
  paybackMonth: number | null
  breakEvenMonth: number | null
  breakEvenSalesPerMonth: number
  endingCash: number
  endingInventory: number
}

export interface Projection {
  params: ScenarioParams
  opening: Opening
  months: MonthRow[]
  summary: Summary
  explanation: Explanation
}

const round2 = (n: number) => Math.round(n * 100) / 100
const peso = (n: number) => (n < 0 ? '-' : '') + '₱' + round2(Math.abs(n)).toLocaleString('en-PH', { maximumFractionDigits: 2 })
const pctOf = (n: number, pct: number) => (n * pct) / 100

export function validateScenario(p: ScenarioParams): void {
  const num = (v: unknown) => typeof v === 'number' && Number.isFinite(v)
  if (!/^\d{4}-\d{2}$/.test(p.startMonth)) throw new Error('Start month must be YYYY-MM')
  if (!Number.isInteger(p.months) || p.months < 12 || p.months > 36) throw new Error('Months must be 12 to 36')
  if (!num(p.steadyStateSales) || p.steadyStateSales <= 0) throw new Error('Steady-state sales must be above 0')
  if (!num(p.grossMarginPct) || p.grossMarginPct < 0 || p.grossMarginPct >= 100) throw new Error('Gross margin must be a percentage below 100')
  for (const [k, v] of [
    ['Variable expenses', p.variableExpensePct],
    ['Sales tax', p.salesTaxPct],
    ['Credit sales', p.creditSalesPct],
    ['Bad debt', p.badDebtPct],
  ] as const)
    if (!num(v) || v < 0 || v > 100) throw new Error(`${k} must be a percentage between 0 and 100`)
  for (const [k, v] of [
    ['DSO', p.dsoDays],
    ['DPO', p.dpoDays],
    ['DIO', p.dioDays],
    ['Opening capital', p.openingCapital],
  ] as const)
    if (!num(v) || v < 0) throw new Error(`${k} must be 0 or more`)
  for (const f of p.fixedExpenses) if (!num(f.amount) || f.amount < 0) throw new Error(`Fixed expense ${f.label} must be 0 or more`)
  for (const c of p.capex)
    if (!num(c.amount) || c.amount < 0 || !num(c.lifeYears) || c.lifeYears <= 0) throw new Error(`Capital item ${c.label} needs an amount and a life in years`)
  if (
    p.loan &&
    (!num(p.loan.amount) ||
      p.loan.amount < 0 ||
      !num(p.loan.ratePctPerYear) ||
      p.loan.ratePctPerYear < 0 ||
      !Number.isInteger(p.loan.months) ||
      p.loan.months <= 0)
  )
    throw new Error('Loan needs an amount, a rate and a term in months')
  const mix = Object.values(p.salesMix).reduce((a, b) => a + (b ?? 0), 0)
  if (mix < 0 || mix > 1.0001) throw new Error('Sales mix shares must add up to at most 1')
}

const rampFor = (ramp: ScenarioParams['ramp'], i: number): number => {
  const curve = ramp === 'default' ? RAMP_CURVE.value : ramp === 'slow' ? RAMP_CURVE_SLOW.value : []
  return i < curve.length ? curve[i] / 100 : 1
}

function seasonFor(mix: ScenarioParams['salesMix'], month: string, parameters: LoadedParameters): number {
  const entries = Object.entries(mix).filter(([, share]) => (share ?? 0) > 0) as [ProductCategory, number][]
  const total = entries.reduce((a, [, s]) => a + s, 0)
  if (total <= 0) return 1
  const q = quarterOf(Number(month.slice(5, 7)))
  return entries.reduce((a, [c, s]) => a + (s / total) * parameters.values.seasonalIndex[c][q], 0)
}

// Spreads an amount that lands `lagMonths` after month i (fractional lags split linearly).
function lagged(target: number[], i: number, amount: number, lagMonths: number) {
  const whole = Math.floor(lagMonths)
  const frac = lagMonths - whole
  if (i + whole < target.length) target[i + whole] += amount * (1 - frac)
  if (frac > 0 && i + whole + 1 < target.length) target[i + whole + 1] += amount * frac
}

export function project(params: ScenarioParams, parameters: LoadedParameters): Projection {
  validateScenario(params)
  const n = params.months
  const months: string[] = []
  for (let i = 0, m = params.startMonth; i < n; i++, m = nextMonth(m)) months.push(m)
  const ramp = months.map((_, i) => rampFor(params.ramp, i))
  const season = months.map((m) => round2(seasonFor(params.salesMix, m, parameters)))
  const sales = months.map((_, i) => round2(params.steadyStateSales * ramp[i] * season[i]))
  const cogs = sales.map((s) => round2(s * (1 - params.grossMarginPct / 100)))
  const fixed = params.fixedExpenses.reduce((a, f) => a + f.amount, 0)
  const capexTotal = params.capex.reduce((a, c) => a + c.amount, 0)
  const depreciation = round2(params.capex.reduce((a, c) => a + c.amount / (c.lifeYears * 12), 0))
  const dio = params.dioDays / 30
  const inventory = cogs.map((_, i) => round2((i + 1 < n ? cogs[i + 1] : cogs[i]) * dio))
  const openingStock = round2(cogs[0] * dio)
  const loan = params.loan?.amount ?? 0
  const opening: Opening = { capex: capexTotal, openingStock, loan, total: round2(capexTotal + openingStock) }

  const collections = new Array<number>(n).fill(0)
  const payments = new Array<number>(n).fill(0)
  const rows: MonthRow[] = []
  let balance = loan
  let cash = params.openingCapital + loan - capexTotal - openingStock
  let cumulative = loan - capexTotal - openingStock
  let minCum = cumulative
  let minAt = 0
  let payback: number | null = null
  let breakEvenMonth: number | null = null
  for (let i = 0; i < n; i++) {
    const s = sales[i]
    const credit = pctOf(s, params.creditSalesPct)
    const badDebt = pctOf(credit, params.badDebtPct)
    collections[i] += s - credit
    lagged(collections, i, credit - badDebt, params.dsoDays / 30)
    const purchases = round2(cogs[i] + inventory[i] - (i === 0 ? openingStock : inventory[i - 1]))
    lagged(payments, i, purchases, params.dpoDays / 30)
    const variable = pctOf(s, params.variableExpensePct)
    const tax = pctOf(s, params.salesTaxPct)
    let interest = 0
    let principal = 0
    if (params.loan && balance > 0) {
      interest = (balance * params.loan.ratePctPerYear) / 100 / 12
      principal = Math.min(balance, params.loan.amount / params.loan.months)
      balance -= principal
    }
    const gross = s - cogs[i]
    const netIncome = round2(gross - variable - fixed - depreciation - badDebt - tax - interest)
    const netCash = round2(collections[i] - payments[i] - variable - fixed - tax - interest - principal)
    cash = round2(cash + netCash)
    cumulative = round2(cumulative + netCash)
    if (cumulative < minCum) {
      minCum = cumulative
      minAt = i + 1
    }
    if (payback === null && cumulative >= 0) payback = i + 1
    if (breakEvenMonth === null && netIncome >= 0) breakEvenMonth = i + 1
    rows.push({
      month: months[i],
      index: i + 1,
      ramp: ramp[i],
      season: season[i],
      sales: s,
      cogs: cogs[i],
      grossProfit: round2(gross),
      variableExpenses: round2(variable),
      fixedExpenses: round2(fixed),
      depreciation,
      badDebt: round2(badDebt),
      tax: round2(tax),
      interest: round2(interest),
      netIncome,
      collections: round2(collections[i]),
      purchases,
      purchasePayments: round2(payments[i]),
      loanPayment: round2(principal),
      netCash,
      cash,
      inventory: inventory[i],
    })
  }
  const contribution = (params.grossMarginPct - params.variableExpensePct - params.salesTaxPct - (params.creditSalesPct * params.badDebtPct) / 100) / 100
  const breakEvenSales = contribution > 0 ? round2((fixed + depreciation) / contribution) : Number.POSITIVE_INFINITY
  const summary: Summary = {
    totalSales: round2(sales.reduce((a, b) => a + b, 0)),
    totalNetIncome: round2(rows.reduce((a, r) => a + r.netIncome, 0)),
    capitalPeak: round2(Math.max(0, -minCum)),
    capitalPeakMonth: minAt,
    paybackMonth: payback,
    breakEvenMonth,
    breakEvenSalesPerMonth: breakEvenSales,
    endingCash: cash,
    endingInventory: inventory[n - 1],
  }
  const mixText = Object.keys(params.salesMix).length > 0 ? 'the category seasonal indices' : 'no seasonality'
  const explanation: Explanation = {
    text:
      `${n} months from ${params.startMonth} at ${peso(params.steadyStateSales)} of monthly sales at maturity, ${params.ramp === 'none' ? 'no ramp' : `the ${params.ramp} ramp`}, ${mixText}, a ${params.grossMarginPct} percent gross margin. ` +
      `Before opening: ${peso(opening.total)} (${peso(capexTotal)} of fixtures and ${peso(openingStock)} of stock for ${params.dioDays} days of sales)${loan > 0 ? `, ${peso(loan)} of it borrowed` : ''}. ` +
      `The owner's money is stretched most ${minAt === 0 ? 'before opening' : `in month ${minAt}`} at ${peso(summary.capitalPeak)}; ` +
      `${payback === null ? `the outlay is not paid back within ${n} months` : `the outlay is paid back in month ${payback}`}; ` +
      `${breakEvenMonth === null ? 'no month reaches break-even' : `month ${breakEvenMonth} is the first at or above break-even`}, which takes ${Number.isFinite(breakEvenSales) ? peso(breakEvenSales) : 'more than the margin allows'} of sales a month. ` +
      `Net income over the period ${peso(summary.totalNetIncome)}, ending cash ${peso(cash)} with ${peso(inventory[n - 1])} of stock.`,
    assumptions: [
      {
        label: 'Ramp curve',
        value: params.ramp === 'none' ? 'none' : params.ramp === 'slow' ? '60 to 100 percent over 24 months' : '60 to 100 percent over 12 months',
        source: params.ramp === 'slow' ? RAMP_CURVE_SLOW.source : RAMP_CURVE.source,
        origin: 'research',
      },
      ...(Object.keys(params.salesMix).length > 0
        ? [
            {
              label: 'Seasonal index',
              value: `by category from the store parameters (${Object.keys(params.salesMix).join(', ')})`,
              source: parameterSource('seasonalIndex', 'feed')?.source ?? 'PM-125',
              origin: parameters.overridden.includes('seasonalIndex') ? 'store' : 'research',
            } as Assumption,
          ]
        : []),
      {
        label: 'Monthly algorithm',
        value: 'sales = steady state x ramp x season; collections lag by DSO, purchase payments by DPO, stock held at DIO days of COGS',
        source: 'FK-54',
        origin: 'research',
      },
      {
        label: 'Break-even',
        value: `(fixed ${peso(fixed)} + depreciation ${peso(depreciation)}) / contribution ratio ${round2(contribution * 100)} percent`,
        source: 'FK-65',
        origin: 'research',
      },
      { label: 'Depreciation', value: "straight line over each item's life", source: 'FK-102', origin: 'research' },
      {
        label: 'Loan interest',
        value: params.loan ? `${params.loan.ratePctPerYear} percent a year on the diminishing balance` : 'no loan',
        source: 'FK-89',
        origin: 'store',
      },
    ],
  }
  return { params, opening, months: rows, summary, explanation }
}

export interface SensitivityRow {
  id: string
  label: string
  params: ScenarioParams
  summary: Summary
}

export interface Sensitivity {
  base: Summary
  rows: SensitivityRow[]
  explanation: Explanation
}

function vary(params: ScenarioParams, s: (typeof SENSITIVITY_SET.value)[number]): ScenarioParams {
  const p: ScenarioParams = { ...params, fixedExpenses: params.fixedExpenses.map((f) => ({ ...f })) }
  if ('salesPct' in s && s.salesPct !== undefined) p.steadyStateSales = round2(params.steadyStateSales * (1 + s.salesPct / 100))
  if ('purchasePct' in s && s.purchasePct !== undefined) p.grossMarginPct = round2((1 - (1 - params.grossMarginPct / 100) * (1 + s.purchasePct / 100)) * 100)
  if ('dsoDays' in s && s.dsoDays !== undefined) p.dsoDays = params.dsoDays + s.dsoDays
  if ('badDebtFactor' in s && s.badDebtFactor !== undefined) p.badDebtPct = round2(params.badDebtPct * s.badDebtFactor)
  if ('rentPct' in s && s.rentPct !== undefined)
    p.fixedExpenses = p.fixedExpenses.map((f) => (/rent/i.test(f.label) ? { ...f, amount: round2(f.amount * (1 + s.rentPct! / 100)) } : f))
  return p
}

export function sensitivity(params: ScenarioParams, parameters: LoadedParameters): Sensitivity {
  const base = project(params, parameters).summary
  const rows = SENSITIVITY_SET.value.map((s) => {
    const p = vary(params, s)
    return { id: s.id, label: s.label, params: p, summary: project(p, parameters).summary }
  })
  return {
    base,
    rows,
    explanation: {
      text: 'The fixed set: sales 10 and 20 percent lower, purchase prices 10 percent higher with selling prices unchanged, customers paying 15 days later, bad debt doubled, rent 20 percent higher. The first two break a feed-heavy store because its contribution margin is a few percent.',
      assumptions: [
        { label: 'Sensitivity set', value: SENSITIVITY_SET.value.map((s) => s.label).join('; '), source: SENSITIVITY_SET.source, origin: 'research' },
      ],
    },
  }
}

// The scenario a new store starts from, seeded from the research's small-store example.
export function defaultScenario(startMonth: string): ScenarioParams {
  const d = SCENARIO_DEFAULTS
  return {
    startMonth,
    months: d.months.value,
    steadyStateSales: d.steadyStateSales.value,
    ramp: 'default',
    salesMix: {},
    grossMarginPct: d.grossMarginPct.value,
    fixedExpenses: [
      { label: 'Rent', amount: d.rent.value },
      { label: 'Helper', amount: d.helper.value },
      { label: 'Electricity', amount: d.electricity.value },
      { label: 'Other fixed costs', amount: d.otherFixed.value },
    ],
    variableExpensePct: d.variableExpensePct.value,
    salesTaxPct: d.salesTaxPct.value,
    creditSalesPct: d.creditSalesPct.value,
    dsoDays: d.dsoDays.value,
    dpoDays: d.dpoDays.value,
    dioDays: d.dioDays.value,
    badDebtPct: d.badDebtPct.value,
    openingCapital: d.openingCapital.value,
    capex: [],
  }
}
