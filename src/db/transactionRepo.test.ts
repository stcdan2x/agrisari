import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from './db'
import { createProduct } from './productRepo'
import { createPurchase, STOCK_PURCHASES } from './purchaseRepo'
import { softDelete } from './repo'
import { createSale } from './saleRepo'
import { receiveLot } from './stockRepo'
import { createSupplier } from './supplierRepo'
import { addTransaction, EXPENSE_CATEGORY_SEED, expenseCategories, listTransactions, setExpenseCategories } from './transactionRepo'

const grower = () =>
  createProduct({ name: 'Expert Hog Grower mash', category: 'feed', baseUnit: 'kg', sellUnits: [{ unit: 'sack', factor: 50, price: 1750 }, { unit: 'kg', factor: 1, price: 38 }] })

beforeEach(async () => {
  await Promise.all([
    db.products.clear(),
    db.stockLots.clear(),
    db.stockMoves.clear(),
    db.sales.clear(),
    db.purchases.clear(),
    db.suppliers.clear(),
    db.transactions.clear(),
    db.settings.clear(),
  ])
})

describe('transactionRepo', () => {
  it('adds hand entries with the category rules per kind and rejects bad input', async () => {
    const rent = await addTransaction({ date: '2026-09-01', kind: 'expense', category: 'rent', amount: 5000, note: 'September' })
    expect(rent).toMatchObject({ date: '2026-09-01', kind: 'expense', category: 'rent', amount: 5000, note: 'September', links: {}, deletedAt: null })
    // Money in and the owner's kinds carry a fixed category; other revenue is free text with a default.
    expect((await addTransaction({ date: '2026-09-01', kind: 'capital', category: 'ignored', amount: 50000 })).category).toBe('capital')
    expect((await addTransaction({ date: '2026-09-05', kind: 'drawing', category: '', amount: 2000 })).category).toBe('drawing')
    expect((await addTransaction({ date: '2026-09-06', kind: 'loan', category: '', amount: 20000 })).category).toBe('loan')
    expect((await addTransaction({ date: '2026-09-07', kind: 'loanPayment', category: '', amount: 2500 })).category).toBe('loan payment')
    expect((await addTransaction({ date: '2026-09-08', kind: 'revenue', category: '  ', amount: 300 })).category).toBe('other revenue')
    expect((await addTransaction({ date: '2026-09-08', kind: 'revenue', category: ' Delivery fees ', amount: 150 })).category).toBe('Delivery fees')

    await expect(addTransaction({ date: '2026-13-01', kind: 'expense', category: 'rent', amount: 1 })).rejects.toThrow(/date/i)
    await expect(addTransaction({ date: '2026-09-01', kind: 'bonus' as never, category: 'rent', amount: 1 })).rejects.toThrow(/kind/i)
    await expect(addTransaction({ date: '2026-09-01', kind: 'expense', category: 'rent', amount: 0 })).rejects.toThrow(/amount/i)
    await expect(addTransaction({ date: '2026-09-01', kind: 'expense', category: 'rent', amount: -5 })).rejects.toThrow(/amount/i)
    await expect(addTransaction({ date: '2026-09-01', kind: 'expense', category: 'gasoline', amount: 1 })).rejects.toThrow(/category/i)
    await expect(addTransaction({ date: '2026-09-01', kind: 'expense', category: '', amount: 1 })).rejects.toThrow(/category/i)
    // Stock is bought through Purchasing so the lot is received; the ledger refuses a bare stock purchase.
    await expect(addTransaction({ date: '2026-09-01', kind: 'expense', category: STOCK_PURCHASES, amount: 1 })).rejects.toThrow(/purchase/i)
    // Sale and purchase rows are posted by their own repositories, never by hand.
    await expect(addTransaction({ date: '2026-09-01', kind: 'revenue', category: 'sales', amount: 1 })).rejects.toThrow(/sale/i)
  })

  // Ledger fixture: a purchase on 08-30 (expense, stock purchases, 17,500), rent on 09-01, a sale on 09-02
  // (revenue, sales, 1,750), a drawing on 09-05, an October expense; a tombstoned row stays out.
  it('lists the ledger newest first with the posted sale and purchase rows, by period and kind', async () => {
    const p = await grower()
    const s = await createSupplier({ name: 'San Miguel dealer', terms: 'cod' })
    const purchase = await createPurchase({ date: '2026-08-30', supplierId: s.id, lines: [{ productId: p.id, qty: 10, unit: 'sack', unitCost: 1750 }] })
    await receiveLot({ productId: p.id, qty: 500, unitCost: 35, date: '2026-08-30', purchaseId: purchase.id })
    const rent = await addTransaction({ date: '2026-09-01', kind: 'expense', category: 'rent', amount: 5000 })
    const sale = await createSale({ date: '2026-09-02', lines: [{ productId: p.id, qty: 1, unit: 'sack' }], paymentMethod: 'cash' })
    const drawing = await addTransaction({ date: '2026-09-05', kind: 'drawing', category: '', amount: 2000 })
    const power = await addTransaction({ date: '2026-10-01', kind: 'expense', category: 'utilities', amount: 3200 })
    const gone = await addTransaction({ date: '2026-09-03', kind: 'expense', category: 'repairs', amount: 800 })
    await softDelete(db.transactions, gone.id)

    const all = await listTransactions({})
    expect(all.map((t) => [t.date, t.kind, t.category, t.amount])).toEqual([
      ['2026-10-01', 'expense', 'utilities', 3200],
      ['2026-09-05', 'drawing', 'drawing', 2000],
      ['2026-09-02', 'revenue', 'sales', 1750],
      ['2026-09-01', 'expense', 'rent', 5000],
      ['2026-08-30', 'expense', STOCK_PURCHASES, 17500],
    ])
    expect(all.find((t) => t.category === 'sales')!.links.saleId).toBe(sale.id)
    expect(all.find((t) => t.category === STOCK_PURCHASES)!.links.purchaseId).toBe(purchase.id)

    const september = await listTransactions({ from: '2026-09-01', to: '2026-09-30' })
    expect(september.map((t) => t.id)).toEqual([drawing.id, sale.transactionId, rent.id])
    expect((await listTransactions({ from: '2026-09-01', to: '2026-09-30', kind: 'expense' })).map((t) => t.id)).toEqual([rent.id])
    expect((await listTransactions({ kind: 'expense' })).map((t) => t.id)).toEqual([power.id, rent.id, purchase.transactionId])
    expect(await listTransactions({ from: '2026-11-01', to: '2026-11-30' })).toEqual([])
  })

  it('seeds the expense categories, edits them in Settings and keeps stock purchases on the list', async () => {
    expect(await expenseCategories()).toEqual(EXPENSE_CATEGORY_SEED)
    expect(EXPENSE_CATEGORY_SEED[0]).toBe(STOCK_PURCHASES)
    expect(EXPENSE_CATEGORY_SEED).toContain('rent')

    const saved = await setExpenseCategories([' stock purchases', 'Rent', 'rent ', 'gasoline', '', 'salaries'])
    expect(saved).toEqual(['stock purchases', 'Rent', 'gasoline', 'salaries'])
    expect(await expenseCategories()).toEqual(saved)
    // The list is the validation list for hand expenses, case-insensitively.
    expect((await addTransaction({ date: '2026-09-01', kind: 'expense', category: 'gasoline', amount: 900 })).category).toBe('gasoline')
    expect((await addTransaction({ date: '2026-09-01', kind: 'expense', category: 'RENT', amount: 5000 })).category).toBe('Rent')
    await expect(addTransaction({ date: '2026-09-01', kind: 'expense', category: 'utilities', amount: 1 })).rejects.toThrow(/category/i)

    await expect(setExpenseCategories(['rent', 'utilities'])).rejects.toThrow(/stock purchases/i)
    await expect(setExpenseCategories(['stock purchases'])).rejects.toThrow(/one expense category/i)
    await expect(setExpenseCategories([' ', ''])).rejects.toThrow(/stock purchases/i)
    expect(await expenseCategories()).toEqual(saved)
  })
})
