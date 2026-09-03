import 'fake-indexeddb/auto'
import { beforeAll, describe, expect, it } from 'vitest'
import { packLabel, stockAlerts } from '../engine/inventory'
import { seedCatalog } from '../knowledge/catalog'
import { db } from './db'
import { createProduct, updateProduct } from './productRepo'
import { averageCost, consume, countStock, lotsOnHand, rebuildLotQuantities, receiveLot, recordLoss, repack, stockOnHand, stockSnapshots, writeOffExpired } from './stockRepo'

// PLAN.md section 10, P3 verify column: a seeded store receives, repacks, sells and counts
// with stock and lots agreeing with hand-computed fixtures. Today is 2026-09-20.
//   Grower (catalog-005, kg, sack 50): 10 sacks = 500 kg at 34 on 09-01 (lot 1, expires
//     10-11) and 4 sacks = 200 kg at 37.5 on 09-10 (lot 2, expires 10-20): average
//     (17,000 + 7,500) / 700 = 35. Sold 3 kg tingi 09-11 and 2 sacks 09-12, both from lot 1
//     (earlier expiry): lot 1 397, on hand 597. Lost 2 kg 09-13 (lot 1 395). Counted 590 on
//     09-15: 5 short, taken from lot 1 (390): "11 sacks + 40 kg". Value 590 x 35 = 20,650.
//   Concentrate (catalog-026, kg, sack 25): 25 kg at 40 on 09-01 (expires 10-01 by the
//     30-day ingredient default) repacked 09-02 into 24 packs of a new product: 41.6667 per
//     pack, expiry 10-01. Written off on 10-02: -24 at 41.6667.
//   Urea (catalog-084, bag): 20 bags at 1,450 on 09-05, no expiry; sold 5 on 09-08 (15 left,
//     21,750); counted 15 on 09-15: no move.
//   Sprayer (catalog-112, piece): 2 at 900 on 05-01, never sold: dead stock worth 1,800.
//   Alerts on 09-20 with the grower reorder level 600 and quantity 500: grower low (590,
//     buy 500); lot 1 expiring in 21 days (390) and lot 2 in 30 days (200), both window 30;
//     packs lot expiring in 11 days (24); grower count mismatch -5 on 09-15; sprayer dead.
const TODAY = '2026-09-20'
const GROWER = 'catalog-005'
const BULK = 'catalog-026'
const UREA = 'catalog-084'
const SPRAYER = 'catalog-112'
let packsId = ''
let lot1 = ''
let lot2 = ''
let packsLot = ''

beforeAll(async () => {
  await Promise.all(db.tables.map((t) => t.clear()))
  expect(await seedCatalog()).toBe(130)
  lot1 = (await receiveLot({ productId: GROWER, qty: 500, unitCost: 34, date: '2026-09-01', lotNo: 'G1' })).lot.id
  lot2 = (await receiveLot({ productId: GROWER, qty: 200, unitCost: 37.5, date: '2026-09-10', lotNo: 'G2' })).lot.id
  await consume({ productId: GROWER, qty: 3, date: '2026-09-11', reason: 'sale', refType: 'sale', refId: 's1' })
  await consume({ productId: GROWER, qty: 100, date: '2026-09-12', reason: 'sale', refType: 'sale', refId: 's2' })
  await recordLoss({ productId: GROWER, qty: 2, date: '2026-09-13', note: 'wet' })

  await receiveLot({ productId: BULK, qty: 25, unitCost: 40, date: '2026-09-01' })
  const packs = await createProduct({ name: 'Hog concentrate 1 kg pack', category: 'feedIngredient', baseUnit: 'pack', sellUnits: [{ unit: 'pack', factor: 1, price: 55 }] })
  packsId = packs.id
  packsLot = (await repack({ fromProductId: BULK, toProductId: packsId, qtyOut: 25, qtyIn: 24, date: '2026-09-02' })).in.lot.id

  await receiveLot({ productId: UREA, qty: 20, unitCost: 1450, date: '2026-09-05' })
  await consume({ productId: UREA, qty: 5, date: '2026-09-08', reason: 'sale', refType: 'sale', refId: 's3' })
  await receiveLot({ productId: SPRAYER, qty: 2, unitCost: 900, date: '2026-05-01' })

  await countStock({ productId: GROWER, counted: 590, date: '2026-09-15', refId: 'count-1' })
  await countStock({ productId: UREA, counted: 15, date: '2026-09-15', refId: 'count-1' })
  await updateProduct(GROWER, { reorderLevel: 600, reorderQty: 500 })
})

describe('the seeded store after receiving, selling, losing, repacking and counting', () => {
  it('holds the hand-computed stock, lots and average costs', async () => {
    expect(await stockOnHand(GROWER)).toBe(590)
    expect(await averageCost(GROWER)).toBe(35)
    const lots = await lotsOnHand(GROWER)
    expect(lots.map((l) => [l.id, l.qtyOnHand, l.expiryDate])).toEqual([
      [lot1, 390, '2026-10-11'],
      [lot2, 200, '2026-10-20'],
    ])
    expect(packLabel(590, (await db.products.get(GROWER))!)).toBe('11 sacks + 40 kg')
    expect(await stockOnHand(BULK)).toBe(0)
    expect(await stockOnHand(packsId)).toBe(24)
    expect(await averageCost(packsId)).toBe(41.6667)
    expect((await lotsOnHand(packsId))[0]).toMatchObject({ id: packsLot, qtyOnHand: 24, expiryDate: '2026-10-01' })
    expect(await stockOnHand(UREA)).toBe(15)
    expect(await averageCost(UREA)).toBe(1450)
    expect((await lotsOnHand(UREA))[0].expiryDate).toBeUndefined()
  })

  it('values the inventory at cost and derives stock from the moves', async () => {
    const snaps = await stockSnapshots()
    const total = (await Promise.all(snaps.filter((s) => s.onHand > 0).map(async (s) => s.onHand * (await averageCost(s.product.id))))).reduce((a, b) => a + b, 0)
    expect(total).toBeCloseTo(20650 + 1000 + 21750 + 1800, 2)
    const grower = snaps.find((s) => s.product.id === GROWER)!
    expect(grower.moves.map((m) => [m.date, m.qtyDelta, m.unitCost, m.reason]).sort((a, b) => String(a[0]).localeCompare(String(b[0])))).toEqual([
      ['2026-09-01', 500, 34, 'purchase'],
      ['2026-09-10', 200, 37.5, 'purchase'],
      ['2026-09-11', -3, 35, 'sale'],
      ['2026-09-12', -100, 35, 'sale'],
      ['2026-09-13', -2, 35, 'loss'],
      ['2026-09-15', -5, 35, 'count'],
    ])
    expect(snaps.find((s) => s.product.id === UREA)!.moves.filter((m) => m.reason === 'count')).toEqual([])
    await db.stockLots.update(lot1, { qtyOnHand: 1 })
    await rebuildLotQuantities()
    expect((await db.stockLots.get(lot1))!.qtyOnHand).toBe(390)
  })

  it('raises the expected alerts on 2026-09-20', async () => {
    const alerts = stockAlerts(await stockSnapshots(), TODAY)
    expect(alerts).toContainEqual({ type: 'lowStock', productId: GROWER, onHand: 590, reorderLevel: 600, suggestQty: 500 })
    expect(alerts).toContainEqual({ type: 'expiring', productId: GROWER, lotId: lot1, expiryDate: '2026-10-11', qty: 390, daysToExpiry: 21, window: 30 })
    expect(alerts).toContainEqual({ type: 'expiring', productId: GROWER, lotId: lot2, expiryDate: '2026-10-20', qty: 200, daysToExpiry: 30, window: 30 })
    expect(alerts).toContainEqual({ type: 'expiring', productId: packsId, lotId: packsLot, expiryDate: '2026-10-01', qty: 24, daysToExpiry: 11, window: 30 })
    expect(alerts).toContainEqual({ type: 'countMismatch', productId: GROWER, date: '2026-09-15', delta: -5, refId: 'count-1' })
    expect(alerts).toContainEqual({ type: 'deadStock', productId: SPRAYER, onHand: 2, value: 1800, daysSinceSale: null, daysSinceReceipt: 142 })
    expect(alerts.filter((a) => a.productId === UREA)).toEqual([])
    expect(alerts).toHaveLength(6)
  })

  it('writes off the expired packs on 2026-10-02', async () => {
    const move = await writeOffExpired({ lotId: packsLot, date: '2026-10-02' })
    expect(move).toMatchObject({ productId: packsId, qtyDelta: -24, unitCost: 41.6667, reason: 'expired' })
    expect(await stockOnHand(packsId)).toBe(0)
    expect(await lotsOnHand(packsId)).toEqual([])
  })
})
