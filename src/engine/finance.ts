import { costState, type StockSnapshot } from '../db/stockRepo'
import type { BaseRow, ISODate, Payment, Product, ProductCategory, Purchase, Sale, StockMove, TaxMode, Transaction } from '../types'
import { monthOf, monthRange, nextMonth } from './dates'

// P6 report engine: pure functions over the rows of a period (P6 design decisions 2 and 3).
// Sales and purchases post their transactions (revenue 'sales', expense 'stock purchases'),
// stock moves carry the cost snapshot, so nothing here recomputes history.

export interface Period {
  from: ISODate // inclusive
  to: ISODate // inclusive
}

export const STOCK_PURCHASES = 'stock purchases'

const money = (n: number) => Math.round(n * 100) / 100
const live = <T extends BaseRow>(rows: T[]) => rows.filter((r) => !r.deletedAt)
const within = <T extends { date: ISODate }>(rows: T[], p: Period) => rows.filter((r) => r.date >= p.from && r.date <= p.to)
const sum = (ns: number[]) => money(ns.reduce((s, n) => s + n, 0))
const neg = (n: number) => (n === 0 ? 0 : -n) // keeps -0 out of the rows

export interface IncomeStatement {
  period: Period
  revenue: { sales: number; other: number; total: number }
  cogs: number
  grossProfit: number
  grossMarginPct: number // gross profit over total revenue, in percent; 0 without revenue
  writeOffs: { expired: number; loss: number; total: number }
  expenses: { rows: { category: string; amount: number }[]; total: number }
  netIncome: number
}

// Accrual: revenue from the period's revenue transactions (sale rows carry saleId), COGS from
// the period's sale moves at their snapshotted unit cost, expired and loss moves as write-offs,
// operating expenses from the expense transactions except stock purchases (stock is expensed
// through COGS when sold). Capital, drawings and loans are not income and stay out.
export function incomeStatement(period: Period, input: { transactions: Transaction[]; moves: StockMove[] }): IncomeStatement {
  const txs = within(live(input.transactions), period)
  const moves = within(live(input.moves), period)
  const sales = sum(txs.filter((t) => t.kind === 'revenue' && t.links.saleId).map((t) => t.amount))
  const other = sum(txs.filter((t) => t.kind === 'revenue' && !t.links.saleId).map((t) => t.amount))
  const total = money(sales + other)
  const costOf = (reason: StockMove['reason']) => sum(moves.filter((m) => m.reason === reason).map((m) => -m.qtyDelta * m.unitCost))
  const cogs = costOf('sale')
  const expired = costOf('expired')
  const loss = costOf('loss')
  const byCategory = new Map<string, number>()
  for (const t of txs) if (t.kind === 'expense' && t.category !== STOCK_PURCHASES) byCategory.set(t.category, (byCategory.get(t.category) ?? 0) + t.amount)
  const rows = [...byCategory].map(([category, amount]) => ({ category, amount: money(amount) })).sort((a, b) => b.amount - a.amount)
  const expenses = sum(rows.map((r) => r.amount))
  const grossProfit = money(total - cogs)
  return {
    period,
    revenue: { sales, other, total },
    cogs,
    grossProfit,
    grossMarginPct: total > 0 ? money((grossProfit / total) * 100) : 0,
    writeOffs: { expired, loss, total: money(expired + loss) },
    expenses: { rows, total: expenses },
    netIncome: money(grossProfit - expired - loss - expenses),
  }
}

export interface CashSection {
  rows: { label: string; amount: number }[] // signed: money in positive, money out negative
  total: number
}

export interface CashFlow {
  period: Period
  operating: CashSection
  capital: CashSection
  financing: CashSection
  net: number
}

// Cash basis: what was paid at the counter or on the order on its date, the receivable and
// payable payments on theirs, and the other transaction kinds as cash on the day recorded.
export function cashFlow(period: Period, input: { sales: Sale[]; purchases: Purchase[]; payments: Payment[]; transactions: Transaction[] }): CashFlow {
  const sales = within(live(input.sales), period)
  const purchases = within(live(input.purchases), period)
  const payments = within(live(input.payments), period)
  const txs = within(live(input.transactions), period)
  const ofKind = (kind: Transaction['kind']) => sum(txs.filter((t) => t.kind === kind).map((t) => t.amount))
  const section = (rows: { label: string; amount: number }[]): CashSection => ({ rows, total: sum(rows.map((r) => r.amount)) })
  const operating = section([
    { label: 'Cash from sales', amount: sum(sales.map((s) => s.paidAmount)) },
    { label: 'Collections from customers', amount: sum(payments.filter((p) => p.kind === 'receivable').map((p) => p.amount)) },
    { label: 'Other revenue', amount: sum(txs.filter((t) => t.kind === 'revenue' && !t.links.saleId).map((t) => t.amount)) },
    { label: 'Paid to suppliers on orders', amount: neg(sum(purchases.map((p) => p.paidAmount))) },
    { label: 'Payments to suppliers', amount: neg(sum(payments.filter((p) => p.kind === 'payable').map((p) => p.amount))) },
    { label: 'Expenses paid', amount: neg(sum(txs.filter((t) => t.kind === 'expense' && t.category !== STOCK_PURCHASES).map((t) => t.amount))) },
  ])
  const capital = section([
    { label: 'Capital in', amount: ofKind('capital') },
    { label: 'Drawings', amount: neg(ofKind('drawing')) },
  ])
  const financing = section([
    { label: 'Loans received', amount: ofKind('loan') },
    { label: 'Loan payments', amount: neg(ofKind('loanPayment')) },
  ])
  return { period, operating, capital, financing, net: money(operating.total + capital.total + financing.total) }
}

export interface MarginRow {
  key: string // product id or category
  name: string
  category: ProductCategory
  revenue: number
  cost: number
  margin: number
  marginPct: number // margin over revenue, in percent; 0 without revenue
}

export interface MarginReport {
  products: MarginRow[] // largest margin first
  categories: MarginRow[]
  total: Pick<MarginRow, 'revenue' | 'cost' | 'margin' | 'marginPct'>
}

const pct = (part: number, whole: number) => (whole > 0 ? money((part / whole) * 100) : 0)

// Margin from the frozen sale lines (P6 design decision 4): qty x (unitPrice - unitCost) per
// line, both in the line's unit, summed per product and per category. Delivery fees are not
// on a line and stay out. A product no longer on file keeps its id as the name.
export function marginReport(period: Period, input: { sales: Sale[]; products: Product[] }): MarginReport {
  const byId = new Map(input.products.map((p) => [p.id, p]))
  const acc = new Map<string, MarginRow>()
  const add = (key: string, name: string, category: ProductCategory, revenue: number, cost: number) => {
    const r = acc.get(key) ?? { key, name, category, revenue: 0, cost: 0, margin: 0, marginPct: 0 }
    r.revenue += revenue
    r.cost += cost
    acc.set(key, r)
  }
  for (const sale of within(live(input.sales), period)) {
    for (const l of sale.lines) {
      const p = byId.get(l.productId)
      add(l.productId, p?.name ?? l.productId, p?.category ?? 'other', l.qty * l.unitPrice, l.qty * l.unitCost)
    }
  }
  const finish = (r: MarginRow): MarginRow => {
    const revenue = money(r.revenue)
    const cost = money(r.cost)
    const margin = money(revenue - cost)
    return { ...r, revenue, cost, margin, marginPct: pct(margin, revenue) }
  }
  const products = [...acc.values()].map(finish).sort((a, b) => b.margin - a.margin)
  const byCat = new Map<string, MarginRow>()
  for (const r of products) {
    const c = byCat.get(r.category) ?? { key: r.category, name: r.category, category: r.category, revenue: 0, cost: 0, margin: 0, marginPct: 0 }
    c.revenue += r.revenue
    c.cost += r.cost
    byCat.set(r.category, c)
  }
  const categories = [...byCat.values()].map(finish).sort((a, b) => b.margin - a.margin)
  const revenue = sum(products.map((r) => r.revenue))
  const cost = sum(products.map((r) => r.cost))
  const margin = money(revenue - cost)
  return { products, categories, total: { revenue, cost, margin, marginPct: pct(margin, revenue) } }
}

export interface ValuationRow {
  productId: string
  name: string
  category: ProductCategory
  onHand: number // base units
  unit: string
  atCost: number // live lots at their receipt cost
  avgCost: number // the replayed weighted average per base unit
  atAverage: number
}

export interface Valuation {
  rows: ValuationRow[] // largest value at cost first; products without stock left out
  categories: { category: ProductCategory; atCost: number; atAverage: number }[]
  total: { atCost: number; atAverage: number }
}

// Stock value from the live lots at what each cost to buy, with the weighted average
// (decision 8) beside it so the two costing views can be compared (decision 4).
export function inventoryValuation(snaps: StockSnapshot[]): Valuation {
  const rows: ValuationRow[] = []
  for (const s of snaps) {
    const onHand = s.lots.reduce((q, l) => q + l.qtyOnHand, 0)
    if (onHand <= 0) continue
    const avgCost = costState(s.moves).avgCost
    rows.push({
      productId: s.product.id,
      name: s.product.name,
      category: s.product.category,
      onHand,
      unit: s.product.baseUnit,
      atCost: sum(s.lots.map((l) => l.qtyOnHand * l.unitCost)),
      avgCost,
      atAverage: money(onHand * avgCost),
    })
  }
  rows.sort((a, b) => b.atCost - a.atCost)
  const byCat = new Map<ProductCategory, { category: ProductCategory; atCost: number; atAverage: number }>()
  for (const r of rows) {
    const c = byCat.get(r.category) ?? { category: r.category, atCost: 0, atAverage: 0 }
    c.atCost = money(c.atCost + r.atCost)
    c.atAverage = money(c.atAverage + r.atAverage)
    byCat.set(r.category, c)
  }
  const categories = [...byCat.values()].sort((a, b) => b.atCost - a.atCost)
  return { rows, categories, total: { atCost: sum(rows.map((r) => r.atCost)), atAverage: sum(rows.map((r) => r.atAverage)) } }
}

export interface BreakEven {
  fixedExpenses: number // the period's operating expenses, taken as fixed
  grossMarginPct: number
  breakEvenSales: number | null // fixed expenses over the gross margin ratio; null without a positive margin
  sales: number // revenue of the period
  coveragePct: number | null // sales over break-even sales
  shortfall: number | null // what is still to be sold to break even (0 once past it)
}

// Break-even (P6 design decision 5): the operating expenses of the period are the fixed cost,
// the gross margin ratio of the same period is the contribution per peso sold.
export function breakEven(s: IncomeStatement): BreakEven {
  const fixedExpenses = s.expenses.total
  const ratio = s.revenue.total > 0 ? s.grossProfit / s.revenue.total : 0
  if (ratio <= 0) return { fixedExpenses, grossMarginPct: s.grossMarginPct, breakEvenSales: null, sales: s.revenue.total, coveragePct: null, shortfall: null }
  const breakEvenSales = money(fixedExpenses / ratio)
  return {
    fixedExpenses,
    grossMarginPct: s.grossMarginPct,
    breakEvenSales,
    sales: s.revenue.total,
    coveragePct: breakEvenSales > 0 ? pct(s.revenue.total, breakEvenSales) : null,
    shortfall: money(Math.max(breakEvenSales - s.revenue.total, 0)),
  }
}

export interface Returns {
  capital: number // capital transactions to date
  netIncomeToDate: number // accrual net income from the first capital entry's month to asOf
  roiPct: number | null // net income to date over capital; null without capital
  monthsElapsed: number // months from the first capital entry's month to asOf's month, inclusive
  paybackMonths: number | null // the month count at which the cumulative net income first reached the capital
  paybackProjectedMonths: number | null // while not reached: months elapsed plus the months the average month still needs
  months: { month: string; netIncome: number; cumulative: number }[]
}

// ROI and payback (decision 5): the owner's capital against the cumulative net income, month by
// month from the first capital entry. Drawings are neither income nor capital and stay out.
export function returns(asOf: ISODate, input: { transactions: Transaction[]; moves: StockMove[] }): Returns {
  const txs = live(input.transactions).filter((t) => t.date <= asOf)
  const capitalRows = txs.filter((t) => t.kind === 'capital')
  const capital = sum(capitalRows.map((t) => t.amount))
  if (capital <= 0) return { capital: 0, netIncomeToDate: 0, roiPct: null, monthsElapsed: 0, paybackMonths: null, paybackProjectedMonths: null, months: [] }
  const start = monthOf(capitalRows.map((t) => t.date).sort()[0])
  const months: Returns['months'] = []
  let cumulative = 0
  let paybackMonths: number | null = null
  for (let m = start; m <= monthOf(asOf); m = nextMonth(m)) {
    const { netIncome } = incomeStatement(monthRange(m), input)
    cumulative = money(cumulative + netIncome)
    months.push({ month: m, netIncome, cumulative })
    if (paybackMonths === null && cumulative >= capital) paybackMonths = months.length
  }
  const monthsElapsed = months.length
  const average = cumulative / monthsElapsed
  const paybackProjectedMonths = paybackMonths === null && average > 0 ? monthsElapsed + Math.ceil((capital - cumulative) / average) : null
  return { capital, netIncomeToDate: cumulative, roiPct: pctSigned(cumulative, capital), monthsElapsed, paybackMonths, paybackProjectedMonths, months }
}

const pctSigned = (part: number, whole: number) => (whole > 0 ? money((part / whole) * 100) : null)

// Tax estimates (decision 7: optional, labelled as estimates; P6 design decision 6). Rates
// confirmed 2026-09-02 against research/regulations-permits-and-tax.md: RT-76 VAT 12 percent on
// the VATable lines and delivery fees; RT-78 percentage tax 3 percent of gross sales on the
// VATable lines only (exempt feed, fertilizer and seed sales are exempt sales on the non-VAT
// invoice); RT-79 the 8 percent option on gross sales above an annual 250,000, in lieu of income
// tax and percentage tax. Prices and supplier costs are taken as VAT-inclusive.
export const TAX_RATES = { vat: 0.12, percentageTax: 0.03, eightPercent: 0.08, eightPercentExclusion: 250000 } as const

export type TaxEstimate =
  | { mode: 'off' }
  | { mode: 'nonVat'; exemptSales: number; taxableSales: number; grossSales: number; percentageTax: number; eightPercent: number }
  | { mode: 'vat'; exemptSales: number; vatableSales: number; outputVat: number; vatablePurchases: number; inputVat: number; vatPayable: number }

// VAT out of a VAT-inclusive amount.
const vatIn = (inclusive: number) => money((inclusive / (1 + TAX_RATES.vat)) * TAX_RATES.vat)

export function taxEstimate(mode: TaxMode, period: Period, input: { sales: Sale[]; purchases: Purchase[]; products: Product[] }): TaxEstimate {
  if (mode === 'off') return { mode: 'off' }
  const byId = new Map(input.products.map((p) => [p.id, p]))
  const exemptLine = (productId: string, frozen?: boolean) => frozen ?? byId.get(productId)?.vatExempt ?? false
  let exemptSales = 0
  let taxableSales = 0
  for (const sale of within(live(input.sales), period)) {
    for (const l of sale.lines) {
      if (exemptLine(l.productId, l.vatExempt)) exemptSales += l.qty * l.unitPrice
      else taxableSales += l.qty * l.unitPrice
    }
    taxableSales += sale.delivery?.fee ?? 0 // a delivery fee is a VATable service (RT-76)
  }
  exemptSales = money(exemptSales)
  taxableSales = money(taxableSales)
  if (mode === 'nonVat') {
    const grossSales = money(exemptSales + taxableSales)
    return { mode, exemptSales, taxableSales, grossSales, percentageTax: money(taxableSales * TAX_RATES.percentageTax), eightPercent: money(grossSales * TAX_RATES.eightPercent) }
  }
  let vatablePurchases = 0
  for (const p of within(live(input.purchases), period)) for (const l of p.lines) if (!exemptLine(l.productId)) vatablePurchases += l.qty * l.unitCost
  vatablePurchases = money(vatablePurchases)
  const outputVat = vatIn(taxableSales)
  const inputVat = vatIn(vatablePurchases)
  return { mode, exemptSales, vatableSales: taxableSales, outputVat, vatablePurchases, inputVat, vatPayable: money(outputVat - inputVat) }
}
