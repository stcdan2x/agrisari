import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from './db'
import { payablesSchedule, paymentsForSupplier, recordPayable, supplierBalance } from './paymentRepo'
import { createProduct } from './productRepo'
import { createPurchase, leadTimeFor, receiveLine } from './purchaseRepo'
import { createSupplier } from './supplierRepo'

const urea = () => createProduct({ name: 'Urea 46-0-0', category: 'fertilizer', baseUnit: 'bag', sellUnits: [{ unit: 'bag', factor: 1, price: 1550 }] })

beforeEach(async () => {
  await Promise.all([db.products.clear(), db.suppliers.clear(), db.purchases.clear(), db.transactions.clear(), db.stockLots.clear(), db.stockMoves.clear(), db.priceLog.clear(), db.payments.clear()])
})

describe('recordPayable', () => {
  it('records a payment to the supplier, optionally against one purchase, posts no transaction and validates', async () => {
    const u = await urea()
    const smc = await createSupplier({ name: 'SMC dealer', terms: 'days15' })
    const agro = await createSupplier({ name: 'Agro Depot', terms: 'cod' })
    const po = await createPurchase({ date: '2026-09-01', supplierId: smc.id, lines: [{ productId: u.id, qty: 10, unit: 'bag', unitCost: 1400 }] })
    const pay = await recordPayable({ supplierId: smc.id, date: '2026-09-10', amount: 5000, method: 'bank', refId: po.id, note: 'first half' })
    expect(pay).toMatchObject({ kind: 'payable', supplierId: smc.id, refId: po.id, amount: 5000, method: 'bank', date: '2026-09-10', note: 'first half' })
    expect(await supplierBalance(smc.id)).toBe(9000)
    expect((await paymentsForSupplier(smc.id)).map((p) => p.id)).toEqual([pay.id])
    expect(await db.transactions.count()).toBe(1) // the purchase's expense only: paying a payable is not a new expense

    await expect(recordPayable({ supplierId: smc.id, date: '2026-09-10', amount: 0, method: 'cash' })).rejects.toThrow(/amount/i)
    await expect(recordPayable({ supplierId: smc.id, date: '10 Sept', amount: 10, method: 'cash' })).rejects.toThrow(/date/i)
    await expect(recordPayable({ supplierId: 'nope', date: '2026-09-10', amount: 10, method: 'cash' })).rejects.toThrow(/supplier/i)
    await expect(recordPayable({ supplierId: agro.id, date: '2026-09-10', amount: 10, method: 'cash', refId: po.id })).rejects.toThrow(/purchase/i)
    expect(await supplierBalance(agro.id)).toBe(0)
  })
})

// Schedule fixture on 2026-09-20: four suppliers on COD, 7, 15 and 30 day terms, each
// with one purchase of 10 bags at 1,400 (14,000) on 09-01, and SMC (15 days) with a second
// purchase of 5 bags (7,000) on 09-10 due 09-25 plus a part payment of 10,000 on 09-12 that
// settles the older purchase first. COD is paid on the spot, so it never shows.
describe('payablesSchedule', () => {
  it('lists open purchases by due date with the overdue flag after FIFO settlement', async () => {
    const u = await urea()
    const line = (qty: number) => [{ productId: u.id, qty, unit: 'bag', unitCost: 1400 }]
    const cod = await createSupplier({ name: 'Agro Depot', terms: 'cod' })
    const d7 = await createSupplier({ name: 'Seed House', terms: 'days7' })
    const smc = await createSupplier({ name: 'SMC dealer', terms: 'days15' })
    const d30 = await createSupplier({ name: 'Vet Pharma', terms: 'days30' })
    const other = await createSupplier({ name: 'Consignor', terms: 'other' })
    await createPurchase({ date: '2026-09-01', supplierId: cod.id, lines: line(10) })
    const p7 = await createPurchase({ date: '2026-09-01', supplierId: d7.id, lines: line(10) })
    const p15a = await createPurchase({ date: '2026-09-01', supplierId: smc.id, lines: line(10) })
    const p15b = await createPurchase({ date: '2026-09-10', supplierId: smc.id, lines: line(5) })
    const p30 = await createPurchase({ date: '2026-09-01', supplierId: d30.id, lines: line(10) })
    const pOther = await createPurchase({ date: '2026-09-01', supplierId: other.id, lines: line(1) })
    await recordPayable({ supplierId: smc.id, date: '2026-09-12', amount: 10000, method: 'cash' })

    const rows = await payablesSchedule('2026-09-20')
    expect(rows.map((r) => [r.purchaseId, r.supplierName, r.dueDate, r.open, r.overdue, r.daysOverdue])).toEqual([
      [p7.id, 'Seed House', '2026-09-08', 14000, true, 12],
      [p15a.id, 'SMC dealer', '2026-09-16', 4000, true, 4],
      [p15b.id, 'SMC dealer', '2026-09-25', 7000, false, 0],
      [p30.id, 'Vet Pharma', '2026-10-01', 14000, false, 0],
      [pOther.id, 'Consignor', undefined, 1400, false, 0],
    ])
    expect(rows.reduce((s, r) => s + r.open, 0)).toBe(40400)
    expect(await supplierBalance(smc.id)).toBe(11000)

    await recordPayable({ supplierId: smc.id, date: '2026-09-21', amount: 11000, method: 'gcash' })
    expect((await payablesSchedule('2026-09-21')).map((r) => r.purchaseId)).toEqual([p7.id, p30.id, pOther.id])
  })
})

// Lead time fixture: SMC typed 5 days; orders on 09-01 (first receipt 09-03: 2 days), 09-05
// (09-10: 5 days) and 09-12 (09-15: 3 days, the second receipt on 09-20 does not count);
// an unreceived order on 09-18 is skipped: the learned lead time is round(10 / 3) = 3.
describe('leadTimeFor', () => {
  it('averages the days from order to first receipt over the received purchases, else the typed value', async () => {
    const u = await urea()
    const line = [{ productId: u.id, qty: 10, unit: 'bag', unitCost: 1400 }]
    const smc = await createSupplier({ name: 'SMC dealer', terms: 'days15', leadTimeDays: 5 })
    expect(await leadTimeFor(smc)).toEqual({ days: 5, learned: false, samples: 0 })
    const fresh = await createSupplier({ name: 'New dealer', terms: 'cod' })
    expect(await leadTimeFor(fresh)).toEqual({ days: undefined, learned: false, samples: 0 })

    const a = await createPurchase({ date: '2026-09-01', supplierId: smc.id, lines: line })
    await receiveLine({ purchaseId: a.id, lineIndex: 0, qty: 10, date: '2026-09-03' })
    const b = await createPurchase({ date: '2026-09-05', supplierId: smc.id, lines: line })
    await receiveLine({ purchaseId: b.id, lineIndex: 0, qty: 10, date: '2026-09-10' })
    const c = await createPurchase({ date: '2026-09-12', supplierId: smc.id, lines: line })
    await receiveLine({ purchaseId: c.id, lineIndex: 0, qty: 4, date: '2026-09-15' })
    await receiveLine({ purchaseId: c.id, lineIndex: 0, qty: 6, date: '2026-09-20' })
    await createPurchase({ date: '2026-09-18', supplierId: smc.id, lines: line })
    expect(await leadTimeFor(smc)).toEqual({ days: 3, learned: true, samples: 3 })
  })
})
