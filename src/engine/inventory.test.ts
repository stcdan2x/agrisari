import { describe, expect, it } from 'vitest'
import type { Product, StockLot, StockMove } from '../types'
import { packLabel, stockAlerts, type StockSnapshot } from './inventory'

const product = (o: Partial<Product> & { name: string }): Product => ({
  id: o.name,
  updatedAt: '2026-09-01T00:00:00.000Z',
  deletedAt: null,
  category: 'feed',
  baseUnit: 'kg',
  sellUnits: [
    { unit: 'sack', factor: 50, price: 1750 },
    { unit: 'kg', factor: 1, price: 38 },
  ],
  repackable: true,
  vatExempt: true,
  licenceClass: 'baiFeed',
  coldChain: false,
  hasExpiry: true,
  reorderLevel: 0,
  reorderQty: 0,
  ...o,
})
const lot = (productId: string, id: string, qtyOnHand: number, expiryDate?: string): StockLot => ({
  id,
  updatedAt: '2026-09-01T00:00:00.000Z',
  deletedAt: null,
  productId,
  qtyOnHand,
  unitCost: 35,
  receivedDate: '2026-09-01',
  ...(expiryDate ? { expiryDate } : {}),
})
const move = (productId: string, date: string, qtyDelta: number, reason: StockMove['reason'], extra: Partial<StockMove> = {}): StockMove => ({
  id: `${productId}-${date}-${reason}`,
  updatedAt: `${date}T00:00:00.000Z`,
  deletedAt: null,
  productId,
  date,
  qtyDelta,
  unitCost: 35,
  reason,
  ...extra,
})
const snap = (p: Product, lots: StockLot[], moves: StockMove[]): StockSnapshot => ({ product: p, lots, moves, onHand: moves.reduce((s, m) => s + m.qtyDelta, 0) })

const TODAY = '2026-09-20'

describe('stockAlerts', () => {
  it('flags low stock with the reorder suggestion, expiring lots by window, and expired lots', () => {
    const grower = product({ name: 'grower', reorderLevel: 100, reorderQty: 200 })
    const s = snap(grower, [lot('grower', 'A', 90, '2026-10-11'), lot('grower', 'B', 0, '2026-09-30')], [
      move('grower', '2026-09-01', 100, 'purchase'),
      move('grower', '2026-09-05', 50, 'purchase'),
      move('grower', '2026-09-06', -60, 'sale', { refType: 'sale', refId: 's1' }),
    ])
    const vit = product({ name: 'bexan', category: 'vitamin', baseUnit: 'bottle', sellUnits: [{ unit: 'bottle', factor: 1, price: 120 }] })
    const v = snap(vit, [lot('bexan', 'V', 3, '2026-09-15')], [move('bexan', '2026-06-01', 3, 'purchase')])
    const alerts = stockAlerts([s, v], TODAY)
    expect(alerts).toContainEqual({ type: 'lowStock', productId: 'grower', onHand: 90, reorderLevel: 100, suggestQty: 200 })
    expect(alerts).toContainEqual({ type: 'expiring', productId: 'grower', lotId: 'A', expiryDate: '2026-10-11', qty: 90, daysToExpiry: 21, window: 30 })
    expect(alerts.filter((a) => a.type === 'expiring' || a.type === 'expired').map((a) => (a as { lotId: string }).lotId)).not.toContain('B')
    expect(alerts).toContainEqual({ type: 'expired', productId: 'bexan', lotId: 'V', expiryDate: '2026-09-15', qty: 3 })
  })

  it('uses the 30, 60 and 90 day windows and ignores products without a reorder level', () => {
    const p = product({ name: 'p' })
    const s = snap(p, [lot('p', 'L60', 10, '2026-11-05'), lot('p', 'L90', 10, '2026-12-10'), lot('p', 'Lfar', 10, '2027-01-01'), lot('p', 'Lnone', 10)], [move('p', '2026-09-01', 40, 'purchase')])
    const alerts = stockAlerts([s], TODAY)
    expect(alerts.find((a) => a.type === 'lowStock')).toBeUndefined()
    expect(alerts.filter((a) => a.type === 'expiring').map((a) => [(a as { lotId: string }).lotId, (a as { window: number }).window])).toEqual([
      ['L60', 60],
      ['L90', 90],
    ])
  })

  it('flags dead stock after 90 days without a sale, valued at the average cost, and negative stock', () => {
    const sprayer = product({ name: 'sprayer', category: 'equipment', baseUnit: 'piece', sellUnits: [{ unit: 'piece', factor: 1, price: 1200 }], hasExpiry: false })
    const dead = snap(sprayer, [lot('sprayer', 'S', 3)], [move('sprayer', '2026-05-01', 3, 'purchase', { unitCost: 900 })])
    const seed = product({ name: 'seed', category: 'seed', baseUnit: 'bag', sellUnits: [{ unit: 'bag', factor: 1, price: 2000 }] })
    const alive = snap(seed, [lot('seed', 'R', 4)], [move('seed', '2026-05-01', 5, 'purchase'), move('seed', '2026-07-01', -1, 'sale')])
    const neg = snap(product({ name: 'neg' }), [], [move('neg', '2026-09-01', 5, 'purchase'), move('neg', '2026-09-02', -7, 'sale')])
    const alerts = stockAlerts([dead, alive, neg], TODAY)
    expect(alerts).toContainEqual({ type: 'deadStock', productId: 'sprayer', onHand: 3, value: 2700, daysSinceSale: null, daysSinceReceipt: 142 })
    expect(alerts.find((a) => a.productId === 'seed')).toBeUndefined()
    expect(alerts).toContainEqual({ type: 'negativeStock', productId: 'neg', onHand: -2 })
  })

  it('reports the latest count mismatch within 30 days', () => {
    const p = product({ name: 'p' })
    const s = snap(p, [lot('p', 'A', 90)], [
      move('p', '2026-09-01', 100, 'purchase'),
      move('p', '2026-08-01', -4, 'count', { refType: 'count', refId: 'old' }),
      move('p', '2026-09-18', -10, 'count', { refType: 'count', refId: 'c1' }),
    ])
    const alerts = stockAlerts([s], TODAY)
    expect(alerts.filter((a) => a.type === 'countMismatch')).toEqual([{ type: 'countMismatch', productId: 'p', date: '2026-09-18', delta: -10, refId: 'c1' }])
    expect(stockAlerts([snap(p, [], [move('p', '2026-07-01', -4, 'count', { refType: 'count', refId: 'old' })])], TODAY).filter((a) => a.type === 'countMismatch')).toEqual([])
  })
})

describe('packLabel', () => {
  it('shows whole packs plus the base-unit remainder', () => {
    const grower = product({ name: 'grower' })
    expect(packLabel(497, grower)).toBe('9 sacks + 47 kg')
    expect(packLabel(50, grower)).toBe('1 sack')
    expect(packLabel(47, grower)).toBe('47 kg')
    expect(packLabel(0, grower)).toBe('0 kg')
    expect(packLabel(2.5, grower)).toBe('2.5 kg')
    expect(packLabel(3, product({ name: 'sprayer', baseUnit: 'piece', sellUnits: [{ unit: 'piece', factor: 1, price: 1200 }] }))).toBe('3 piece')
    expect(packLabel(-2, grower)).toBe('-2 kg')
  })
})
