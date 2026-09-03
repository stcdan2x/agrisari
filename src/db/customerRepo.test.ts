import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { createCustomer, creditCheck, customerBalance, customerLedger, getCustomer, listCustomers, updateCustomer } from './customerRepo'
import { db } from './db'
import { createProduct } from './productRepo'
import { create } from './repo'
import { createSale } from './saleRepo'
import { receiveLot } from './stockRepo'

const grower = () =>
  createProduct({ name: 'Expert Hog Grower mash', category: 'feed', baseUnit: 'kg', sellUnits: [{ unit: 'sack', factor: 50, price: 1750 }, { unit: 'kg', factor: 1, price: 38 }] })

beforeEach(async () => {
  await Promise.all([db.products.clear(), db.stockLots.clear(), db.stockMoves.clear(), db.sales.clear(), db.transactions.clear(), db.customers.clear(), db.payments.clear()])
})

describe('customerRepo', () => {
  it('creates, validates, updates and lists customers by name', async () => {
    const nena = await createCustomer({ name: ' Aling Nena ', type: 'backyard', creditLimit: 5000, contact: '0917 000 0000' })
    expect(nena).toMatchObject({ name: 'Aling Nena', type: 'backyard', creditLimit: 5000, contact: '0917 000 0000' })
    const coop = await createCustomer({ name: 'Bagong Silang Coop', type: 'reseller' })
    await expect(createCustomer({ name: ' ', type: 'farmer' })).rejects.toThrow(/name/i)
    await expect(createCustomer({ name: 'X', type: 'farmer', creditLimit: -1 })).rejects.toThrow(/credit limit/i)
    const changed = await updateCustomer(nena.id, { creditLimit: 8000 })
    expect(changed.creditLimit).toBe(8000)
    expect((await getCustomer(nena.id))!.creditLimit).toBe(8000)
    expect((await listCustomers()).map((c) => c.id)).toEqual([nena.id, coop.id])
    expect(await getCustomer('nope')).toBeUndefined()
  })

  // Ledger fixture: credit sale of 1 sack (1750) on 09-10, part-paid sale of 2 sacks paid 1000
  // (owes 2500) on 09-11, a payment of 1500 on 09-12; balance 1750 + 2500 - 1500 = 2750.
  it('builds the ledger from credit sales and receivable payments with a running balance', async () => {
    const p = await grower()
    await receiveLot({ productId: p.id, qty: 500, unitCost: 35, date: '2026-09-01' })
    const c = await createCustomer({ name: 'Aling Nena', type: 'backyard', creditLimit: 5000 })
    const s1 = await createSale({ date: '2026-09-10', customerId: c.id, lines: [{ productId: p.id, qty: 1, unit: 'sack' }], paymentMethod: 'credit' })
    const s2 = await createSale({ date: '2026-09-11', customerId: c.id, lines: [{ productId: p.id, qty: 2, unit: 'sack' }], paymentMethod: 'mixed', paidAmount: 1000 })
    await createSale({ date: '2026-09-11', customerId: c.id, lines: [{ productId: p.id, qty: 1, unit: 'kg' }], paymentMethod: 'cash' }) // fully paid: not on the ledger
    const pay = await create(db.payments, { date: '2026-09-12', kind: 'receivable' as const, customerId: c.id, refId: s1.id, amount: 1500, method: 'cash' as const })

    const ledger = await customerLedger(c.id)
    expect(ledger.map((e) => [e.date, e.kind, e.amount, e.balance, e.refId])).toEqual([
      ['2026-09-10', 'charge', 1750, 1750, s1.id],
      ['2026-09-11', 'charge', 2500, 4250, s2.id],
      ['2026-09-12', 'payment', 1500, 2750, pay.id],
    ])
    expect(await customerBalance(c.id)).toBe(2750)
    expect(await customerLedger('nobody')).toEqual([])
  })

  it('creditCheck warns above the limit but createSale still allows the sale', async () => {
    const p = await grower()
    await receiveLot({ productId: p.id, qty: 500, unitCost: 35, date: '2026-09-01' })
    const c = await createCustomer({ name: 'Mang Tonyo', type: 'farmer', creditLimit: 3000 })
    await createSale({ date: '2026-09-10', customerId: c.id, lines: [{ productId: p.id, qty: 1, unit: 'sack' }], paymentMethod: 'credit' })
    expect(await creditCheck(c.id, 1000)).toEqual({ limit: 3000, balance: 1750, after: 2750, over: false })
    expect(await creditCheck(c.id, 1750)).toEqual({ limit: 3000, balance: 1750, after: 3500, over: true })
    const sale = await createSale({ date: '2026-09-11', customerId: c.id, lines: [{ productId: p.id, qty: 1, unit: 'sack' }], paymentMethod: 'credit', notes: 'harvest money next week' })
    expect(sale.paidAmount).toBe(0)
    expect(await customerBalance(c.id)).toBe(3500)

    const open = await createCustomer({ name: 'No limit', type: 'other' })
    expect(await creditCheck(open.id, 99999)).toEqual({ limit: undefined, balance: 0, after: 99999, over: false })
  })
})
