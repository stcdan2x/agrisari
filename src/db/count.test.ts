import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from './db'
import { createProduct } from './productRepo'
import { countStock, receiveLot, stockOnHand, stockSnapshots } from './stockRepo'

const grower = () => createProduct({ name: 'Expert Hog Grower mash', category: 'feed', baseUnit: 'kg', sellUnits: [{ unit: 'sack', factor: 50, price: 1750 }, { unit: 'kg', factor: 1, price: 38 }] })

beforeEach(async () => {
  await Promise.all([db.products.clear(), db.stockLots.clear(), db.stockMoves.clear()])
})

// Fixture: A 100 kg (09-01, expires 10-11) and B 50 kg (09-05, expires 09-30). Counted 140
// on 09-10: the 10 kg shortage leaves the earliest-expiring lot B (40). Counted 145 on
// 09-11: the 5 kg surplus lands on the newest lot with stock, B (45). Counted 145 again:
// no move.
describe('countStock', () => {
  it('writes the shortage FEFO and the surplus onto the newest lot under the count reference', async () => {
    const p = await grower()
    const a = await receiveLot({ productId: p.id, qty: 100, unitCost: 35, date: '2026-09-01', lotNo: 'A' })
    const b = await receiveLot({ productId: p.id, qty: 50, unitCost: 38, date: '2026-09-05', lotNo: 'B', expiryDate: '2026-09-30' })

    const short = await countStock({ productId: p.id, counted: 140, date: '2026-09-10', refId: 'count-1' })
    expect(short.delta).toBe(-10)
    expect(short.moves).toHaveLength(1)
    expect(short.moves[0]).toMatchObject({ lotId: b.lot.id, qtyDelta: -10, unitCost: 36, reason: 'count', refType: 'count', refId: 'count-1' })
    expect((await db.stockLots.get(b.lot.id))!.qtyOnHand).toBe(40)

    const over = await countStock({ productId: p.id, counted: 145, date: '2026-09-11', refId: 'count-2', note: 'found on the shelf' })
    expect(over.delta).toBe(5)
    expect(over.moves[0]).toMatchObject({ lotId: b.lot.id, qtyDelta: 5, unitCost: 36, reason: 'count', refType: 'count', refId: 'count-2', note: 'found on the shelf' })
    expect((await db.stockLots.get(b.lot.id))!.qtyOnHand).toBe(45)
    expect((await db.stockLots.get(a.lot.id))!.qtyOnHand).toBe(100)

    const same = await countStock({ productId: p.id, counted: 145, date: '2026-09-12', refId: 'count-3' })
    expect(same).toEqual({ delta: 0, moves: [] })
    expect(await stockOnHand(p.id)).toBe(145)
    expect(await db.stockMoves.count()).toBe(4)
  })

  it('rejects a negative count, a bad date and a missing reference', async () => {
    const p = await grower()
    await expect(countStock({ productId: p.id, counted: -1, date: '2026-09-10', refId: 'c' })).rejects.toThrow(/count/i)
    await expect(countStock({ productId: p.id, counted: 1, date: 'today', refId: 'c' })).rejects.toThrow(/date/i)
    await expect(countStock({ productId: p.id, counted: 1, date: '2026-09-10', refId: ' ' })).rejects.toThrow(/reference/i)
  })
})

describe('stockSnapshots', () => {
  it('pairs every live product with its stock, live lots and live moves', async () => {
    const p = await grower()
    await receiveLot({ productId: p.id, qty: 100, unitCost: 35, date: '2026-09-01' })
    const empty = await createProduct({ name: 'Urea', category: 'fertilizer', baseUnit: 'bag', sellUnits: [{ unit: 'bag', factor: 1, price: 0 }] })
    const snaps = await stockSnapshots()
    expect(snaps.map((s) => [s.product.id, s.onHand, s.lots.length, s.moves.length])).toEqual([
      [p.id, 100, 1, 1],
      [empty.id, 0, 0, 0],
    ])
  })
})
