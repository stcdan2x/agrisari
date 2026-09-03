import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { createCustomer, customerHistory } from './customerRepo'
import { db } from './db'
import { createProduct } from './productRepo'
import { createSale, listDeliveries, markDelivered } from './saleRepo'
import { receiveLot } from './stockRepo'

const grower = () =>
  createProduct({ name: 'Expert Hog Grower mash', category: 'feed', baseUnit: 'kg', sellUnits: [{ unit: 'sack', factor: 50, price: 1750 }, { unit: 'kg', factor: 1, price: 38 }] })
const urea = () => createProduct({ name: 'Urea 46-0-0', category: 'fertilizer', baseUnit: 'bag', sellUnits: [{ unit: 'bag', factor: 1, price: 1550 }] })

beforeEach(async () => {
  await Promise.all([db.products.clear(), db.stockLots.clear(), db.stockMoves.clear(), db.sales.clear(), db.transactions.clear(), db.customers.clear(), db.payments.clear()])
})

describe('deliveries', () => {
  it('lists pending then delivered, and markDelivered stamps the sale once', async () => {
    const p = await grower()
    await receiveLot({ productId: p.id, qty: 500, unitCost: 35, date: '2026-09-01' })
    const c = await createCustomer({ name: 'Aling Nena', type: 'backyard' })
    const d1 = await createSale({ date: '2026-09-10', customerId: c.id, lines: [{ productId: p.id, qty: 1, unit: 'sack' }], paymentMethod: 'cash', delivery: { address: 'Purok 3', fee: 50 } })
    const d2 = await createSale({ date: '2026-09-11', lines: [{ productId: p.id, qty: 1, unit: 'sack' }], paymentMethod: 'cash', delivery: { address: 'Sitio Ilaya', fee: 80 } })
    await createSale({ date: '2026-09-11', lines: [{ productId: p.id, qty: 1, unit: 'kg' }], paymentMethod: 'cash' }) // no delivery

    expect((await listDeliveries()).map((s) => s.id)).toEqual([d1.id, d2.id]) // pending, oldest first
    const done = await markDelivered(d2.id)
    expect(done.delivery).toEqual({ address: 'Sitio Ilaya', fee: 80, status: 'delivered' })
    expect(done.updatedAt > d2.updatedAt).toBe(true)
    expect((await listDeliveries()).map((s) => s.id)).toEqual([d1.id])
    expect((await listDeliveries('delivered')).map((s) => s.id)).toEqual([d2.id])
    await expect(markDelivered(d2.id)).rejects.toThrow(/already delivered/i)
    await expect(markDelivered('nope')).rejects.toThrow(/sale/i)
    const plain = (await db.sales.filter((s) => !s.delivery).toArray())[0]
    await expect(markDelivered(plain.id)).rejects.toThrow(/no delivery/i)
  })
})

describe('customerHistory', () => {
  it('summarises sales count, spend, last visit and the top products by quantity', async () => {
    const g = await grower()
    const u = await urea()
    await receiveLot({ productId: g.id, qty: 500, unitCost: 35, date: '2026-09-01' })
    await receiveLot({ productId: u.id, qty: 50, unitCost: 1400, date: '2026-09-01' })
    const c = await createCustomer({ name: 'Mang Tonyo', type: 'farmer' })
    await createSale({ date: '2026-09-05', customerId: c.id, lines: [{ productId: g.id, qty: 2, unit: 'sack' }], paymentMethod: 'cash' })
    await createSale({ date: '2026-09-12', customerId: c.id, lines: [{ productId: u.id, qty: 3, unit: 'bag' }, { productId: g.id, qty: 5, unit: 'kg' }], paymentMethod: 'cash' })
    const h = await customerHistory(c.id)
    expect(h).toMatchObject({ sales: 2, spend: 3500 + 4650 + 190, lastVisit: '2026-09-12', firstVisit: '2026-09-05' })
    expect(h.topProducts).toEqual([
      { productId: g.id, name: 'Expert Hog Grower mash', qty: 105, unit: 'kg', spend: 3690, times: 2 },
      { productId: u.id, name: 'Urea 46-0-0', qty: 3, unit: 'bag', spend: 4650, times: 1 },
    ])
    expect(await customerHistory('nobody')).toEqual({ sales: 0, spend: 0, topProducts: [] })
  })
})
