import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from './db'
import { latestPrices } from './priceLogRepo'
import { createProduct } from './productRepo'
import { createPurchase, getPurchase, listPurchases, purchaseStatus, receiveLine } from './purchaseRepo'
import { averageCost, lotsOnHand, stockOnHand } from './stockRepo'
import { createSupplier } from './supplierRepo'

const grower = () =>
  createProduct({
    name: 'Expert Hog Grower mash',
    category: 'feed',
    baseUnit: 'kg',
    sellUnits: [{ unit: 'sack', factor: 50, price: 1750 }, { unit: 'kg', factor: 1, price: 38 }],
    hasExpiry: true,
    lotShelfLifeDays: 90,
  })
const urea = () => createProduct({ name: 'Urea 46-0-0', category: 'fertilizer', baseUnit: 'bag', sellUnits: [{ unit: 'bag', factor: 1, price: 1550 }] })

beforeEach(async () => {
  await Promise.all([db.products.clear(), db.suppliers.clear(), db.purchases.clear(), db.transactions.clear(), db.stockLots.clear(), db.stockMoves.clear(), db.priceLog.clear()])
})

describe('purchaseRepo', () => {
  // Order fixture: 10 sacks of grower at 1,700 and 5 bags of urea at 1,400 on 15-day terms.
  it('creates a purchase with its total, due date and expense transaction, and validates the input', async () => {
    const g = await grower()
    const u = await urea()
    const s = await createSupplier({ name: 'SMC dealer', terms: 'days15' })
    const po = await createPurchase({
      date: '2026-09-01',
      supplierId: s.id,
      lines: [
        { productId: g.id, qty: 10, unit: 'sack', unitCost: 1700, lotNo: 'G-0901' },
        { productId: u.id, qty: 5, unit: 'bag', unitCost: 1400 },
      ],
      notes: 'ordered by text',
    })
    expect(po).toMatchObject({ date: '2026-09-01', supplierId: s.id, total: 24000, paidAmount: 0, dueDate: '2026-09-16', notes: 'ordered by text' })
    expect(po.lines).toEqual([
      { productId: g.id, qty: 10, unit: 'sack', unitCost: 1700, lotNo: 'G-0901', receivedQty: 0 },
      { productId: u.id, qty: 5, unit: 'bag', unitCost: 1400, receivedQty: 0 },
    ])
    expect(purchaseStatus(po)).toBe('ordered')
    const tx = await db.transactions.get(po.transactionId!)
    expect(tx).toMatchObject({ date: '2026-09-01', kind: 'expense', category: 'stock purchases', amount: 24000, links: { purchaseId: po.id } })
    expect(await stockOnHand(g.id)).toBe(0) // nothing received yet

    const cod = await createSupplier({ name: 'Agro Depot', terms: 'cod' })
    const cash = await createPurchase({ date: '2026-09-01', supplierId: cod.id, lines: [{ productId: u.id, qty: 2, unit: 'bag', unitCost: 1400 }] })
    expect(cash).toMatchObject({ total: 2800, paidAmount: 2800, dueDate: '2026-09-01' })
    const other = await createSupplier({ name: 'Consignor', terms: 'other' })
    expect((await createPurchase({ date: '2026-09-01', supplierId: other.id, lines: [{ productId: u.id, qty: 1, unit: 'bag', unitCost: 1400 }] })).dueDate).toBeUndefined()

    const line = { productId: u.id, qty: 1, unit: 'bag', unitCost: 1400 }
    await expect(createPurchase({ date: '1 Sept', supplierId: s.id, lines: [line] })).rejects.toThrow(/date/i)
    await expect(createPurchase({ date: '2026-09-01', supplierId: 'nope', lines: [line] })).rejects.toThrow(/supplier/i)
    await expect(createPurchase({ date: '2026-09-01', supplierId: s.id, lines: [] })).rejects.toThrow(/line/i)
    await expect(createPurchase({ date: '2026-09-01', supplierId: s.id, lines: [{ ...line, qty: 0 }] })).rejects.toThrow(/quantity/i)
    await expect(createPurchase({ date: '2026-09-01', supplierId: s.id, lines: [{ ...line, unitCost: -1 }] })).rejects.toThrow(/cost/i)
    await expect(createPurchase({ date: '2026-09-01', supplierId: s.id, lines: [{ ...line, unit: 'pail' }] })).rejects.toThrow(/pail/)
    await expect(createPurchase({ date: '2026-09-01', supplierId: s.id, lines: [line], paidAmount: 1401 })).rejects.toThrow(/above the total/i)
    expect((await listPurchases()).map((p) => p.id)).toEqual([other.id, cod.id, s.id].map(() => expect.any(String)))
    expect((await listPurchases({ supplierId: s.id })).map((p) => p.id)).toEqual([po.id])
  })

  // Receiving fixture: the order above received in two parts for the grower (4 sacks on
  // 09-03, 6 on 09-05) and in one for the urea; each receipt opens a lot at the ordered
  // cost per base unit (1,700 / 50 = 34 per kg) and logs the price; a 7th sack is refused.
  it('receives lines partially and repeatedly into lots up to the ordered quantity', async () => {
    const g = await grower()
    const u = await urea()
    const s = await createSupplier({ name: 'SMC dealer', terms: 'days15' })
    const po = await createPurchase({
      date: '2026-09-01',
      supplierId: s.id,
      lines: [
        { productId: g.id, qty: 10, unit: 'sack', unitCost: 1700, lotNo: 'G-0901', expiryDate: '2026-12-01' },
        { productId: u.id, qty: 5, unit: 'bag', unitCost: 1400 },
      ],
    })

    const r1 = await receiveLine({ purchaseId: po.id, lineIndex: 0, qty: 4, date: '2026-09-03' })
    expect(r1.lot).toMatchObject({ productId: g.id, qtyOnHand: 200, unitCost: 34, lotNo: 'G-0901', expiryDate: '2026-12-01', receivedDate: '2026-09-03', purchaseId: po.id })
    expect(r1.move).toMatchObject({ lotId: r1.lot.id, qtyDelta: 200, unitCost: 34, reason: 'purchase', refType: 'purchase', refId: po.id, date: '2026-09-03' })
    expect(r1.purchase.lines[0].receivedQty).toBe(4)
    expect(purchaseStatus(r1.purchase)).toBe('partial')
    expect((await latestPrices(g.id)).map((o) => [o.kind, o.value, o.unit, o.source, o.supplierId])).toEqual([['supplierPrice', 34, 'kg', 'own', s.id]])

    const r2 = await receiveLine({ purchaseId: po.id, lineIndex: 0, qty: 6, date: '2026-09-05', lotNo: 'G-0905', expiryDate: '2026-12-05' })
    expect(r2.lot).toMatchObject({ qtyOnHand: 300, unitCost: 34, lotNo: 'G-0905', expiryDate: '2026-12-05' })
    expect(r2.purchase.lines[0].receivedQty).toBe(10)
    expect(purchaseStatus(r2.purchase)).toBe('partial') // the urea is still out
    await expect(receiveLine({ purchaseId: po.id, lineIndex: 0, qty: 1, date: '2026-09-06' })).rejects.toThrow(/fully received/i)

    const r3 = await receiveLine({ purchaseId: po.id, lineIndex: 1, qty: 5, date: '2026-09-05' })
    expect(r3.lot).toMatchObject({ productId: u.id, qtyOnHand: 5, unitCost: 1400 })
    expect(r3.lot.expiryDate).toBeUndefined()
    expect(purchaseStatus(r3.purchase)).toBe('received')
    expect(purchaseStatus((await getPurchase(po.id))!)).toBe('received')

    expect(await stockOnHand(g.id)).toBe(500)
    expect(await averageCost(g.id)).toBe(34)
    expect((await lotsOnHand(g.id)).map((l) => l.lotNo)).toEqual(['G-0901', 'G-0905'])
    expect(await stockOnHand(u.id)).toBe(5)
    expect(await db.stockMoves.where('[refType+refId]').equals(['purchase', po.id]).count()).toBe(3)
  })

  it('refuses an over-receipt and bad input, and takes a changed cost at delivery', async () => {
    const g = await grower()
    const s = await createSupplier({ name: 'SMC dealer', terms: 'days15' })
    const po = await createPurchase({ date: '2026-09-01', supplierId: s.id, lines: [{ productId: g.id, qty: 10, unit: 'sack', unitCost: 1700 }] })
    await expect(receiveLine({ purchaseId: po.id, lineIndex: 0, qty: 11, date: '2026-09-03' })).rejects.toThrow(/only 10 sack/i)
    await expect(receiveLine({ purchaseId: po.id, lineIndex: 0, qty: 0, date: '2026-09-03' })).rejects.toThrow(/quantity/i)
    await expect(receiveLine({ purchaseId: po.id, lineIndex: 2, qty: 1, date: '2026-09-03' })).rejects.toThrow(/line/i)
    await expect(receiveLine({ purchaseId: 'nope', lineIndex: 0, qty: 1, date: '2026-09-03' })).rejects.toThrow(/purchase/i)
    await expect(receiveLine({ purchaseId: po.id, lineIndex: 0, qty: 1, date: 'yesterday' })).rejects.toThrow(/date/i)
    await expect(receiveLine({ purchaseId: po.id, lineIndex: 0, qty: 1, date: '2026-09-03', unitCost: -5 })).rejects.toThrow(/cost/i)

    // The dealer raised the price to 1,750 a sack by delivery: the lot and the log carry 35 per kg,
    // the ordered line keeps its 1,700 for the record.
    const r = await receiveLine({ purchaseId: po.id, lineIndex: 0, qty: 10, date: '2026-09-03', unitCost: 1750 })
    expect(r.lot).toMatchObject({ qtyOnHand: 500, unitCost: 35 })
    expect(r.lot.expiryDate).toBe('2026-12-02') // 90-day shelf life from the receipt
    expect(r.purchase.lines[0]).toMatchObject({ unitCost: 1700, receivedQty: 10 })
    expect((await latestPrices(g.id))[0]).toMatchObject({ value: 35, unit: 'kg' })
    expect(await stockOnHand(g.id)).toBe(500)
    await expect(receiveLine({ purchaseId: po.id, lineIndex: 0, qty: 1, date: '2026-09-04' })).rejects.toThrow(/fully received/i)
  })
})
