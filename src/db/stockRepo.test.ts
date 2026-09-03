import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from './db'
import { createProduct } from './productRepo'
import { averageCost, consume, costState, lotsOnHand, movesForProduct, rebuildLotQuantities, receiveLot, stockOnHand } from './stockRepo'

const grower = () =>
  createProduct({
    name: 'Expert Hog Grower mash',
    category: 'feed',
    baseUnit: 'kg',
    sellUnits: [
      { unit: 'sack', factor: 50, price: 1750 },
      { unit: 'kg', factor: 1, price: 38 },
    ],
  })

const sprayer = () => createProduct({ name: 'Knapsack sprayer', category: 'equipment', baseUnit: 'piece', sellUnits: [{ unit: 'piece', factor: 1, price: 1200 }] })

beforeEach(async () => {
  await Promise.all([db.products.clear(), db.stockLots.clear(), db.stockMoves.clear()])
})

describe('receiveLot', () => {
  it('writes the lot and the purchase move together, deriving the expiry from the shelf life', async () => {
    const p = await grower()
    const { lot, move } = await receiveLot({ productId: p.id, qty: 100, unitCost: 35, date: '2026-09-01', lotNo: 'A' })
    expect(lot).toMatchObject({ productId: p.id, lotNo: 'A', qtyOnHand: 100, unitCost: 35, receivedDate: '2026-09-01', expiryDate: '2026-10-11', deletedAt: null })
    expect(move).toMatchObject({ productId: p.id, lotId: lot.id, date: '2026-09-01', qtyDelta: 100, unitCost: 35, reason: 'purchase', deletedAt: null })
    expect(move.refType).toBeUndefined()
    expect(await db.stockLots.get(lot.id)).toMatchObject({ qtyOnHand: 100 })
    expect(await stockOnHand(p.id)).toBe(100)
  })

  it('keeps an explicit expiry, links a purchase, and leaves no expiry on a product that does not track it', async () => {
    const p = await grower()
    const { lot, move } = await receiveLot({ productId: p.id, qty: 50, unitCost: 38, date: '2026-09-05', expiryDate: '2026-09-30', purchaseId: 'po-1' })
    expect(lot).toMatchObject({ expiryDate: '2026-09-30', purchaseId: 'po-1' })
    expect(move).toMatchObject({ refType: 'purchase', refId: 'po-1' })
    const s = await sprayer()
    const r = await receiveLot({ productId: s.id, qty: 3, unitCost: 900, date: '2026-09-05' })
    expect(r.lot.expiryDate).toBeUndefined()
  })

  it('rejects a missing or removed product, a non-positive quantity, a negative cost and bad dates', async () => {
    const p = await grower()
    await expect(receiveLot({ productId: 'nope', qty: 1, unitCost: 1, date: '2026-09-01' })).rejects.toThrow(/product/i)
    await expect(receiveLot({ productId: p.id, qty: 0, unitCost: 1, date: '2026-09-01' })).rejects.toThrow(/quantity/i)
    await expect(receiveLot({ productId: p.id, qty: 1, unitCost: -1, date: '2026-09-01' })).rejects.toThrow(/cost/i)
    await expect(receiveLot({ productId: p.id, qty: 1, unitCost: 1, date: '2026-13-01' })).rejects.toThrow(/date/i)
    await expect(receiveLot({ productId: p.id, qty: 1, unitCost: 1, date: '2026-09-01', expiryDate: 'soon' })).rejects.toThrow(/expiry/i)
    await db.products.put({ ...p, deletedAt: p.updatedAt })
    await expect(receiveLot({ productId: p.id, qty: 1, unitCost: 1, date: '2026-09-01' })).rejects.toThrow(/product/i)
    expect(await db.stockLots.count()).toBe(0)
    expect(await db.stockMoves.count()).toBe(0)
  })
})

describe('costState', () => {
  it('replays receipts into a moving weighted average and values stock out at that average', () => {
    const m = (date: string, qtyDelta: number, unitCost: number) => ({ date, qtyDelta, unitCost, updatedAt: `${date}T00:00:00.000Z`, deletedAt: null })
    expect(costState([])).toEqual({ qty: 0, avgCost: 0 })
    expect(costState([m('2026-09-01', 100, 35)])).toEqual({ qty: 100, avgCost: 35 })
    // (100 x 35 + 50 x 38) / 150 = 36; a sale of 60 at 36 leaves 90 at 36; then (90 x 36 + 10 x 45) / 100 = 36.9
    expect(costState([m('2026-09-01', 100, 35), m('2026-09-05', 50, 38)])).toEqual({ qty: 150, avgCost: 36 })
    expect(costState([m('2026-09-06', -60, 36), m('2026-09-01', 100, 35), m('2026-09-05', 50, 38)])).toEqual({ qty: 90, avgCost: 36 })
    expect(costState([m('2026-09-07', 10, 45), m('2026-09-06', -60, 36), m('2026-09-01', 100, 35), m('2026-09-05', 50, 38)])).toEqual({ qty: 100, avgCost: 36.9 })
    // stock that ran out restarts at the next receipt's cost; tombstoned moves are ignored
    expect(costState([m('2026-09-01', 10, 35), m('2026-09-02', -10, 35), m('2026-09-03', 5, 40)])).toEqual({ qty: 5, avgCost: 40 })
    expect(costState([m('2026-09-01', 10, 35), { ...m('2026-09-02', 10, 55), deletedAt: '2026-09-02T00:00:00.000Z' }])).toEqual({ qty: 10, avgCost: 35 })
  })
})

describe('consume (FEFO)', () => {
  it('takes the earliest expiry first, splits across lots, values the moves at the average and refuses to go below zero', async () => {
    const p = await grower()
    const a = await receiveLot({ productId: p.id, qty: 100, unitCost: 35, date: '2026-09-01', lotNo: 'A' }) // expires 2026-10-11
    const b = await receiveLot({ productId: p.id, qty: 50, unitCost: 38, date: '2026-09-05', lotNo: 'B', expiryDate: '2026-09-30' })
    expect(await averageCost(p.id)).toBe(36)
    expect((await lotsOnHand(p.id)).map((l) => l.lotNo)).toEqual(['B', 'A'])

    const sale = await consume({ productId: p.id, qty: 60, date: '2026-09-06', reason: 'sale', refType: 'sale', refId: 'sale-1' })
    expect(sale.unitCost).toBe(36)
    expect(sale.moves.map((m) => [m.lotId, m.qtyDelta, m.unitCost, m.reason, m.refId])).toEqual([
      [b.lot.id, -50, 36, 'sale', 'sale-1'],
      [a.lot.id, -10, 36, 'sale', 'sale-1'],
    ])
    expect(await stockOnHand(p.id)).toBe(90)
    expect((await db.stockLots.get(b.lot.id))!.qtyOnHand).toBe(0)
    expect((await db.stockLots.get(a.lot.id))!.qtyOnHand).toBe(90)
    expect((await lotsOnHand(p.id)).map((l) => l.lotNo)).toEqual(['A'])

    await expect(consume({ productId: p.id, qty: 91, date: '2026-09-06', reason: 'sale' })).rejects.toThrow(/only 90 kg of expert hog grower mash/i)
    expect(await stockOnHand(p.id)).toBe(90)
    expect(await db.stockMoves.count()).toBe(4)

    await receiveLot({ productId: p.id, qty: 10, unitCost: 45, date: '2026-09-07', lotNo: 'C' })
    expect(await averageCost(p.id)).toBe(36.9)
    expect((await movesForProduct(p.id)).map((m) => m.date)).toEqual(['2026-09-07', '2026-09-06', '2026-09-06', '2026-09-05', '2026-09-01'])
  })

  it('can be limited to one lot and rejects a bad quantity or date', async () => {
    const p = await grower()
    const a = await receiveLot({ productId: p.id, qty: 100, unitCost: 35, date: '2026-09-01', lotNo: 'A' })
    const b = await receiveLot({ productId: p.id, qty: 50, unitCost: 38, date: '2026-09-05', lotNo: 'B', expiryDate: '2026-09-30' })
    const r = await consume({ productId: p.id, qty: 20, date: '2026-09-06', reason: 'loss', lotId: a.lot.id, note: 'wet sack' })
    expect(r.moves).toHaveLength(1)
    expect(r.moves[0]).toMatchObject({ lotId: a.lot.id, qtyDelta: -20, reason: 'loss', note: 'wet sack' })
    expect((await db.stockLots.get(a.lot.id))!.qtyOnHand).toBe(80)
    await expect(consume({ productId: p.id, qty: 51, date: '2026-09-06', reason: 'loss', lotId: b.lot.id })).rejects.toThrow(/only 50 kg/i)
    await expect(consume({ productId: p.id, qty: 0, date: '2026-09-06', reason: 'sale' })).rejects.toThrow(/quantity/i)
    await expect(consume({ productId: p.id, qty: 1, date: 'yesterday', reason: 'sale' })).rejects.toThrow(/date/i)
  })
})

describe('rebuildLotQuantities', () => {
  it('recomputes each lot cache from its live moves', async () => {
    const p = await grower()
    const a = await receiveLot({ productId: p.id, qty: 100, unitCost: 35, date: '2026-09-01' })
    await consume({ productId: p.id, qty: 30, date: '2026-09-02', reason: 'sale' })
    await db.stockLots.update(a.lot.id, { qtyOnHand: 999 })
    await rebuildLotQuantities(p.id)
    expect((await db.stockLots.get(a.lot.id))!.qtyOnHand).toBe(70)
  })
})
