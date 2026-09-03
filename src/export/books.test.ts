import { describe, expect, it } from 'vitest'
import type { BooksRows } from '../db/exportRepo'
import type { StockSnapshot } from '../db/stockRepo'
import { monthRange } from '../engine/dates'
import { cashFlow, incomeStatement, inventoryValuation, taxEstimate } from '../engine/finance'
import type { BaseRow, Customer, Payment, Product, Purchase, Sale, StockLot, StockMove, Store, Supplier, Transaction } from '../types'
import { buildBooks, type BookSheet, type Cell } from './books'

let n = 0
const row = <T extends BaseRow>(data: Omit<T, keyof BaseRow> & Partial<BaseRow>): T => ({ id: `r${++n}`, updatedAt: '2026-09-01T00:00:00.000Z', deletedAt: null, ...data }) as T

const store = row<Store>({ id: 'store', name: 'AgriSari Tanauan', currency: 'PHP', startDate: '2026-09-01', taxMode: 'nonVat' })
const grower = row<Product>({ id: 'p1', name: 'Expert Hog Grower mash', category: 'feed', baseUnit: 'kg', sellUnits: [{ unit: 'sack', factor: 50, price: 1750 }], repackable: true, vatExempt: true, licenceClass: 'baiFeed', coldChain: false, hasExpiry: true, reorderLevel: 0, reorderQty: 0 })
const spray = row<Product>({ id: 'p2', name: 'Cypermethrin 100 ml', category: 'pesticide', baseUnit: 'bottle', sellUnits: [{ unit: 'bottle', factor: 1, price: 560 }], repackable: false, vatExempt: false, licenceClass: 'fpaDealer', coldChain: false, hasExpiry: true, reorderLevel: 0, reorderQty: 0 })
const nena = row<Customer>({ id: 'c1', name: 'Aling Nena', type: 'backyard', contact: '0917 000 0000', creditLimit: 5000 })
const smc = row<Supplier>({ id: 's1', name: 'SMC dealer', terms: 'days15' })
const agro = row<Supplier>({ id: 's2', name: 'Agro Depot', terms: 'cod' })

// September 2026 books. Sales: 09-06 walk-in cash 1,750 (1 sack grower, cost 1,700) and 09-10 Aling
// Nena on credit 1,220 (2 bottles at 560, cost 448 each, plus a 100 delivery fee). An August
// credit sale of 300 stays open too, so her balance at 09-30 is 300 + 1,220 - 500 = 1,020.
// Purchases: 09-01 SMC 10 sacks at 1,700 = 17,000 unpaid due 09-16, 09-01 Agro 10 bottles at 448
// = 4,480 COD; an August SMC purchase of 2,000 still open. SMC paid 10,000 on 09-15: FIFO settles
// August (2,000) then 8,000 of September, leaving 9,000 open.
const sales: Sale[] = [
  row<Sale>({ id: 'sale0', date: '2026-08-20', customerId: 'c1', lines: [{ productId: 'p1', qty: 8, unit: 'kg', unitPrice: 37.5, unitCost: 34 }], total: 300, paymentMethod: 'credit', paidAmount: 0 }),
  row<Sale>({ id: 'sale1', date: '2026-09-06', lines: [{ productId: 'p1', qty: 1, unit: 'sack', unitPrice: 1750, unitCost: 1700, vatExempt: true }], total: 1750, paymentMethod: 'cash', paidAmount: 1750 }),
  row<Sale>({
    id: 'sale2',
    date: '2026-09-10',
    customerId: 'c1',
    lines: [{ productId: 'p2', qty: 2, unit: 'bottle', unitPrice: 560, unitCost: 448, vatExempt: false }],
    total: 1220,
    paymentMethod: 'credit',
    paidAmount: 0,
    delivery: { address: 'Purok 3', fee: 100, status: 'pending' },
    notes: 'listahan',
  }),
]
const purchases: Purchase[] = [
  row<Purchase>({ id: 'po3', date: '2026-08-15', supplierId: 's1', lines: [{ productId: 'p1', qty: 1, unit: 'sack', unitCost: 2000, receivedQty: 1 }], total: 2000, paidAmount: 0, dueDate: '2026-08-30' }),
  row<Purchase>({ id: 'po1', date: '2026-09-01', supplierId: 's1', lines: [{ productId: 'p1', qty: 10, unit: 'sack', unitCost: 1700, lotNo: 'L9', expiryDate: '2026-10-15', receivedQty: 10 }], total: 17000, paidAmount: 0, dueDate: '2026-09-16', notes: 'monthly' }),
  row<Purchase>({ id: 'po2', date: '2026-09-01', supplierId: 's2', lines: [{ productId: 'p2', qty: 10, unit: 'bottle', unitCost: 448, receivedQty: 4 }], total: 4480, paidAmount: 4480 }),
]
const payments: Payment[] = [
  row<Payment>({ id: 'pay1', date: '2026-09-15', kind: 'payable', supplierId: 's1', refId: 'po1', amount: 10000, method: 'bank' }),
  row<Payment>({ id: 'pay2', date: '2026-09-18', kind: 'receivable', customerId: 'c1', amount: 500, method: 'cash', note: 'partial' }),
]
const tx = (date: string, kind: Transaction['kind'], category: string, amount: number, links: Transaction['links'] = {}, note?: string) => row<Transaction>({ date, kind, category, amount, links, ...(note ? { note } : {}) })
const transactions: Transaction[] = [
  tx('2026-08-15', 'expense', 'rent', 5000),
  tx('2026-09-01', 'capital', 'capital', 50000),
  tx('2026-09-01', 'expense', 'stock purchases', 17000, { purchaseId: 'po1' }),
  tx('2026-09-03', 'expense', 'rent', 5000, {}, 'September'),
  tx('2026-09-06', 'revenue', 'sales', 1750, { saleId: 'sale1' }),
  tx('2026-09-08', 'revenue', 'other revenue', 60),
  tx('2026-09-10', 'revenue', 'sales', 1220, { saleId: 'sale2' }),
]
const move = (date: string, productId: string, reason: StockMove['reason'], qtyDelta: number, unitCost: number) => row<StockMove>({ productId, date, qtyDelta, unitCost, reason })
const moves: StockMove[] = [move('2026-09-02', 'p1', 'purchase', 500, 34), move('2026-09-06', 'p1', 'sale', -50, 34), move('2026-09-01', 'p2', 'purchase', 10, 448), move('2026-09-10', 'p2', 'sale', -2, 448), move('2026-09-12', 'p2', 'expired', -1, 448)]
const lot = (productId: string, qtyOnHand: number, unitCost: number) => row<StockLot>({ productId, qtyOnHand, unitCost, receivedDate: '2026-09-01' })
const snapshots: StockSnapshot[] = [
  { product: grower, onHand: 450, lots: [lot('p1', 450, 34)], moves: moves.filter((m) => m.productId === 'p1') },
  { product: spray, onHand: 7, lots: [lot('p2', 7, 448)], moves: moves.filter((m) => m.productId === 'p2') },
]
const rows: BooksRows = { store, sales, purchases, payments, transactions, moves, customers: [nena], suppliers: [smc, agro], products: [grower, spray], snapshots }

const SEPT = monthRange('2026-09')
const AT = '2026-10-01T02:15:00.000Z'
const books = buildBooks(SEPT, AT, rows)
const sheet = (name: string): BookSheet => {
  const s = books.find((b) => b.name === name)
  if (!s) throw new Error(`no sheet ${name}`)
  return s
}
const value = (c: Cell) => (c !== null && typeof c === 'object' ? c.value : c)
const values = (s: BookSheet) => s.rows.map((r) => r.map(value))
const find = (s: BookSheet, label: string) => {
  const r = s.rows.find((r) => r[0] === label)
  if (!r) throw new Error(`no row ${label}`)
  return r.map(value)
}

describe('buildBooks', () => {
  it('returns the ten sheets in order, each with headers and widths', () => {
    expect(books.map((b) => b.name)).toEqual(['Summary', 'Sales', 'Sale lines', 'Purchases', 'Purchase lines', 'Payments', 'Ledger', 'Receivables', 'Payables', 'Stock'])
    for (const b of books) {
      expect(b.columns.length).toBeGreaterThan(1)
      for (const c of b.columns) expect(c.width).toBeGreaterThan(0)
      for (const r of b.rows) expect(r.length).toBe(b.columns.length)
    }
  })

  it('formats money as numbers with two decimals', () => {
    const total = sheet('Sales').rows[0][4]
    expect(total).toEqual({ value: 1750, format: '#,##0.00' })
  })
})

describe('Summary sheet', () => {
  const s = sheet('Summary')
  it('names the store, the range, the export time and the tax mode', () => {
    expect(find(s, 'Store')[1]).toBe('AgriSari Tanauan')
    expect(find(s, 'Period')[1]).toBe('2026-09-01 to 2026-09-30')
    expect(find(s, 'Exported')[1]).toMatch(/^2026-10-01 \d\d:\d\d$|^2026-09-30 \d\d:\d\d$/) // local time
    expect(find(s, 'Tax mode')[1]).toBe('Non-VAT')
  })
  it('carries the income statement of the period, matching the engine', () => {
    const inc = incomeStatement(SEPT, { transactions, moves })
    expect(find(s, 'Sales')[1]).toBe(2970)
    expect(find(s, 'Other revenue')[1]).toBe(60)
    expect(find(s, 'Revenue')[1]).toBe(inc.revenue.total)
    expect(find(s, 'Cost of goods sold')[1]).toBe(-2596)
    expect(find(s, 'Gross profit')[1]).toBe(inc.grossProfit)
    expect(find(s, 'Gross margin %')[1]).toBe(inc.grossMarginPct)
    expect(find(s, 'Write-off: expired')[1]).toBe(-448)
    expect(find(s, 'Expense: rent')[1]).toBe(-5000)
    expect(find(s, 'Operating expenses')[1]).toBe(-5000)
    expect(find(s, 'Net income')[1]).toBe(inc.netIncome)
  })
  it('carries the cash flow of the period, matching the engine', () => {
    const c = cashFlow(SEPT, { sales, purchases, payments, transactions })
    expect(find(s, 'Cash from sales')[1]).toBe(1750)
    expect(find(s, 'Collections from customers')[1]).toBe(500)
    expect(find(s, 'Payments to suppliers')[1]).toBe(-10000)
    expect(find(s, 'Operating total')[1]).toBe(c.operating.total)
    expect(find(s, 'Capital in')[1]).toBe(50000)
    expect(find(s, "Owner's capital total")[1]).toBe(c.capital.total)
    expect(find(s, 'Net cash change')[1]).toBe(c.net)
  })
  it('carries the tax estimate for the store mode, and none when tax is off', () => {
    const t = taxEstimate('nonVat', SEPT, { sales, purchases, products: [grower, spray] })
    if (t.mode !== 'nonVat') throw new Error('mode')
    expect(find(s, 'Exempt sales')[1]).toBe(t.exemptSales)
    expect(find(s, 'Sales subject to percentage tax')[1]).toBe(1220)
    expect(find(s, 'Percentage tax (3 percent)')[1]).toBe(t.percentageTax)
    expect(find(s, '8 percent option on gross sales')[1]).toBe(t.eightPercent)
    const vat = buildBooks(SEPT, AT, { ...rows, store: { ...store, taxMode: 'vat' } })[0]
    expect(find(vat, 'Tax mode')[1]).toBe('VAT')
    expect(find(vat, 'Output VAT')[1]).toBeCloseTo(130.71)
    expect(find(vat, 'VAT payable')[1]).toBeCloseTo(130.71 - 480)
    const off = buildBooks(SEPT, AT, { ...rows, store: { ...store, taxMode: 'off' } })[0]
    expect(off.rows.some((r) => r[0] === 'Exempt sales')).toBe(false)
    const noStore = buildBooks(SEPT, AT, { ...rows, store: undefined })[0]
    expect(find(noStore, 'Store')[1]).toBe('')
  })
})

describe('Sales and Sale lines sheets', () => {
  it('lists the sales of the period with names and labels, walk-in included', () => {
    const s = sheet('Sales')
    expect(s.columns.map((c) => c.header)).toEqual(['Date', 'Reference', 'Customer', 'Payment method', 'Total', 'Paid', 'Balance', 'Delivery fee', 'Delivery status', 'Notes'])
    expect(values(s)).toEqual([
      ['2026-09-06', 'sale1', 'Walk-in', 'Cash', 1750, 1750, 0, null, '', ''],
      ['2026-09-10', 'sale2', 'Aling Nena', 'Credit (listahan)', 1220, 0, 1220, 100, 'pending', 'listahan'],
    ])
  })
  it('lists the lines with product names, line totals, line costs and the VAT status frozen on the line', () => {
    const s = sheet('Sale lines')
    expect(s.columns.map((c) => c.header)).toEqual(['Date', 'Reference', 'Customer', 'Product', 'Qty', 'Unit', 'Unit price', 'Line total', 'Unit cost', 'Line cost', 'VAT'])
    expect(values(s)).toEqual([
      ['2026-09-06', 'sale1', 'Walk-in', 'Expert Hog Grower mash', 1, 'sack', 1750, 1750, 1700, 1700, 'Exempt'],
      ['2026-09-10', 'sale2', 'Aling Nena', 'Cypermethrin 100 ml', 2, 'bottle', 560, 1120, 448, 896, 'VATable'],
    ])
  })
  it('keeps the id when a name is missing', () => {
    const s = buildBooks(SEPT, AT, { ...rows, customers: [], products: [] })
    expect(values(sheet('Sales'))[1][2]).toBe('Aling Nena')
    expect(s[1].rows[1][2]).toBe('c1')
    expect(s[2].rows[0][3]).toBe('p1')
  })
})

describe('Purchases and Purchase lines sheets', () => {
  it('lists the purchases of the period with supplier, balance, due date and receipt status', () => {
    const s = sheet('Purchases')
    expect(s.columns.map((c) => c.header)).toEqual(['Date', 'Reference', 'Supplier', 'Total', 'Paid', 'Balance', 'Due date', 'Status', 'Notes'])
    expect(values(s)).toEqual([
      ['2026-09-01', 'po1', 'SMC dealer', 17000, 0, 17000, '2026-09-16', 'received', 'monthly'],
      ['2026-09-01', 'po2', 'Agro Depot', 4480, 4480, 0, '', 'part received', ''],
    ])
  })
  it('lists the lines with received quantity, lot and expiry', () => {
    const s = sheet('Purchase lines')
    expect(s.columns.map((c) => c.header)).toEqual(['Date', 'Reference', 'Supplier', 'Product', 'Qty', 'Unit', 'Unit cost', 'Line total', 'Received', 'Lot no', 'Expiry'])
    expect(values(s)).toEqual([
      ['2026-09-01', 'po1', 'SMC dealer', 'Expert Hog Grower mash', 10, 'sack', 1700, 17000, 10, 'L9', '2026-10-15'],
      ['2026-09-01', 'po2', 'Agro Depot', 'Cypermethrin 100 ml', 10, 'bottle', 448, 4480, 4, '', ''],
    ])
  })
})

describe('Payments and Ledger sheets', () => {
  it('lists the payments of the period by kind with the counterparty name', () => {
    const s = sheet('Payments')
    expect(s.columns.map((c) => c.header)).toEqual(['Date', 'Reference', 'Kind', 'Customer or supplier', 'Amount', 'Method', 'For', 'Note'])
    expect(values(s)).toEqual([
      ['2026-09-15', 'pay1', 'Payment to supplier', 'SMC dealer', 10000, 'Bank transfer', 'po1', ''],
      ['2026-09-18', 'pay2', 'Collection from customer', 'Aling Nena', 500, 'Cash', '', 'partial'],
    ])
  })
  it('lists the ledger of the period with money in and money out apart', () => {
    const s = sheet('Ledger')
    expect(s.columns.map((c) => c.header)).toEqual(['Date', 'Reference', 'Kind', 'Category', 'Money in', 'Money out', 'Note', 'Linked to'])
    const v = values(s)
    expect(v.map((r) => r[0])).toEqual(['2026-09-01', '2026-09-01', '2026-09-03', '2026-09-06', '2026-09-08', '2026-09-10'])
    expect(v[0].slice(2)).toEqual(['Capital in', 'capital', 50000, null, '', ''])
    expect(v[1].slice(2)).toEqual(['Expense', 'stock purchases', null, 17000, '', 'po1'])
    expect(v[2].slice(2)).toEqual(['Expense', 'rent', null, 5000, 'September', ''])
    expect(v[3].slice(2)).toEqual(['Revenue', 'sales', 1750, null, '', 'sale1'])
  })
})

describe('Receivables and Payables sheets', () => {
  it('settles each customer at the To date from every charge and collection up to it', () => {
    const s = sheet('Receivables')
    expect(s.columns.map((c) => c.header)).toEqual(['Customer', 'Type', 'Contact', 'Charged to date', 'Collected to date', 'Balance', 'Oldest open charge'])
    expect(values(s)).toEqual([
      ['Aling Nena', 'Backyard raiser', '0917 000 0000', 1520, 500, 1020, '2026-09-10'], // the 500 settled August in full and 200 of September
      ['Total', '', '', 1520, 500, 1020, ''],
    ])
  })
  it('leaves out a customer settled in full', () => {
    const paid = buildBooks(SEPT, AT, { ...rows, payments: [...payments, row<Payment>({ date: '2026-09-25', kind: 'receivable', customerId: 'c1', amount: 1020, method: 'gcash' })] })
    expect(values(paid[7])).toEqual([['Total', '', '', 0, 0, 0, '']])
  })
  it('settles each supplier oldest purchase first from the payable payments up to the To date', () => {
    const s = sheet('Payables')
    expect(s.columns.map((c) => c.header)).toEqual(['Supplier', 'Purchase', 'Purchase date', 'Due date', 'Total', 'Paid on order', 'Open'])
    expect(values(s)).toEqual([
      ['SMC dealer', 'po1', '2026-09-01', '2026-09-16', 17000, 0, 9000],
      ['Total', '', '', '', 17000, 0, 9000],
    ])
  })
})

describe('Stock sheet', () => {
  it('values the stock on hand at export time at lot cost and at average cost, matching the engine', () => {
    const s = sheet('Stock')
    const v = inventoryValuation(snapshots)
    expect(s.columns.map((c) => c.header)).toEqual(['Product', 'Category', 'Unit', 'On hand', 'Average cost', 'Value at average', 'Value at lot cost'])
    expect(values(s)).toEqual([
      ['Expert Hog Grower mash', 'Feeds', 'kg', 450, 34, 15300, 15300],
      ['Cypermethrin 100 ml', 'Pesticides', 'bottle', 7, 448, 3136, 3136],
      ['Total', '', '', null, null, v.total.atAverage, v.total.atCost],
    ])
  })
})
