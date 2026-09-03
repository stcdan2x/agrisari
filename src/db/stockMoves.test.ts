import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from './db'
import { createProduct } from './productRepo'
import { adjust, averageCost, lotsOnHand, receiveLot, recordLoss, repack, stockOnHand, writeOffExpired } from './stockRepo'

const grower = () =>
  createProduct({ name: 'Expert Hog Grower mash', category: 'feed', baseUnit: 'kg', sellUnits: [{ unit: 'sack', factor: 50, price: 1750 }, { unit: 'kg', factor: 1, price: 38 }] })

beforeEach(async () => {
  await Promise.all([db.products.clear(), db.stockLots.clear(), db.stockMoves.clear()])
})

// Fixture: lot A 100 kg at 35 (2026-09-01, expires 10-11), lot B 50 kg at 38 (09-05, expires
// 09-30); average 36. Write off B on 10-01 (-50 at 36), lose 5 kg on 10-02 (-5 at 36 from A),
// find 10 kg on 10-03 (+10 at 36 onto A): A holds 105, average stays 36, on hand 105.
describe('writeOffExpired, recordLoss, adjust', () => {
  it('follow the hand-computed fixture', async () => {
    const p = await grower()
    const a = await receiveLot({ productId: p.id, qty: 100, unitCost: 35, date: '2026-09-01', lotNo: 'A' })
    const b = await receiveLot({ productId: p.id, qty: 50, unitCost: 38, date: '2026-09-05', lotNo: 'B', expiryDate: '2026-09-30' })

    const off = await writeOffExpired({ lotId: b.lot.id, date: '2026-10-01' })
    expect(off).toMatchObject({ lotId: b.lot.id, qtyDelta: -50, unitCost: 36, reason: 'expired', date: '2026-10-01' })
    expect((await db.stockLots.get(b.lot.id))!.qtyOnHand).toBe(0)
    await expect(writeOffExpired({ lotId: b.lot.id, date: '2026-10-01' })).rejects.toThrow(/nothing left/i)
    await expect(writeOffExpired({ lotId: 'nope', date: '2026-10-01' })).rejects.toThrow(/lot/i)

    const loss = await recordLoss({ productId: p.id, qty: 5, date: '2026-10-02', note: 'wet sack' })
    expect(loss.moves).toHaveLength(1)
    expect(loss.moves[0]).toMatchObject({ lotId: a.lot.id, qtyDelta: -5, unitCost: 36, reason: 'loss', note: 'wet sack' })

    const found = await adjust({ productId: p.id, qtyDelta: 10, date: '2026-10-03', note: 'found a sack in the bodega' })
    expect(found.moves).toHaveLength(1)
    expect(found.moves[0]).toMatchObject({ lotId: a.lot.id, qtyDelta: 10, unitCost: 36, reason: 'adjustment', note: 'found a sack in the bodega' })
    expect((await db.stockLots.get(a.lot.id))!.qtyOnHand).toBe(105)
    expect(await stockOnHand(p.id)).toBe(105)
    expect(await averageCost(p.id)).toBe(36)

    const less = await adjust({ productId: p.id, qtyDelta: -3, date: '2026-10-04', note: 'miscount' })
    expect(less.moves[0]).toMatchObject({ lotId: a.lot.id, qtyDelta: -3, reason: 'adjustment' })
    expect(await stockOnHand(p.id)).toBe(102)
  })

  it('adjust needs a note and a non-zero quantity, and opens a lot when the product has none', async () => {
    const p = await grower()
    await expect(adjust({ productId: p.id, qtyDelta: 0, date: '2026-10-03', note: 'x' })).rejects.toThrow(/quantity/i)
    await expect(adjust({ productId: p.id, qtyDelta: 1, date: '2026-10-03', note: ' ' })).rejects.toThrow(/note/i)
    await expect(adjust({ productId: p.id, qtyDelta: -1, date: '2026-10-03', note: 'x' })).rejects.toThrow(/only 0 kg/i)
    const opening = await adjust({ productId: p.id, qtyDelta: 40, date: '2026-10-03', note: 'opening stock', unitCost: 30 })
    expect(opening.moves[0]).toMatchObject({ qtyDelta: 40, unitCost: 30, reason: 'adjustment' })
    const lots = await lotsOnHand(p.id)
    expect(lots).toHaveLength(1)
    expect(lots[0]).toMatchObject({ qtyOnHand: 40, unitCost: 30, receivedDate: '2026-10-03', expiryDate: '2026-11-12' })
    expect(await averageCost(p.id)).toBe(30)
  })
})

// Fixture: 25 kg of concentrate at 40 (1,000 pesos, received 09-01, expires 10-01 by the
// 30-day ingredient default) repacked on 09-02 into 24 one-kilo packs (1 kg spilled): the
// packs cost 1,000 / 24 = 41.6667 each and inherit the earliest source expiry.
describe('repack', () => {
  it('moves stock and cost from the source product to the target product under one reference', async () => {
    const bulk = await createProduct({ name: 'Premium Hog Concentrate mash', category: 'feedIngredient', baseUnit: 'kg', sellUnits: [{ unit: 'sack', factor: 25, price: 0 }, { unit: 'kg', factor: 1, price: 0 }] })
    const packs = await createProduct({ name: 'Hog concentrate 1 kg pack', category: 'feedIngredient', baseUnit: 'pack', sellUnits: [{ unit: 'pack', factor: 1, price: 55 }] })
    await receiveLot({ productId: bulk.id, qty: 25, unitCost: 40, date: '2026-09-01' })

    const r = await repack({ fromProductId: bulk.id, toProductId: packs.id, qtyOut: 25, qtyIn: 24, date: '2026-09-02', note: '1 kg spilled' })
    expect(r.out.moves).toHaveLength(1)
    expect(r.out.moves[0]).toMatchObject({ productId: bulk.id, qtyDelta: -25, unitCost: 40, reason: 'repack', refId: r.refId, note: '1 kg spilled' })
    expect(r.in.move).toMatchObject({ productId: packs.id, lotId: r.in.lot.id, qtyDelta: 24, unitCost: 41.6667, reason: 'repack', refId: r.refId })
    expect(r.in.lot).toMatchObject({ qtyOnHand: 24, unitCost: 41.6667, receivedDate: '2026-09-02', expiryDate: '2026-10-01' })
    expect(await stockOnHand(bulk.id)).toBe(0)
    expect(await stockOnHand(packs.id)).toBe(24)
    expect(await averageCost(packs.id)).toBe(41.6667)

    await expect(repack({ fromProductId: bulk.id, toProductId: packs.id, qtyOut: 1, qtyIn: 1, date: '2026-09-03' })).rejects.toThrow(/only 0 kg/i)
    await expect(repack({ fromProductId: bulk.id, toProductId: bulk.id, qtyOut: 1, qtyIn: 1, date: '2026-09-03' })).rejects.toThrow(/different/i)
    await expect(repack({ fromProductId: bulk.id, toProductId: packs.id, qtyOut: 1, qtyIn: 0, date: '2026-09-03' })).rejects.toThrow(/quantity/i)
  })
})
