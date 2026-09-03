import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from './db'
import { createProduct } from './productRepo'
import { create } from './repo'
import { createSale, getSale, listSales, salesForCustomer } from './saleRepo'
import { receiveLot, stockOnHand } from './stockRepo'

const grower = () =>
  createProduct({ name: 'Expert Hog Grower mash', category: 'feed', baseUnit: 'kg', sellUnits: [{ unit: 'sack', factor: 50, price: 1750 }, { unit: 'kg', factor: 1, price: 38 }] })
const unpriced = () => createProduct({ name: 'Urea 46-0-0', category: 'fertilizer', baseUnit: 'bag', sellUnits: [{ unit: 'bag', factor: 1, price: 0 }] })
const suki = () => create(db.customers, { name: 'Aling Nena', type: 'backyard' as const, creditLimit: 5000 })

beforeEach(async () => {
  await Promise.all([db.products.clear(), db.stockLots.clear(), db.stockMoves.clear(), db.sales.clear(), db.transactions.clear(), db.customers.clear()])
})

// Fixture: lot A 100 kg at 35 (received 09-01, expires 10-11), lot B 50 kg at 38 (09-05,
// expires 09-30); average 36. A cash sale of 2 sacks and 3 kg tingi on 09-10 takes 100 kg
// FEFO (B 50, then A 50) and 3 kg from A: three sale moves at 36, on hand 47, total
// 2 x 1750 + 3 x 38 = 3614, cost per sack frozen at 1800 and per kg at 36.
describe('createSale', () => {
  it('posts the lines through consume FEFO, freezes cost and VAT per line and posts the revenue', async () => {
    const p = await grower()
    const a = await receiveLot({ productId: p.id, qty: 100, unitCost: 35, date: '2026-09-01', lotNo: 'A' })
    const b = await receiveLot({ productId: p.id, qty: 50, unitCost: 38, date: '2026-09-05', lotNo: 'B', expiryDate: '2026-09-30' })

    const sale = await createSale({
      date: '2026-09-10',
      lines: [
        { productId: p.id, qty: 2, unit: 'sack' },
        { productId: p.id, qty: 3, unit: 'kg' },
      ],
      paymentMethod: 'cash',
    })
    expect(sale.total).toBe(3614)
    expect(sale.paidAmount).toBe(3614)
    expect(sale.lines[0]).toMatchObject({ productId: p.id, qty: 2, unit: 'sack', unitPrice: 1750, unitCost: 1800, vatExempt: true })
    expect(sale.lines[1]).toMatchObject({ qty: 3, unit: 'kg', unitPrice: 38, unitCost: 36, vatExempt: true })
    expect(sale.customerId).toBeUndefined()
    expect(sale.delivery).toBeUndefined()

    const rank = (m: { lotId?: string; qtyDelta: number }) => (m.lotId === b.lot.id ? 0 : 1) * 1000 + m.qtyDelta
    const moves = (await db.stockMoves.where('[refType+refId]').equals(['sale', sale.id]).toArray()).sort((x, y) => rank(x) - rank(y))
    expect(moves.map((m) => [m.lotId, m.qtyDelta, m.unitCost, m.reason])).toEqual([
      [b.lot.id, -50, 36, 'sale'],
      [a.lot.id, -50, 36, 'sale'],
      [a.lot.id, -3, 36, 'sale'],
    ])
    expect(moves.every((m) => m.date === '2026-09-10')).toBe(true)
    expect(await stockOnHand(p.id)).toBe(47)

    const tx = await db.transactions.toArray()
    expect(tx).toHaveLength(1)
    expect(tx[0]).toMatchObject({ date: '2026-09-10', kind: 'revenue', category: 'sales', amount: 3614, links: { saleId: sale.id } })
    expect(sale.transactionId).toBe(tx[0].id)
    expect(await getSale(sale.id)).toEqual(sale)
  })

  it('takes a typed price over the list price and refuses a zero-price line without one', async () => {
    const u = await unpriced()
    await receiveLot({ productId: u.id, qty: 10, unitCost: 1400, date: '2026-09-01' })
    await expect(createSale({ date: '2026-09-10', lines: [{ productId: u.id, qty: 1, unit: 'bag' }], paymentMethod: 'cash' })).rejects.toThrow(/price/i)
    const sale = await createSale({ date: '2026-09-10', lines: [{ productId: u.id, qty: 2, unit: 'bag', unitPrice: 1550 }], paymentMethod: 'gcash' })
    expect(sale.total).toBe(3100)
    expect(sale.lines[0]).toMatchObject({ unitPrice: 1550, unitCost: 1400, vatExempt: true })
  })

  it('writes nothing when a line cannot be consumed', async () => {
    const p = await grower()
    await receiveLot({ productId: p.id, qty: 60, unitCost: 35, date: '2026-09-01' })
    await expect(
      createSale({ date: '2026-09-10', lines: [{ productId: p.id, qty: 1, unit: 'sack' }, { productId: p.id, qty: 1, unit: 'sack' }], paymentMethod: 'cash' }),
    ).rejects.toThrow(/only 10 kg/i) // the first sack took 50 of the 60
    expect(await db.sales.count()).toBe(0)
    expect(await db.transactions.count()).toBe(0)
    expect(await stockOnHand(p.id)).toBe(60)
    expect((await db.stockMoves.toArray()).filter((m) => m.reason === 'sale')).toHaveLength(0)
  })

  it('validates the date, the lines, the unit and the quantity', async () => {
    const p = await grower()
    await receiveLot({ productId: p.id, qty: 100, unitCost: 35, date: '2026-09-01' })
    await expect(createSale({ date: '2026-13-40', lines: [{ productId: p.id, qty: 1, unit: 'kg' }], paymentMethod: 'cash' })).rejects.toThrow(/date/i)
    await expect(createSale({ date: '2026-09-10', lines: [], paymentMethod: 'cash' })).rejects.toThrow(/line/i)
    await expect(createSale({ date: '2026-09-10', lines: [{ productId: p.id, qty: 1, unit: 'pail' }], paymentMethod: 'cash' })).rejects.toThrow(/not sold by the pail/i)
    await expect(createSale({ date: '2026-09-10', lines: [{ productId: p.id, qty: 0, unit: 'kg' }], paymentMethod: 'cash' })).rejects.toThrow(/quantity/i)
    await expect(createSale({ date: '2026-09-10', lines: [{ productId: 'nope', qty: 1, unit: 'kg' }], paymentMethod: 'cash' })).rejects.toThrow(/product/i)
  })

  it('credit and part payment need a customer; delivery adds its fee and starts pending', async () => {
    const p = await grower()
    await receiveLot({ productId: p.id, qty: 200, unitCost: 35, date: '2026-09-01' })
    await expect(createSale({ date: '2026-09-10', lines: [{ productId: p.id, qty: 1, unit: 'sack' }], paymentMethod: 'credit' })).rejects.toThrow(/customer/i)
    await expect(createSale({ date: '2026-09-10', lines: [{ productId: p.id, qty: 1, unit: 'sack' }], paymentMethod: 'mixed', paidAmount: 1000 })).rejects.toThrow(/customer/i)
    await expect(createSale({ date: '2026-09-10', lines: [{ productId: p.id, qty: 1, unit: 'sack' }], paymentMethod: 'cash', paidAmount: 2000 })).rejects.toThrow(/paid/i)

    const c = await suki()
    const credit = await createSale({ date: '2026-09-10', customerId: c.id, lines: [{ productId: p.id, qty: 1, unit: 'sack' }], paymentMethod: 'credit' })
    expect(credit).toMatchObject({ total: 1750, paidAmount: 0, customerId: c.id })

    const part = await createSale({
      date: '2026-09-11',
      customerId: c.id,
      lines: [{ productId: p.id, qty: 2, unit: 'sack' }],
      paymentMethod: 'mixed',
      paidAmount: 1000,
      delivery: { address: 'Purok 3, San Isidro', fee: 50 },
      notes: 'deliver after lunch',
    })
    expect(part.total).toBe(3550)
    expect(part.paidAmount).toBe(1000)
    expect(part.delivery).toEqual({ address: 'Purok 3, San Isidro', fee: 50, status: 'pending' })
    expect(part.notes).toBe('deliver after lunch')
    expect((await db.transactions.toArray()).map((t) => t.amount).sort()).toEqual([1750, 3550])

    expect((await salesForCustomer(c.id)).map((s) => s.id)).toEqual([part.id, credit.id])
    expect((await listSales({ from: '2026-09-11', to: '2026-09-11' })).map((s) => s.id)).toEqual([part.id])
    expect((await listSales()).map((s) => s.id)).toEqual([part.id, credit.id])
  })
})
