import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { createCustomer, customerBalance } from './customerRepo'
import { db } from './db'
import { customerAging, paymentsForCustomer, receivablesAging, recordReceivable } from './paymentRepo'
import { createProduct } from './productRepo'
import { createSale } from './saleRepo'
import { receiveLot } from './stockRepo'

const grower = () =>
  createProduct({ name: 'Expert Hog Grower mash', category: 'feed', baseUnit: 'kg', sellUnits: [{ unit: 'sack', factor: 50, price: 1750 }, { unit: 'kg', factor: 1, price: 38 }] })

beforeEach(async () => {
  await Promise.all([db.products.clear(), db.stockLots.clear(), db.stockMoves.clear(), db.sales.clear(), db.transactions.clear(), db.customers.clear(), db.payments.clear()])
})

async function seeded() {
  const p = await grower()
  await receiveLot({ productId: p.id, qty: 1000, unitCost: 35, date: '2026-05-01' })
  const nena = await createCustomer({ name: 'Aling Nena', type: 'backyard', creditLimit: 10000 })
  const tonyo = await createCustomer({ name: 'Mang Tonyo', type: 'farmer' })
  const sack = (customerId: string, date: string, qty: number, paidAmount?: number) =>
    createSale({ date, customerId, lines: [{ productId: p.id, qty, unit: 'sack' }], paymentMethod: paidAmount === undefined ? 'credit' : 'mixed', paidAmount })
  return { p, nena, tonyo, sack }
}

describe('recordReceivable', () => {
  it('records a payment against the customer, optionally against one sale, and validates', async () => {
    const { nena, tonyo, sack } = await seeded()
    const s1 = await sack(nena.id, '2026-06-01', 1)
    const pay = await recordReceivable({ customerId: nena.id, date: '2026-06-10', amount: 1000, method: 'gcash', refId: s1.id, note: 'partial' })
    expect(pay).toMatchObject({ kind: 'receivable', customerId: nena.id, refId: s1.id, amount: 1000, method: 'gcash', date: '2026-06-10', note: 'partial' })
    expect(await customerBalance(nena.id)).toBe(750)
    expect((await paymentsForCustomer(nena.id)).map((x) => x.id)).toEqual([pay.id])

    await expect(recordReceivable({ customerId: nena.id, date: '2026-06-10', amount: 0, method: 'cash' })).rejects.toThrow(/amount/i)
    await expect(recordReceivable({ customerId: nena.id, date: '2026-06-40', amount: 10, method: 'cash' })).rejects.toThrow(/date/i)
    await expect(recordReceivable({ customerId: 'nope', date: '2026-06-10', amount: 10, method: 'cash' })).rejects.toThrow(/customer/i)
    await expect(recordReceivable({ customerId: tonyo.id, date: '2026-06-10', amount: 10, method: 'cash', refId: s1.id })).rejects.toThrow(/sale/i)
    expect(await db.transactions.count()).toBe(1) // the sale's revenue only: collecting a receivable is not new revenue
  })
})

// Aging fixture on 2026-09-02, payments settle the oldest charges first:
// Nena: charges 1750 (05-10, 115 days), 3500 (07-20, 44 days), 1750 (08-25, 8 days); paid 2000
// on 08-01 -> the 05-10 charge is cleared, 250 of the 07-20 charge is paid: 3250 in 31-60,
// 1750 current; total 5000.
// Tonyo: charge 1750 (06-01, 93 days) -> 1750 in 90+; total 1750.
// A third customer with everything paid is not listed.
describe('receivablesAging', () => {
  it('buckets the open charges by age after settling the oldest first', async () => {
    const { nena, tonyo, sack } = await seeded()
    await sack(nena.id, '2026-05-10', 1)
    await sack(nena.id, '2026-07-20', 2)
    await sack(nena.id, '2026-08-25', 1)
    await recordReceivable({ customerId: nena.id, date: '2026-08-01', amount: 2000, method: 'cash' })
    await sack(tonyo.id, '2026-06-01', 1)
    const paid = await createCustomer({ name: 'Paid Up', type: 'pet' })
    await sack(paid.id, '2026-08-01', 1)
    await recordReceivable({ customerId: paid.id, date: '2026-08-15', amount: 1750, method: 'cash' })

    const aging = await receivablesAging('2026-09-02')
    expect(aging.map((a) => [a.customerId, a.name, a.total, a.current, a.d31, a.d61, a.d90, a.oldest])).toEqual([
      [nena.id, 'Aling Nena', 5000, 1750, 3250, 0, 0, '2026-07-20'],
      [tonyo.id, 'Mang Tonyo', 1750, 0, 0, 0, 1750, '2026-06-01'],
    ])
    expect(await customerAging(nena.id, '2026-09-02')).toMatchObject({ total: 5000, current: 1750, d31: 3250, d61: 0, d90: 0, oldest: '2026-07-20' })
    const settled = await customerAging(paid.id, '2026-09-02')
    expect(settled).toEqual({ total: 0, current: 0, d31: 0, d61: 0, d90: 0 })
    expect(settled.oldest).toBeUndefined()
  })
})
