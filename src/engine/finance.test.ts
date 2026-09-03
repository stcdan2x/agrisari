import { describe, expect, it } from 'vitest'
import type { BaseRow, Payment, Product, Purchase, Sale, StockLot, StockMove, Transaction } from '../types'
import { monthOf, monthRange } from './dates'
import { breakEven, cashFlow, incomeStatement, inventoryValuation, marginReport, returns, TAX_RATES, taxEstimate } from './finance'

let n = 0
const row = <T extends BaseRow>(data: Omit<T, keyof BaseRow> & Partial<BaseRow>): T =>
  ({ id: `r${++n}`, updatedAt: '2026-09-01T00:00:00.000Z', deletedAt: null, ...data }) as T

const tx = (date: string, kind: Transaction['kind'], category: string, amount: number, links: Transaction['links'] = {}, deletedAt: string | null = null) =>
  row<Transaction>({ date, kind, category, amount, links, deletedAt })
const move = (date: string, reason: StockMove['reason'], qtyDelta: number, unitCost: number) => row<StockMove>({ productId: 'p1', date, qtyDelta, unitCost, reason })

const SEPT = monthRange('2026-09')

// September fixture. Revenue: sale 1,750 (09-02) + sale 2,280 (09-10) + other 150 = 4,180.
// COGS from the sale moves: 50 x 34.4 + 60 x 34.4 = 3,784; gross profit 396.
// Write-offs: expired 10 x 34.4 = 344, loss 5 x 34.4 = 172. Operating expenses: rent 5,000 +
// utilities 3,200 = 8,200 (stock purchases 17,500 excluded). Net income 396 - 516 - 8,200 = -8,320.
const transactions: Transaction[] = [
  tx('2026-09-02', 'revenue', 'sales', 1750, { saleId: 's1' }),
  tx('2026-09-10', 'revenue', 'sales', 2280, { saleId: 's2' }),
  tx('2026-09-08', 'revenue', 'Delivery fees', 150),
  tx('2026-09-01', 'expense', 'rent', 5000),
  tx('2026-09-15', 'expense', 'utilities', 3200),
  tx('2026-09-01', 'expense', 'stock purchases', 17500, { purchaseId: 'b1' }),
  tx('2026-09-05', 'drawing', 'drawing', 2000),
  tx('2026-09-01', 'capital', 'capital', 50000),
  tx('2026-09-06', 'loan', 'loan', 20000),
  tx('2026-09-07', 'loanPayment', 'loan payment', 2500),
  tx('2026-08-01', 'expense', 'rent', 5000), // August: out of the period
  tx('2026-09-20', 'expense', 'repairs', 800, {}, '2026-09-21T00:00:00.000Z'), // tombstoned
]
const moves: StockMove[] = [
  move('2026-09-01', 'purchase', 500, 34.4),
  move('2026-09-02', 'sale', -50, 34.4),
  move('2026-09-10', 'sale', -60, 34.4),
  move('2026-09-12', 'expired', -10, 34.4),
  move('2026-09-13', 'loss', -5, 34.4),
  move('2026-09-14', 'adjustment', -2, 34.4), // not a write-off line
  move('2026-08-20', 'sale', -20, 35), // August
]

describe('dates', () => {
  it('gives the month of a date and its first and last day', () => {
    expect(monthOf('2026-09-17')).toBe('2026-09')
    expect(SEPT).toEqual({ from: '2026-09-01', to: '2026-09-30' })
    expect(monthRange('2028-02')).toEqual({ from: '2028-02-01', to: '2028-02-29' })
  })
})

describe('incomeStatement', () => {
  it('reports accrual revenue, COGS from the sale moves, write-offs and operating expenses by category', () => {
    const s = incomeStatement(SEPT, { transactions, moves })
    expect(s.revenue).toEqual({ sales: 4030, other: 150, total: 4180 })
    expect(s.cogs).toBe(3784)
    expect(s.grossProfit).toBe(396)
    expect(s.grossMarginPct).toBeCloseTo(9.47, 2)
    expect(s.writeOffs).toEqual({ expired: 344, loss: 172, total: 516 })
    expect(s.expenses.rows).toEqual([
      { category: 'rent', amount: 5000 },
      { category: 'utilities', amount: 3200 },
    ])
    expect(s.expenses.total).toBe(8200)
    expect(s.netIncome).toBe(-8320)
  })

  it('is all zeros for an empty period', () => {
    const s = incomeStatement(monthRange('2026-11'), { transactions, moves })
    expect(s.revenue.total).toBe(0)
    expect(s.grossMarginPct).toBe(0)
    expect(s.expenses.rows).toEqual([])
    expect(s.netIncome).toBe(0)
  })
})

describe('cashFlow', () => {
  // Cash: sale s1 paid 1,750 at the counter, s2 part-paid 1,000, a collection of 500 on 09-20,
  // other revenue 150; the purchase paid 10,000 of 17,500 on order and 5,000 more on 09-18;
  // expenses 8,200 paid as recorded. Operating -19,800; capital 50,000 - 2,000 = 48,000;
  // financing 20,000 - 2,500 = 17,500; net 45,700.
  it('splits cash into operating, capital and financing from paid amounts, payments and the other kinds', () => {
    const sales: Sale[] = [
      row<Sale>({ date: '2026-09-02', lines: [], total: 1750, paymentMethod: 'cash', paidAmount: 1750 }),
      row<Sale>({ date: '2026-09-10', lines: [], total: 2280, paymentMethod: 'mixed', paidAmount: 1000 }),
      row<Sale>({ date: '2026-08-28', lines: [], total: 900, paymentMethod: 'cash', paidAmount: 900 }),
    ]
    const purchases: Purchase[] = [
      row<Purchase>({ date: '2026-09-01', supplierId: 'v1', lines: [], total: 17500, paidAmount: 10000 }),
      row<Purchase>({ date: '2026-10-01', supplierId: 'v1', lines: [], total: 3000, paidAmount: 3000 }),
    ]
    const payments: Payment[] = [
      row<Payment>({ date: '2026-09-20', kind: 'receivable', customerId: 'c1', amount: 500, method: 'cash' }),
      row<Payment>({ date: '2026-09-18', kind: 'payable', supplierId: 'v1', amount: 5000, method: 'gcash' }),
      row<Payment>({ date: '2026-10-02', kind: 'payable', supplierId: 'v1', amount: 2500, method: 'cash' }),
    ]
    const c = cashFlow(SEPT, { sales, purchases, payments, transactions })
    expect(c.operating.rows).toEqual([
      { label: 'Cash from sales', amount: 2750 },
      { label: 'Collections from customers', amount: 500 },
      { label: 'Other revenue', amount: 150 },
      { label: 'Paid to suppliers on orders', amount: -10000 },
      { label: 'Payments to suppliers', amount: -5000 },
      { label: 'Expenses paid', amount: -8200 },
    ])
    expect(c.operating.total).toBe(-19800)
    expect(c.capital.rows).toEqual([
      { label: 'Capital in', amount: 50000 },
      { label: 'Drawings', amount: -2000 },
    ])
    expect(c.capital.total).toBe(48000)
    expect(c.financing.rows).toEqual([
      { label: 'Loans received', amount: 20000 },
      { label: 'Loan payments', amount: -2500 },
    ])
    expect(c.financing.total).toBe(17500)
    expect(c.net).toBe(45700)
  })
})

const product = (id: string, name: string, category: Product['category'], baseUnit: string) =>
  row<Product>({ id, name, category, baseUnit, sellUnits: [], reorderLevel: 0, reorderQty: 0, vatExempt: true } as unknown as Product)

describe('marginReport', () => {
  // September sale lines: grower 1 sack 1,750 at cost 1,720 and 60 kg at 38 costing 34.4 each
  // (2,280 less 2,064); urea 2 bags at 1,500 costing 1,400. Grower margin 30 + 216 = 246 on 4,030;
  // urea 200 on 3,000; feed 246, fertilizer 200; total 446 on 7,030.
  it('gives the margin per product and per category from the frozen sale lines', () => {
    const products = [product('g', 'Hog grower', 'feed', 'kg'), product('u', 'Urea 46-0-0', 'fertilizer', 'bag')]
    const sales: Sale[] = [
      row<Sale>({ date: '2026-09-02', lines: [{ productId: 'g', qty: 1, unit: 'sack', unitPrice: 1750, unitCost: 1720 }], total: 1750, paymentMethod: 'cash', paidAmount: 1750 }),
      row<Sale>({
        date: '2026-09-10',
        lines: [
          { productId: 'g', qty: 60, unit: 'kg', unitPrice: 38, unitCost: 34.4 },
          { productId: 'u', qty: 2, unit: 'bag', unitPrice: 1500, unitCost: 1400 },
        ],
        total: 5280,
        paymentMethod: 'cash',
        paidAmount: 5280,
      }),
      row<Sale>({ date: '2026-08-30', lines: [{ productId: 'u', qty: 1, unit: 'bag', unitPrice: 1500, unitCost: 1400 }], total: 1500, paymentMethod: 'cash', paidAmount: 1500 }),
      row<Sale>({ date: '2026-09-12', lines: [{ productId: 'u', qty: 5, unit: 'bag', unitPrice: 1500, unitCost: 1400 }], total: 7500, paymentMethod: 'cash', paidAmount: 7500, deletedAt: '2026-09-12T01:00:00.000Z' }),
    ]
    const m = marginReport(SEPT, { sales, products })
    expect(m.products).toEqual([
      { key: 'g', name: 'Hog grower', category: 'feed', revenue: 4030, cost: 3784, margin: 246, marginPct: 6.1 },
      { key: 'u', name: 'Urea 46-0-0', category: 'fertilizer', revenue: 3000, cost: 2800, margin: 200, marginPct: 6.67 },
    ])
    expect(m.categories).toEqual([
      { key: 'feed', name: 'feed', category: 'feed', revenue: 4030, cost: 3784, margin: 246, marginPct: 6.1 },
      { key: 'fertilizer', name: 'fertilizer', category: 'fertilizer', revenue: 3000, cost: 2800, margin: 200, marginPct: 6.67 },
    ])
    expect(m.total).toEqual({ revenue: 7030, cost: 6584, margin: 446, marginPct: 6.34 })
    expect(marginReport(monthRange('2026-11'), { sales, products })).toEqual({ products: [], categories: [], total: { revenue: 0, cost: 0, margin: 0, marginPct: 0 } })
  })
})

describe('inventoryValuation', () => {
  // Grower: lots 50 kg at 35 (after a 50 kg sale took FEFO from the 100 kg receipt) and 200 kg
  // at 38; at cost 1,750 + 7,600 = 9,350; the replayed average is 37 on 250 kg = 9,250.
  // Urea: one bag lot 10 at 1,400 = 14,000 either way. A product without stock is left out.
  it('values the live lots at their receipt cost with the weighted average beside', () => {
    const g = product('g', 'Hog grower', 'feed', 'kg')
    const u = product('u', 'Urea 46-0-0', 'fertilizer', 'bag')
    const empty = product('e', 'Sprayer', 'tool', 'pc')
    const lot = (productId: string, qtyOnHand: number, unitCost: number, receivedDate: string) => row<StockLot>({ productId, qtyOnHand, unitCost, receivedDate })
    const pm = (productId: string, date: string, reason: StockMove['reason'], qtyDelta: number, unitCost: number) => row<StockMove>({ productId, date, qtyDelta, unitCost, reason })
    const snaps = [
      {
        product: g,
        onHand: 250,
        lots: [lot('g', 50, 35, '2026-09-01'), lot('g', 200, 38, '2026-09-05')],
        moves: [pm('g', '2026-09-01', 'purchase', 100, 35), pm('g', '2026-09-05', 'purchase', 200, 38), pm('g', '2026-09-06', 'sale', -50, 37)],
      },
      { product: u, onHand: 10, lots: [lot('u', 10, 1400, '2026-09-03')], moves: [pm('u', '2026-09-03', 'purchase', 10, 1400)] },
      { product: empty, onHand: 0, lots: [], moves: [] },
    ]
    const v = inventoryValuation(snaps)
    expect(v.rows).toEqual([
      { productId: 'u', name: 'Urea 46-0-0', category: 'fertilizer', onHand: 10, unit: 'bag', atCost: 14000, avgCost: 1400, atAverage: 14000 },
      { productId: 'g', name: 'Hog grower', category: 'feed', onHand: 250, unit: 'kg', atCost: 9350, avgCost: 37, atAverage: 9250 },
    ])
    expect(v.categories).toEqual([
      { category: 'fertilizer', atCost: 14000, atAverage: 14000 },
      { category: 'feed', atCost: 9350, atAverage: 9250 },
    ])
    expect(v.total).toEqual({ atCost: 23350, atAverage: 23250 })
    expect(inventoryValuation([])).toEqual({ rows: [], categories: [], total: { atCost: 0, atAverage: 0 } })
  })
})

describe('breakEven', () => {
  // September: operating expenses 8,200 as the fixed cost, gross margin 396 / 4,180 = 9.4737 percent,
  // so break-even sales = 8,200 / 0.094737 = 86,555.56; 4,180 sold covers 4.83 percent of it.
  it('divides the fixed expenses by the gross margin ratio and shows how far the month got', () => {
    const b = breakEven(incomeStatement(SEPT, { transactions, moves }))
    expect(b).toEqual({ fixedExpenses: 8200, grossMarginPct: 9.47, breakEvenSales: 86555.56, sales: 4180, coveragePct: 4.83, shortfall: 82375.56 })
  })

  it('has no break-even without a positive margin', () => {
    const empty = breakEven(incomeStatement(monthRange('2026-11'), { transactions, moves }))
    expect(empty).toEqual({ fixedExpenses: 0, grossMarginPct: 0, breakEvenSales: null, sales: 0, coveragePct: null, shortfall: null })
    const losing = breakEven(incomeStatement(SEPT, { transactions, moves: [...moves, move('2026-09-20', 'sale', -100, 40)] }))
    expect(losing.grossMarginPct).toBeLessThan(0)
    expect(losing.breakEvenSales).toBeNull()
  })
})

describe('returns', () => {
  // Capital 50,000 on 2026-06-15; monthly net income June 5,000, July 15,000, August 20,000,
  // September 12,000 (sales less rent, no stock moves): cumulative 5,000, 20,000, 40,000, 52,000.
  const history: Transaction[] = [
    tx('2026-06-15', 'capital', 'capital', 50000),
    tx('2026-06-20', 'revenue', 'sales', 8000, { saleId: 'a' }),
    tx('2026-06-30', 'expense', 'rent', 3000),
    tx('2026-07-20', 'revenue', 'sales', 18000, { saleId: 'b' }),
    tx('2026-07-30', 'expense', 'rent', 3000),
    tx('2026-08-20', 'revenue', 'sales', 23000, { saleId: 'c' }),
    tx('2026-08-30', 'expense', 'rent', 3000),
    tx('2026-09-20', 'revenue', 'sales', 15000, { saleId: 'd' }),
    tx('2026-09-30', 'expense', 'rent', 3000),
    tx('2026-08-05', 'drawing', 'drawing', 4000), // not income, not capital
  ]

  it('pays back in the month the cumulative net income reaches the capital', () => {
    const r = returns('2026-09-30', { transactions: history, moves: [] })
    expect(r.capital).toBe(50000)
    expect(r.netIncomeToDate).toBe(52000)
    expect(r.roiPct).toBe(104)
    expect(r.monthsElapsed).toBe(4)
    expect(r.paybackMonths).toBe(4)
    expect(r.paybackProjectedMonths).toBeNull()
    expect(r.months).toEqual([
      { month: '2026-06', netIncome: 5000, cumulative: 5000 },
      { month: '2026-07', netIncome: 15000, cumulative: 20000 },
      { month: '2026-08', netIncome: 20000, cumulative: 40000 },
      { month: '2026-09', netIncome: 12000, cumulative: 52000 },
    ])
  })

  it('projects the payback from the average month while it is not reached', () => {
    const r = returns('2026-08-31', { transactions: history, moves: [] })
    expect(r.netIncomeToDate).toBe(40000)
    expect(r.roiPct).toBe(80)
    expect(r.monthsElapsed).toBe(3)
    expect(r.paybackMonths).toBeNull()
    expect(r.paybackProjectedMonths).toBe(4) // 10,000 short at 13,333 a month: one more month
  })

  it('has no return without capital and no projection without profit', () => {
    const none = returns('2026-09-30', { transactions: history.filter((t) => t.kind !== 'capital'), moves: [] })
    expect(none.capital).toBe(0)
    expect(none.roiPct).toBeNull()
    expect(none.paybackMonths).toBeNull()
    expect(none.months).toEqual([])
    const losing = returns('2026-07-31', { transactions: [tx('2026-06-15', 'capital', 'capital', 50000), tx('2026-06-30', 'expense', 'rent', 3000)], moves: [] })
    expect(losing.netIncomeToDate).toBe(-3000)
    expect(losing.roiPct).toBe(-6)
    expect(losing.paybackMonths).toBeNull()
    expect(losing.paybackProjectedMonths).toBeNull()
  })
})

describe('taxEstimate', () => {
  // Rates confirmed against research/regulations-permits-and-tax.md: RT-76 VAT 12 percent on the
  // VATable lines and delivery fees, RT-78 percentage tax 3 percent on the VATable lines only,
  // RT-79 the 8 percent option on gross sales above an annual 250,000, in lieu of income tax and
  // percentage tax. Prices and supplier costs are VAT-inclusive, as in the document's example.
  const grower = { ...product('g', 'Hog grower', 'feed', 'kg'), vatExempt: true }
  const spray = { ...product('s', 'Cypermethrin 100 ml', 'pesticide', 'bottle'), vatExempt: false }
  const products = [grower, spray]
  // September: grower 1 sack 1,750 (exempt); 2 bottles at 560 = 1,120 (VATable) with a 100 delivery
  // fee; purchases: 10 bottles at 448 = 4,480 (VATable) and 17,500 of feed (exempt); August sale out.
  const sales: Sale[] = [
    row<Sale>({ date: '2026-09-02', lines: [{ productId: 'g', qty: 1, unit: 'sack', unitPrice: 1750, unitCost: 1720, vatExempt: true }], total: 1750, paymentMethod: 'cash', paidAmount: 1750 }),
    row<Sale>({
      date: '2026-09-10',
      lines: [{ productId: 's', qty: 2, unit: 'bottle', unitPrice: 560, unitCost: 448, vatExempt: false }],
      total: 1220,
      paymentMethod: 'cash',
      paidAmount: 1220,
      delivery: { address: 'Brgy. San Isidro', fee: 100, status: 'delivered' },
    }),
    row<Sale>({ date: '2026-08-10', lines: [{ productId: 's', qty: 1, unit: 'bottle', unitPrice: 560, unitCost: 448, vatExempt: false }], total: 560, paymentMethod: 'cash', paidAmount: 560 }),
  ]
  const purchases: Purchase[] = [
    row<Purchase>({ date: '2026-09-01', supplierId: 'v1', lines: [{ productId: 's', qty: 10, unit: 'bottle', unitCost: 448, receivedQty: 10 }], total: 4480, paidAmount: 4480 }),
    row<Purchase>({ date: '2026-09-01', supplierId: 'v2', lines: [{ productId: 'g', qty: 10, unit: 'sack', unitCost: 1750, receivedQty: 10 }], total: 17500, paidAmount: 0 }),
  ]

  it('carries the confirmed rates', () => {
    expect(TAX_RATES).toEqual({ vat: 0.12, percentageTax: 0.03, eightPercent: 0.08, eightPercentExclusion: 250000 })
  })

  it('shows nothing in off mode', () => {
    expect(taxEstimate('off', SEPT, { sales, purchases, products })).toEqual({ mode: 'off' })
  })

  it('estimates the percentage tax on the VATable sales and the 8 percent option on gross sales in nonVat mode', () => {
    expect(taxEstimate('nonVat', SEPT, { sales, purchases, products })).toEqual({
      mode: 'nonVat',
      exemptSales: 1750,
      taxableSales: 1220, // 1,120 of VATable lines plus the 100 delivery fee
      grossSales: 2970,
      percentageTax: 36.6,
      eightPercent: 237.6, // before the annual 250,000 exclusion
    })
  })

  it('splits exempt from VATable sales and nets output against input VAT in vat mode', () => {
    expect(taxEstimate('vat', SEPT, { sales, purchases, products })).toEqual({
      mode: 'vat',
      exemptSales: 1750,
      vatableSales: 1220,
      outputVat: 130.71, // 1,220 / 1.12 x 12 percent
      vatablePurchases: 4480,
      inputVat: 480, // 4,480 / 1.12 x 12 percent
      vatPayable: -349.29, // excess input VAT this month
    })
  })

  it('falls back to the product flag on a line without one', () => {
    const old: Sale[] = [row<Sale>({ date: '2026-09-03', lines: [{ productId: 's', qty: 1, unit: 'bottle', unitPrice: 560, unitCost: 448 }], total: 560, paymentMethod: 'cash', paidAmount: 560 })]
    const e = taxEstimate('vat', SEPT, { sales: old, purchases: [], products })
    expect(e.mode === 'vat' && e.vatableSales).toBe(560)
    expect(e.mode === 'vat' && e.outputVat).toBe(60)
  })
})
