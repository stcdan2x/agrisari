import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from './db'
import { payablesSchedule, recordPayable, supplierBalance } from './paymentRepo'
import { latestPrices, priceHistory } from './priceLogRepo'
import { createProduct } from './productRepo'
import { createPurchase, getPurchase, leadTimeFor, purchaseStatus, receiveLine } from './purchaseRepo'
import { createSale } from './saleRepo'
import { averageCost, lotsOnHand, stockOnHand } from './stockRepo'
import { createSupplier } from './supplierRepo'

// The P5 verify fixture: a purchasing week, 2026-09-14 to 09-20, checked against
// hand-computed values.
//   09-14 SMC dealer (15-day terms, typed lead 5): 10 sacks grower at 1,700 (lot G-0914,
//         exp 2026-12-14) and 5 sacks layer mash at 1,650: total 25,250, due 09-29, unpaid
//   09-15 Agro Depot (COD): 10 bags urea at 1,400: 14,000 paid on the spot, due 09-15
//   09-15 Agro delivers the urea: lot 10 bags at 1,400
//   09-16 SMC delivers 6 sacks grower (lot 300 kg at 34) and the 5 sacks layer (250 kg at 33)
//   09-18 SMC delivers the last 4 sacks grower at 1,750 a sack (lot 200 kg at 35)
//         grower average (300 x 34 + 200 x 35) / 500 = 34.4
//   09-19 a tingi sale of 60 kg grower at 38 for cash: FEFO takes it from G-0914
//         (both grower lots expire 12-14, the older receipt first), COGS 60 x 34.4 = 2,064
//   09-19 SMC paid 10,000 by cash: 15,250 still owed, due 09-29
// On 09-20: grower 440 kg on hand (240 + 200), layer 250 kg, urea 10 bags; four purchase
// moves; the price log holds 35 as the latest SMC grower price with 34 behind it, layer 33,
// urea 1,400; two expense transactions and one revenue; the schedule shows SMC 15,250 not
// overdue (1 day overdue on 09-30); SMC lead time learned 2 days from one receipt, Agro 0.

beforeEach(async () => {
  await Promise.all([
    db.products.clear(),
    db.suppliers.clear(),
    db.purchases.clear(),
    db.transactions.clear(),
    db.stockLots.clear(),
    db.stockMoves.clear(),
    db.priceLog.clear(),
    db.payments.clear(),
    db.sales.clear(),
  ])
})

describe('purchasing week fixture', () => {
  it('orders, receives in parts, sells from the lots and pays, matching the hand-computed values', async () => {
    const grower = await createProduct({
      name: 'Expert Hog Grower mash',
      category: 'feed',
      baseUnit: 'kg',
      sellUnits: [{ unit: 'sack', factor: 50, price: 1950 }, { unit: 'kg', factor: 1, price: 38 }],
      hasExpiry: true,
      lotShelfLifeDays: 90,
    })
    const layer = await createProduct({
      name: 'Layer mash',
      category: 'feed',
      baseUnit: 'kg',
      sellUnits: [{ unit: 'sack', factor: 50, price: 1900 }, { unit: 'kg', factor: 1, price: 37 }],
      hasExpiry: true,
      lotShelfLifeDays: 90,
    })
    const urea = await createProduct({ name: 'Urea 46-0-0', category: 'fertilizer', baseUnit: 'bag', sellUnits: [{ unit: 'bag', factor: 1, price: 1550 }] })
    const smc = await createSupplier({ name: 'SMC dealer', terms: 'days15', leadTimeDays: 5 })
    const agro = await createSupplier({ name: 'Agro Depot', terms: 'cod' })

    const poSmc = await createPurchase({
      date: '2026-09-14',
      supplierId: smc.id,
      lines: [
        { productId: grower.id, qty: 10, unit: 'sack', unitCost: 1700, lotNo: 'G-0914', expiryDate: '2026-12-14' },
        { productId: layer.id, qty: 5, unit: 'sack', unitCost: 1650 },
      ],
    })
    expect(poSmc).toMatchObject({ total: 25250, paidAmount: 0, dueDate: '2026-09-29' })
    const poAgro = await createPurchase({ date: '2026-09-15', supplierId: agro.id, lines: [{ productId: urea.id, qty: 10, unit: 'bag', unitCost: 1400 }] })
    expect(poAgro).toMatchObject({ total: 14000, paidAmount: 14000, dueDate: '2026-09-15' })

    await receiveLine({ purchaseId: poAgro.id, lineIndex: 0, qty: 10, date: '2026-09-15' })
    await receiveLine({ purchaseId: poSmc.id, lineIndex: 0, qty: 6, date: '2026-09-16' })
    await receiveLine({ purchaseId: poSmc.id, lineIndex: 1, qty: 5, date: '2026-09-16' })
    expect(purchaseStatus((await getPurchase(poSmc.id))!)).toBe('partial')
    await receiveLine({ purchaseId: poSmc.id, lineIndex: 0, qty: 4, date: '2026-09-18', unitCost: 1750 })
    expect(purchaseStatus((await getPurchase(poSmc.id))!)).toBe('received')
    expect(purchaseStatus((await getPurchase(poAgro.id))!)).toBe('received')
    expect(await averageCost(grower.id)).toBe(34.4)

    const sale = await createSale({ date: '2026-09-19', lines: [{ productId: grower.id, qty: 60, unit: 'kg' }], paymentMethod: 'cash' })
    expect(sale.total).toBe(2280)
    expect(sale.lines[0].unitCost).toBe(34.4)
    await recordPayable({ supplierId: smc.id, date: '2026-09-19', amount: 10000, method: 'cash' })

    // Stock and lots
    expect(await stockOnHand(grower.id)).toBe(440)
    expect(await stockOnHand(layer.id)).toBe(250)
    expect(await stockOnHand(urea.id)).toBe(10)
    expect((await lotsOnHand(grower.id)).map((l) => [l.lotNo, l.qtyOnHand, l.unitCost, l.expiryDate, l.purchaseId])).toEqual([
      ['G-0914', 240, 34, '2026-12-14', poSmc.id],
      ['G-0914', 200, 35, '2026-12-14', poSmc.id],
    ])
    expect((await lotsOnHand(layer.id)).map((l) => [l.qtyOnHand, l.unitCost, l.expiryDate])).toEqual([[250, 33, '2026-12-15']])
    expect((await lotsOnHand(urea.id)).map((l) => [l.qtyOnHand, l.unitCost, l.expiryDate])).toEqual([[10, 1400, undefined]])
    expect(await averageCost(grower.id)).toBe(34.4)
    const purchaseMoves = await db.stockMoves.where('reason').equals('purchase').toArray()
    expect(purchaseMoves.map((m) => [m.date, m.qtyDelta, m.unitCost, m.refId]).sort()).toEqual([
      ['2026-09-15', 10, 1400, poAgro.id],
      ['2026-09-16', 250, 33, poSmc.id],
      ['2026-09-16', 300, 34, poSmc.id],
      ['2026-09-18', 200, 35, poSmc.id],
    ])
    const saleMoves = await db.stockMoves.where('[refType+refId]').equals(['sale', sale.id]).toArray()
    expect(saleMoves.map((m) => [m.qtyDelta, m.unitCost])).toEqual([[-60, 34.4]])

    // Price log
    expect((await latestPrices(grower.id)).map((o) => [o.date, o.value, o.unit, o.supplierId])).toEqual([['2026-09-18', 35, 'kg', smc.id]])
    expect((await priceHistory(grower.id)).map((o) => o.value)).toEqual([35, 34])
    expect((await latestPrices(layer.id)).map((o) => o.value)).toEqual([33])
    expect((await latestPrices(urea.id)).map((o) => [o.value, o.supplierId])).toEqual([[1400, agro.id]])

    // Transactions
    const txs = await db.transactions.toArray()
    expect(txs.map((t) => [t.kind, t.category, t.amount]).sort()).toEqual([
      ['expense', 'stock purchases', 14000],
      ['expense', 'stock purchases', 25250],
      ['revenue', 'sales', 2280],
    ])

    // Payables and lead time
    expect((await payablesSchedule('2026-09-20')).map((r) => [r.supplierName, r.open, r.dueDate, r.overdue, r.daysOverdue])).toEqual([['SMC dealer', 15250, '2026-09-29', false, 0]])
    expect((await payablesSchedule('2026-09-30')).map((r) => [r.open, r.overdue, r.daysOverdue])).toEqual([[15250, true, 1]])
    expect(await supplierBalance(smc.id)).toBe(15250)
    expect(await supplierBalance(agro.id)).toBe(0)
    expect(await leadTimeFor(smc)).toEqual({ days: 2, learned: true, samples: 1 })
    expect(await leadTimeFor(agro)).toEqual({ days: 0, learned: true, samples: 1 })
  })
})
