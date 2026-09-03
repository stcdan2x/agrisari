import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { createCustomer } from './customerRepo'
import { db } from './db'
import { saveParameters } from './parameterRepo'
import { buyingInputs, sellingInputs } from './planRepo'
import { createProduct } from './productRepo'
import { createPurchase, receiveLine } from './purchaseRepo'
import { createSale } from './saleRepo'
import { createSupplier } from './supplierRepo'

beforeEach(async () => {
  await Promise.all([
    db.products.clear(),
    db.suppliers.clear(),
    db.customers.clear(),
    db.purchases.clear(),
    db.sales.clear(),
    db.payments.clear(),
    db.stockLots.clear(),
    db.stockMoves.clear(),
    db.priceLog.clear(),
    db.transactions.clear(),
    db.settings.clear(),
  ])
})

// The Plan page's input assembly: the rows the engine rules read, gathered from the
// repositories the earlier phases wrote.
describe('planRepo', () => {
  it('assembles the buying input: snapshots, suppliers, the supply row per product with the learned lead time, the price log and the parameters', async () => {
    const smc = await createSupplier({ name: 'SMC dealer', terms: 'days15', leadTimeDays: 7 })
    const grower = await createProduct({
      name: 'Expert Hog Grower mash',
      category: 'feed',
      baseUnit: 'kg',
      sellUnits: [{ unit: 'sack', factor: 50, price: 1750 }],
    })
    const urea = await createProduct({ name: 'Urea', category: 'fertilizer', baseUnit: 'bag', sellUnits: [{ unit: 'bag', factor: 1, price: 1550 }] })
    const po = await createPurchase({ date: '2026-09-01', supplierId: smc.id, lines: [{ productId: grower.id, qty: 10, unit: 'sack', unitCost: 1700 }] })
    await receiveLine({ purchaseId: po.id, lineIndex: 0, qty: 10, date: '2026-09-03' })
    await saveParameters({ carryingCostPctPerYear: 20 })

    const input = await buyingInputs('2026-09-30')
    expect(input.today).toBe('2026-09-30')
    expect(input.snapshots.map((s) => [s.product.id, s.onHand])).toEqual([
      [grower.id, 500],
      [urea.id, 0],
    ])
    expect(input.suppliers.map((s) => s.id)).toEqual([smc.id])
    // The grower's supplier is the one of its latest purchase, its lead time learned from the receipt (2 days); urea has no purchase yet
    expect(input.supply).toEqual([{ productId: grower.id, supplierId: smc.id, leadTimeDays: 2, leadTimeLearned: true }])
    expect(input.priceLog.map((q) => [q.productId, q.kind, q.value, q.unit])).toEqual([[grower.id, 'supplierPrice', 34, 'kg']]) // the receipt logs the price per base unit
    expect(input.parameters.values.carryingCostPctPerYear).toBe(20)
    expect(input.parameters.overridden).toEqual(['carryingCostPctPerYear'])
  })

  it('assembles the selling input on top: the sales of the window, the customers and the receivables aging', async () => {
    const grower = await createProduct({
      name: 'Expert Hog Grower mash',
      category: 'feed',
      baseUnit: 'kg',
      sellUnits: [{ unit: 'sack', factor: 50, price: 1750 }],
    })
    const smc = await createSupplier({ name: 'SMC dealer', terms: 'cod' })
    const po = await createPurchase({ date: '2026-06-01', supplierId: smc.id, lines: [{ productId: grower.id, qty: 10, unit: 'sack', unitCost: 1700 }] })
    await receiveLine({ purchaseId: po.id, lineIndex: 0, qty: 10, date: '2026-06-01' })
    const nena = await createCustomer({ name: 'Aling Nena', type: 'backyard', creditLimit: 5000 })
    await createSale({ date: '2026-06-15', lines: [{ productId: grower.id, qty: 1, unit: 'sack' }], paymentMethod: 'cash' }) // before the 90-day window
    const credit = await createSale({
      date: '2026-08-20',
      customerId: nena.id,
      lines: [{ productId: grower.id, qty: 1, unit: 'sack' }],
      paymentMethod: 'credit',
    })
    const cash = await createSale({ date: '2026-09-28', lines: [{ productId: grower.id, qty: 1, unit: 'sack' }], paymentMethod: 'cash' })

    const input = await sellingInputs('2026-09-30')
    expect(input.sales.map((s) => s.id).sort()).toEqual([cash.id, credit.id].sort())
    expect(input.customers.map((c) => c.id)).toEqual([nena.id])
    expect(input.aging).toEqual([expect.objectContaining({ customerId: nena.id, total: 1750, current: 0, d31: 1750, d61: 0, d90: 0 })])
    expect(input.snapshots[0].onHand).toBe(350)
  })
})
