import { monthOf, plusDays, todayISO } from '../engine/dates'
import { cashFlow, incomeStatement, inventoryValuation, marginReport, type Period } from '../engine/finance'
import { stockAlerts, type StockAlert } from '../engine/inventory'
import {
  agingSeries,
  categorySeries,
  inventoryValueSeries,
  monthlySeries,
  monthsEnding,
  priceSeries,
  type AgingPoint,
  type CategoryPoint,
  type MonthPoint,
  type PricePoint,
  type ValuePoint,
} from '../engine/series'
import type { ISODate, Product } from '../types'
import { db } from './db'
import { loadParameters } from './parameterRepo'
import { payablesSchedule, receivablesAging } from './paymentRepo'
import { priceHistory } from './priceLogRepo'
import { getProduct, listProducts } from './productRepo'
import { liveAll } from './repo'
import { periodRows } from './reportRepo'
import { listDeliveries } from './saleRepo'
import { stockSnapshots } from './stockRepo'

// P8 design decision 1: the tile figures come from one place that assembles the period's rows
// and the live balances through the P3 to P7 repositories and engines, adding no table.
// Flows (sales, margin, the period's cash) are the period's; balances (cash on hand, the
// receivables and payables) are as of `asOf`; the stock figures are the live stock, with the
// expiry and dead-stock days counted to `asOf`. Extension lines stay out of the stock figures
// as they do on the Inventory page.
export interface DashboardFigures {
  period: Period
  asOf: ISODate
  sales: { today: number; period: number; count: number }
  margin: { grossProfit: number; grossMarginPct: number }
  cash: { onHand: number; periodNet: number }
  receivables: { outstanding: number; overdue: number; customersOverdue: number } // overdue = past 30 days
  payables: { dueThisWeek: number; countDueThisWeek: number; overdue: number; countOverdue: number; open: number }
  deliveries: { pending: number }
  stock: { lowStock: number; expiring30: number; expired: number; deadStockValue: number; valueAtCost: number }
  topSellers: { productId: string; name: string; revenue: number; margin: number }[] // top five by revenue
  alerts: StockAlert[]
}

const FIRST_DAY: ISODate = '0000-01-01'
const TOP_SELLERS = 5
const money = (n: number) => Math.round(n * 100) / 100

export async function dashboardFigures(period: Period, asOf: ISODate = todayISO()): Promise<DashboardFigures> {
  const day: Period = { from: asOf, to: asOf }
  const [rows, todayRows, history, products, snapshots, aging, payableRows, pending, parameters] = await Promise.all([
    periodRows(period),
    periodRows(day),
    periodRows({ from: FIRST_DAY, to: asOf }),
    listProducts({ includeExtension: true }),
    stockSnapshots(),
    receivablesAging(asOf),
    payablesSchedule(asOf),
    listDeliveries('pending'),
    loadParameters(),
  ])

  const income = incomeStatement(period, rows)
  const margins = marginReport(period, { sales: rows.sales, products })
  const overdueCustomers = aging.filter((a) => a.total - a.current > 0)
  const weekEnd = plusDays(asOf, 6)
  const dueThisWeek = payableRows.filter((r) => !r.overdue && r.dueDate !== undefined && r.dueDate <= weekEnd)
  const overduePayables = payableRows.filter((r) => r.overdue)

  const stock = snapshots.filter((s) => !s.product.extension)
  const alerts = stockAlerts(stock, asOf, { deadDays: parameters.values.deadStockDays })
  const count = (type: StockAlert['type']) => alerts.filter((a) => a.type === type).length

  return {
    period,
    asOf,
    sales: { today: incomeStatement(day, todayRows).revenue.sales, period: income.revenue.sales, count: rows.sales.length },
    margin: { grossProfit: income.grossProfit, grossMarginPct: income.grossMarginPct },
    cash: { onHand: cashFlow({ from: FIRST_DAY, to: asOf }, history).net, periodNet: cashFlow(period, rows).net },
    receivables: {
      outstanding: money(aging.reduce((s, a) => s + a.total, 0)),
      overdue: money(overdueCustomers.reduce((s, a) => s + a.total - a.current, 0)),
      customersOverdue: overdueCustomers.length,
    },
    payables: {
      dueThisWeek: money(dueThisWeek.reduce((s, r) => s + r.open, 0)),
      countDueThisWeek: dueThisWeek.length,
      overdue: money(overduePayables.reduce((s, r) => s + r.open, 0)),
      countOverdue: overduePayables.length,
      open: money(payableRows.reduce((s, r) => s + r.open, 0)),
    },
    deliveries: { pending: pending.length },
    stock: {
      lowStock: count('lowStock'),
      expiring30: alerts.filter((a) => a.type === 'expiring' && a.window === 30).length,
      expired: count('expired'),
      deadStockValue: money(alerts.reduce((s, a) => s + (a.type === 'deadStock' ? a.value : 0), 0)),
      valueAtCost: inventoryValuation(stock).total.atCost,
    },
    topSellers: [...margins.products]
      .sort((a, b) => b.revenue - a.revenue || a.name.localeCompare(b.name))
      .slice(0, TOP_SELLERS)
      .map((r) => ({ productId: r.key, name: r.name, revenue: r.revenue, margin: r.margin })),
    alerts,
  }
}

export interface DashboardCharts {
  months: string[] // the bar and line months, ascending, ending at the period's last month
  monthly: MonthPoint[]
  categories: CategoryPoint[] // the period's sales by category
  aging: AgingPoint[] // as of asOf
  inventoryValue: ValuePoint[]
}

const CHART_MONTHS = 12

// The chart series (step 8.2): the monthly bars and the stock value line over the months ending
// at the period's last month, the category split of the period, the aging as of the day.
export async function dashboardCharts(period: Period, asOf: ISODate = todayISO(), monthCount = CHART_MONTHS): Promise<DashboardCharts> {
  const months = monthsEnding(monthOf(period.to), monthCount)
  const span: Period = { from: `${months[0]}-01`, to: period.to > asOf ? period.to : asOf }
  const [spanRows, rows, products, moves, aging] = await Promise.all([
    periodRows(span),
    periodRows(period),
    listProducts({ includeExtension: true }),
    liveAll(db.stockMoves),
    receivablesAging(asOf),
  ])
  return {
    months,
    monthly: monthlySeries(months, spanRows),
    categories: categorySeries(period, { sales: rows.sales, products }),
    aging: agingSeries(aging),
    inventoryValue: inventoryValueSeries(months, moves),
  }
}

// One product's supplier prices per base unit for the price trend chart.
export async function priceTrend(productId: string): Promise<PricePoint[]> {
  const product = await getProduct(productId)
  return product ? priceSeries(await priceHistory(productId), product) : []
}

// The products with at least one supplier price on the log, by name: the price trend's choices.
export async function productsWithPrices(): Promise<Product[]> {
  const logged = new Set((await liveAll(db.priceLog)).filter((o) => o.kind === 'supplierPrice').map((o) => o.productId))
  return (await listProducts({ includeExtension: true })).filter((p) => logged.has(p.id)).sort((a, b) => a.name.localeCompare(b.name))
}
