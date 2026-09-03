import { costState, type StockSnapshot } from '../db/stockRepo'
import type { ISODate, Product } from '../types'
import { daysBetween } from './dates'

// The alert rules read stockRepo.stockSnapshots: the live product, its stock on hand
// (sum of the live moves), its live lots with stock and its live moves.
export type { StockSnapshot }

export type StockAlert =
  | { type: 'lowStock'; productId: string; onHand: number; reorderLevel: number; suggestQty: number }
  | { type: 'expiring'; productId: string; lotId: string; expiryDate: ISODate; qty: number; daysToExpiry: number; window: 30 | 60 | 90 }
  | { type: 'expired'; productId: string; lotId: string; expiryDate: ISODate; qty: number }
  | { type: 'deadStock'; productId: string; onHand: number; value: number; daysSinceSale: number | null; daysSinceReceipt: number | null }
  | { type: 'negativeStock'; productId: string; onHand: number }
  | { type: 'countMismatch'; productId: string; date: ISODate; delta: number; refId: string }

export interface AlertOptions {
  deadDays: number // no sale for this long counts as dead stock
  countDays: number // count mismatches older than this are history, not alerts
}

const DEFAULTS: AlertOptions = { deadDays: 90, countDays: 30 }
const WINDOWS: (30 | 60 | 90)[] = [30, 60, 90]

// PLAN.md F3: below reorder level, expiring within 30/60/90 days, expired, dead stock (no
// sale in N days), negative or mismatched stock after a count.
export function stockAlerts(items: StockSnapshot[], today: ISODate, opts: Partial<AlertOptions> = {}): StockAlert[] {
  const o = { ...DEFAULTS, ...opts }
  const out: StockAlert[] = []
  for (const { product, onHand, lots, moves } of items) {
    const id = product.id
    if (onHand < 0) out.push({ type: 'negativeStock', productId: id, onHand })
    if (product.reorderLevel > 0 && onHand <= product.reorderLevel) {
      out.push({ type: 'lowStock', productId: id, onHand, reorderLevel: product.reorderLevel, suggestQty: product.reorderQty || product.reorderLevel })
    }
    for (const lot of lots) {
      if (!lot.expiryDate || lot.qtyOnHand <= 0) continue
      const days = daysBetween(today, lot.expiryDate)
      if (days < 0) out.push({ type: 'expired', productId: id, lotId: lot.id, expiryDate: lot.expiryDate, qty: lot.qtyOnHand })
      else {
        const window = WINDOWS.find((w) => days <= w)
        if (window) out.push({ type: 'expiring', productId: id, lotId: lot.id, expiryDate: lot.expiryDate, qty: lot.qtyOnHand, daysToExpiry: days, window })
      }
    }
    if (onHand > 0) {
      const saleDates = moves.filter((m) => m.reason === 'sale').map((m) => m.date).sort()
      const lastSale = saleDates[saleDates.length - 1]
      const firstReceipt = moves.filter((m) => m.qtyDelta > 0).map((m) => m.date).sort()[0]
      const daysSinceSale = lastSale ? daysBetween(lastSale, today) : null
      const daysSinceReceipt = firstReceipt ? daysBetween(firstReceipt, today) : null
      const idle = daysSinceSale ?? daysSinceReceipt
      if (idle !== null && idle > o.deadDays) {
        out.push({ type: 'deadStock', productId: id, onHand, value: round(onHand * costState(moves).avgCost), daysSinceSale, daysSinceReceipt })
      }
    }
    const counts = moves.filter((m) => m.reason === 'count' && m.qtyDelta !== 0 && daysBetween(m.date, today) <= o.countDays).sort((a, b) => b.date.localeCompare(a.date) || b.updatedAt.localeCompare(a.updatedAt))
    if (counts.length > 0) {
      const latest = counts[0]
      const delta = counts.filter((m) => m.refId === latest.refId).reduce((s, m) => s + m.qtyDelta, 0)
      out.push({ type: 'countMismatch', productId: id, date: latest.date, delta, refId: latest.refId ?? '' })
    }
  }
  return out
}

const round = (n: number) => Math.round(n * 100) / 100

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100))

// "9 sacks + 47 kg": whole packs by the largest sell unit, then the base-unit remainder.
export function packLabel(qty: number, product: Product): string {
  const pack = [...product.sellUnits].filter((u) => u.factor > 1).sort((a, b) => b.factor - a.factor)[0]
  if (!pack || qty < pack.factor) return `${fmt(qty)} ${product.baseUnit}`
  const packs = Math.floor(qty / pack.factor)
  const rest = round(qty - packs * pack.factor)
  const packs_ = `${packs} ${pack.unit}${packs === 1 ? '' : 's'}`
  return rest > 0 ? `${packs_} + ${fmt(rest)} ${product.baseUnit}` : packs_
}
