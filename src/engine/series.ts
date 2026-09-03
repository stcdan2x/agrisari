import { addMonths, format, parseISO } from 'date-fns'
import type { Aging } from '../db/paymentRepo'
import { perBaseUnit } from '../db/priceLogRepo'
import { CATEGORY_DEFAULTS } from '../knowledge/categories'
import type { ISODate, PriceObservation, Product, ProductCategory, Sale, StockMove, Transaction } from '../types'
import { monthRange } from './dates'
import { incomeStatement, marginReport, type Period } from './finance'

// P8 chart series: pure builders over the rows, tested by hand (step 8.2). Each point is what
// one bar or one dot shows; the charts add nothing to the arithmetic.

const money = (n: number) => Math.round(n * 100) / 100

// n months ascending, ending at 'YYYY-MM'.
export function monthsEnding(month: string, n: number): string[] {
  const end = parseISO(`${month}-01`)
  return Array.from({ length: n }, (_, i) => format(addMonths(end, i - n + 1), 'yyyy-MM'))
}

export interface MonthPoint {
  month: string
  sales: number // sale revenue (other revenue out)
  cogs: number
  margin: number // sales less COGS
}

// Sales, COGS and their margin per month, from the income statement of each month.
export function monthlySeries(months: string[], input: { transactions: Transaction[]; moves: StockMove[] }): MonthPoint[] {
  return months.map((month) => {
    const s = incomeStatement(monthRange(month), input)
    return { month, sales: s.revenue.sales, cogs: s.cogs, margin: money(s.revenue.sales - s.cogs) }
  })
}

export interface CategoryPoint {
  category: ProductCategory
  label: string
  revenue: number
  margin: number
}

// The period's revenue and margin per category from the frozen sale lines, largest revenue first.
export function categorySeries(period: Period, input: { sales: Sale[]; products: Product[] }): CategoryPoint[] {
  return marginReport(period, input)
    .categories.map((r) => ({ category: r.category, label: CATEGORY_DEFAULTS[r.category].label, revenue: r.revenue, margin: r.margin }))
    .sort((a, b) => b.revenue - a.revenue || a.label.localeCompare(b.label))
}

export type AgingBucket = 'current' | 'd31' | 'd61' | 'd90'
export interface AgingPoint {
  bucket: AgingBucket
  label: string
  amount: number
}

const BUCKETS: { bucket: AgingBucket; label: string }[] = [
  { bucket: 'current', label: 'Up to 30 days' },
  { bucket: 'd31', label: '31 to 60' },
  { bucket: 'd61', label: '61 to 90' },
  { bucket: 'd90', label: 'Over 90' },
]

// The four aging buckets summed across the customers, oldest last.
export function agingSeries(rows: Aging[]): AgingPoint[] {
  return BUCKETS.map(({ bucket, label }) => ({ bucket, label, amount: money(rows.reduce((s, r) => s + r[bucket], 0)) }))
}

export interface ValuePoint {
  month: string
  value: number
}

// The stock account through each month end: every live move at its snapshotted cost (receipts at
// what they cost, stock out at the weighted average of the day), so the line is the value at
// average cost that the income statement's COGS drew down.
export function inventoryValueSeries(months: string[], moves: StockMove[]): ValuePoint[] {
  const live = moves.filter((m) => !m.deletedAt).sort((a, b) => a.date.localeCompare(b.date))
  let i = 0
  let value = 0
  return months.map((month) => {
    const { to } = monthRange(month)
    while (i < live.length && live[i].date <= to) {
      value += live[i].qtyDelta * live[i].unitCost
      i++
    }
    return { month, value: money(value) }
  })
}

export interface PricePoint {
  date: ISODate
  value: number // per base unit
  supplierId?: string
}

// The supplier prices of one product per base unit, ascending by date.
export function priceSeries(observations: PriceObservation[], product: Product): PricePoint[] {
  return observations
    .filter((o) => !o.deletedAt && o.kind === 'supplierPrice')
    .sort((a, b) => a.date.localeCompare(b.date) || a.updatedAt.localeCompare(b.updatedAt))
    .map((o) => ({ date: o.date, value: perBaseUnit(o, product), ...(o.supplierId ? { supplierId: o.supplierId } : {}) }))
}
