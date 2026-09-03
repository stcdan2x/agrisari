import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { createCustomer, creditCheck, customerBalance, customerHistory, customerLedger } from './customerRepo'
import { db } from './db'
import { receivablesAging, recordReceivable } from './paymentRepo'
import { createProduct } from './productRepo'
import { createSale, listDeliveries, listSales, markDelivered } from './saleRepo'
import { averageCost, lotsOnHand, receiveLot, stockOnHand } from './stockRepo'

// P4 verify fixture (TASK 001 step 4.6): one counter day, 2026-09-15, hand-computed.
//
// Stock: grower lot A 200 kg at 35 (09-01, expires 10-11), lot B 100 kg at 38 (09-05,
// expires 09-30): average 36, FEFO takes B first. Urea 20 bags at 1400.
// Prices: grower 1950 per sack, 38 per kg; urea 1550 per bag.
//
// 1 cash walk-in: 1 sack + 5 kg          = 2140; B -50, B -5 at 36
// 2 GCash, Tonyo: 2 bags urea            = 3100; urea -2 at 1400
// 3 credit, Nena: 2 sacks                = 3900, paid 0; B -45, A -55 at 36
// 4 part paid, Tonyo, delivery fee 50: 1 sack = 2000, paid 1000; A -50 at 36
// then Nena pays 1500; sale 4 is delivered.
//
// Grower on hand 300 - 205 = 95 (all on A), average still 36; urea 18.
// Six sale moves; COGS 205 x 36 + 2 x 1400 = 10180. Revenue 2140 + 3100 + 3900 + 2000 = 11140.
// Receivables: Nena 3900 - 1500 = 2400, Tonyo 1000, both current.
describe('a seeded counter day', () => {
  beforeEach(async () => {
    await Promise.all([db.products.clear(), db.stockLots.clear(), db.stockMoves.clear(), db.sales.clear(), db.transactions.clear(), db.customers.clear(), db.payments.clear()])
  })

  it('posts the stock moves, transactions, receivables and delivery states of the hand-computed day', async () => {
    const grower = await createProduct({ name: 'Expert Hog Grower mash', category: 'feed', baseUnit: 'kg', sellUnits: [{ unit: 'sack', factor: 50, price: 1950 }, { unit: 'kg', factor: 1, price: 38 }] })
    const urea = await createProduct({ name: 'Urea 46-0-0', category: 'fertilizer', baseUnit: 'bag', sellUnits: [{ unit: 'bag', factor: 1, price: 1550 }] })
    const a = await receiveLot({ productId: grower.id, qty: 200, unitCost: 35, date: '2026-09-01', lotNo: 'A' })
    const b = await receiveLot({ productId: grower.id, qty: 100, unitCost: 38, date: '2026-09-05', lotNo: 'B', expiryDate: '2026-09-30' })
    await receiveLot({ productId: urea.id, qty: 20, unitCost: 1400, date: '2026-09-01' })
    expect(await averageCost(grower.id)).toBe(36)
    const nena = await createCustomer({ name: 'Aling Nena', type: 'backyard', creditLimit: 5000 })
    const tonyo = await createCustomer({ name: 'Mang Tonyo', type: 'farmer' })
    const day = '2026-09-15'

    const s1 = await createSale({ date: day, lines: [{ productId: grower.id, qty: 1, unit: 'sack' }, { productId: grower.id, qty: 5, unit: 'kg' }], paymentMethod: 'cash' })
    const s2 = await createSale({ date: day, customerId: tonyo.id, lines: [{ productId: urea.id, qty: 2, unit: 'bag' }], paymentMethod: 'gcash' })
    expect(await creditCheck(nena.id, 3900)).toEqual({ limit: 5000, balance: 0, after: 3900, over: false })
    const s3 = await createSale({ date: day, customerId: nena.id, lines: [{ productId: grower.id, qty: 2, unit: 'sack' }], paymentMethod: 'credit' })
    const s4 = await createSale({ date: day, customerId: tonyo.id, lines: [{ productId: grower.id, qty: 1, unit: 'sack' }], paymentMethod: 'mixed', paidAmount: 1000, delivery: { address: 'Sitio Ilaya', fee: 50 } })
    await recordReceivable({ customerId: nena.id, date: day, amount: 1500, method: 'cash' })

    // sales
    expect([s1, s2, s3, s4].map((s) => [s.total, s.paidAmount])).toEqual([[2140, 2140], [3100, 3100], [3900, 0], [2000, 1000]])
    expect(s1.lines.map((l) => l.unitCost)).toEqual([1800, 36])
    expect(s2.lines[0].unitCost).toBe(1400)
    expect((await listSales({ from: day, to: day })).length).toBe(4)

    // stock
    expect(await stockOnHand(grower.id)).toBe(95)
    expect(await averageCost(grower.id)).toBe(36)
    expect((await lotsOnHand(grower.id)).map((l) => [l.lotNo, l.qtyOnHand])).toEqual([['A', 95]])
    expect((await db.stockLots.get(b.lot.id))!.qtyOnHand).toBe(0)
    expect(await stockOnHand(urea.id)).toBe(18)
    const saleMoves = (await db.stockMoves.toArray()).filter((m) => m.reason === 'sale')
    expect(saleMoves).toHaveLength(6)
    const byLot = (lotId: string) => saleMoves.filter((m) => m.lotId === lotId).map((m) => m.qtyDelta).sort((x, y) => x - y)
    expect(byLot(b.lot.id)).toEqual([-50, -45, -5])
    expect(byLot(a.lot.id)).toEqual([-55, -50])
    const cogs = saleMoves.reduce((s, m) => s - m.qtyDelta * m.unitCost, 0)
    expect(cogs).toBe(10180)
    expect(saleMoves.every((m) => m.refType === 'sale' && [s1, s2, s3, s4].some((s) => s.id === m.refId))).toBe(true)

    // transactions
    const tx = await db.transactions.toArray()
    expect(tx.map((t) => t.kind)).toEqual(['revenue', 'revenue', 'revenue', 'revenue'])
    expect(tx.reduce((s, t) => s + t.amount, 0)).toBe(11140)
    expect(tx.map((t) => t.links.saleId).sort()).toEqual([s1.id, s2.id, s3.id, s4.id].sort())

    // receivables
    expect(await customerBalance(nena.id)).toBe(2400)
    expect(await customerBalance(tonyo.id)).toBe(1000)
    expect((await customerLedger(nena.id)).map((e) => [e.kind, e.amount, e.balance])).toEqual([['charge', 3900, 3900], ['payment', 1500, 2400]])
    expect((await receivablesAging(day)).map((r) => [r.name, r.total, r.current, r.d31 + r.d61 + r.d90])).toEqual([['Aling Nena', 2400, 2400, 0], ['Mang Tonyo', 1000, 1000, 0]])
    expect(await customerHistory(nena.id)).toMatchObject({ sales: 1, spend: 3900, lastVisit: day, topProducts: [{ productId: grower.id, qty: 100, unit: 'kg', spend: 3900, times: 1 }] })
    expect((await customerHistory(tonyo.id)).topProducts.map((t) => [t.name, t.qty])).toEqual([['Expert Hog Grower mash', 50], ['Urea 46-0-0', 2]])

    // deliveries
    expect((await listDeliveries()).map((s) => s.id)).toEqual([s4.id])
    await markDelivered(s4.id)
    expect(await listDeliveries()).toEqual([])
    expect((await listDeliveries('delivered')).map((s) => s.delivery)).toEqual([{ address: 'Sitio Ilaya', fee: 50, status: 'delivered' }])
  })
})
