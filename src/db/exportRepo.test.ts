import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { createCustomer } from './customerRepo'
import { db } from './db'
import { booksRows } from './exportRepo'
import { recordReceivable } from './paymentRepo'
import { createProduct } from './productRepo'
import { createPurchase, receiveLine } from './purchaseRepo'
import { softDelete } from './repo'
import { createSale } from './saleRepo'
import { saveStore } from './storeRepo'
import { createSupplier } from './supplierRepo'
import { addTransaction } from './transactionRepo'

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()))
})

describe('booksRows', () => {
  it('reads every live dated row up to the To date, with the names, the stock and the store beside them', async () => {
    await saveStore({ name: 'AgriSari Tanauan', startDate: '2026-09-01', taxMode: 'nonVat' })
    const grower = await createProduct({ name: 'Expert Hog Grower mash', category: 'feed', baseUnit: 'kg', sellUnits: [{ unit: 'sack', factor: 50, price: 1750 }] })
    const smc = await createSupplier({ name: 'SMC dealer', terms: 'days15' })
    const nena = await createCustomer({ name: 'Aling Nena', type: 'backyard' })
    const po = await createPurchase({ date: '2026-09-01', supplierId: smc.id, lines: [{ productId: grower.id, qty: 10, unit: 'sack', unitCost: 1700 }] })
    await receiveLine({ purchaseId: po.id, lineIndex: 0, qty: 10, date: '2026-09-02' })
    await createPurchase({ date: '2026-10-05', supplierId: smc.id, lines: [{ productId: grower.id, qty: 1, unit: 'sack', unitCost: 1700 }] })
    await createSale({ date: '2026-09-06', customerId: nena.id, lines: [{ productId: grower.id, qty: 1, unit: 'sack' }], paymentMethod: 'credit' })
    await createSale({ date: '2026-10-02', lines: [{ productId: grower.id, qty: 1, unit: 'sack' }], paymentMethod: 'cash' })
    await recordReceivable({ customerId: nena.id, date: '2026-09-18', amount: 500, method: 'cash' })
    await recordReceivable({ customerId: nena.id, date: '2026-10-03', amount: 500, method: 'cash' })
    const rent = await addTransaction({ date: '2026-09-03', kind: 'expense', category: 'rent', amount: 5000 })
    const gone = await addTransaction({ date: '2026-09-04', kind: 'expense', category: 'utilities', amount: 1200 })
    await softDelete(db.transactions, gone.id)
    await addTransaction({ date: '2026-10-01', kind: 'expense', category: 'rent', amount: 5000 })

    const rows = await booksRows('2026-09-30')
    expect(rows.store?.name).toBe('AgriSari Tanauan')
    expect(rows.sales.map((s) => s.date)).toEqual(['2026-09-06'])
    expect(rows.purchases.map((p) => p.date)).toEqual(['2026-09-01'])
    expect(rows.payments.map((p) => p.date)).toEqual(['2026-09-18'])
    expect(rows.moves.map((m) => m.date).sort()).toEqual(['2026-09-02', '2026-09-06'])
    // The purchase and the sale post their own transactions; the deleted utilities row and October stay out.
    expect(rows.transactions.map((t) => t.date).sort()).toEqual(['2026-09-01', '2026-09-03', '2026-09-06'])
    expect(rows.transactions.some((t) => t.id === rent.id)).toBe(true)
    expect(rows.customers.map((c) => c.name)).toEqual(['Aling Nena'])
    expect(rows.suppliers.map((s) => s.name)).toEqual(['SMC dealer'])
    expect(rows.products.map((p) => p.name)).toEqual(['Expert Hog Grower mash'])
    expect(rows.snapshots.map((s) => [s.product.name, s.onHand])).toEqual([['Expert Hog Grower mash', 400]])
  })
})
