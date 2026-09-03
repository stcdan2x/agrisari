import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { monthRange } from '../engine/dates'
import { breakEven, cashFlow, incomeStatement, inventoryValuation, marginReport, returns, taxEstimate } from '../engine/finance'
import { createCustomer } from './customerRepo'
import { db } from './db'
import { recordPayable, recordReceivable } from './paymentRepo'
import { createProduct, listProducts } from './productRepo'
import { createPurchase, receiveLine } from './purchaseRepo'
import { historyRows, periodRows } from './reportRepo'
import { createSale } from './saleRepo'
import { lotsOnHand, recordLoss, stockSnapshots, writeOffExpired } from './stockRepo'
import { createSupplier } from './supplierRepo'
import { addTransaction, listTransactions } from './transactionRepo'

// The P6 verify fixture: September 2026 through every report, checked against hand-computed
// values in all three tax modes.
//   09-01 capital 50,000 put in
//   09-01 SMC dealer (15 days): 10 sacks grower at 1,700 = 17,000, due 09-16, unpaid;
//         received 09-02 as 500 kg at 34
//   09-01 Agro Depot (COD): 10 bottles cypermethrin at 448 (4,480) and 2 bags urea at 1,400
//         (2,800) = 7,280 paid on the spot; received the same day, the urea lot expiring 09-10
//   09-03 rent 5,000; 09-05 drawing 2,000; 09-08 other revenue (empty sacks) 60
//   09-06 sale A, cash: 1 sack grower 1,750 (cost 1,700) + 1 bag urea 1,550 (cost 1,400) = 3,300
//   09-10 sale B, on credit to Aling Nena: 2 bottles at 560 = 1,120 (cost 896) + delivery 100 = 1,220
//   09-12 the last urea bag written off expired (1,400); 09-13 10 kg grower lost (340)
//   09-15 SMC paid 10,000; 09-18 Nena pays 500; 09-20 utilities 1,200
//   09-25 loan 20,000; 09-28 loan payment 2,500
// Income: revenue 4,520 sales + 60 other = 4,580; COGS 3,100 + 896 = 3,996; gross 584 (12.75%);
// write-offs 1,740; expenses 6,200 (stock purchases 24,280 excluded); net -7,356.
// Cash: 3,300 + 500 + 60 - 7,280 - 10,000 - 6,200 = -19,620 operating; 48,000 capital;
// 17,500 financing; net 45,880.
// Margin: cypermethrin 224 on 1,120 (20%), urea 150 on 1,550 (9.68%), grower 50 on 1,750 (2.86%);
// total 424 on 4,420 (9.59%), the delivery fee out.
// Stock on 09-30: grower 440 kg at 34 = 14,960 (average 34), cypermethrin 8 at 448 = 3,584, no urea.
// Break-even: 6,200 / (584 / 4,580) = 48,623.29; 9.42% covered; 44,043.29 to sell.
// Returns: capital 50,000, September net -7,356, ROI -14.71%, no payback and no projection.
// Tax: exempt 3,300 (feed and fertilizer), taxable 1,220 (pesticide plus the fee): nonVat
// 36.6 and 361.6 on 4,520; vat output 130.71, input 480 on 4,480, excess input 349.29.

beforeEach(async () => {
  await Promise.all([
    db.products.clear(),
    db.suppliers.clear(),
    db.customers.clear(),
    db.purchases.clear(),
    db.transactions.clear(),
    db.stockLots.clear(),
    db.stockMoves.clear(),
    db.priceLog.clear(),
    db.payments.clear(),
    db.sales.clear(),
    db.settings.clear(),
  ])
})

const SEPT = monthRange('2026-09')

describe('finance month fixture', () => {
  it('runs September through every report in the three tax modes, matching the hand-computed values', async () => {
    const grower = await createProduct({ name: 'Expert Hog Grower mash', category: 'feed', baseUnit: 'kg', sellUnits: [{ unit: 'sack', factor: 50, price: 1750 }, { unit: 'kg', factor: 1, price: 38 }] })
    const spray = await createProduct({ name: 'Cypermethrin 100 ml', category: 'pesticide', baseUnit: 'bottle', sellUnits: [{ unit: 'bottle', factor: 1, price: 560 }] })
    const urea = await createProduct({ name: 'Urea 46-0-0', category: 'fertilizer', baseUnit: 'bag', sellUnits: [{ unit: 'bag', factor: 1, price: 1550 }] })
    expect([grower.vatExempt, spray.vatExempt, urea.vatExempt]).toEqual([true, false, true])
    const smc = await createSupplier({ name: 'SMC dealer', terms: 'days15', leadTimeDays: 5 })
    const agro = await createSupplier({ name: 'Agro Depot', terms: 'cod' })
    const nena = await createCustomer({ name: 'Aling Nena', type: 'backyard', creditLimit: 5000 })

    await addTransaction({ date: '2026-09-01', kind: 'capital', category: '', amount: 50000 })
    const poSmc = await createPurchase({ date: '2026-09-01', supplierId: smc.id, lines: [{ productId: grower.id, qty: 10, unit: 'sack', unitCost: 1700 }] })
    const poAgro = await createPurchase({
      date: '2026-09-01',
      supplierId: agro.id,
      lines: [
        { productId: spray.id, qty: 10, unit: 'bottle', unitCost: 448 },
        { productId: urea.id, qty: 2, unit: 'bag', unitCost: 1400, expiryDate: '2026-09-10' },
      ],
    })
    expect([poSmc.total, poSmc.paidAmount, poAgro.total, poAgro.paidAmount]).toEqual([17000, 0, 7280, 7280])
    await receiveLine({ purchaseId: poAgro.id, lineIndex: 0, qty: 10, date: '2026-09-01' })
    await receiveLine({ purchaseId: poAgro.id, lineIndex: 1, qty: 2, date: '2026-09-01' })
    await receiveLine({ purchaseId: poSmc.id, lineIndex: 0, qty: 10, date: '2026-09-02' })
    await addTransaction({ date: '2026-09-03', kind: 'expense', category: 'rent', amount: 5000 })
    await addTransaction({ date: '2026-09-05', kind: 'drawing', category: '', amount: 2000 })
    await addTransaction({ date: '2026-09-08', kind: 'revenue', category: 'Empty sacks', amount: 60 })
    const saleA = await createSale({
      date: '2026-09-06',
      lines: [
        { productId: grower.id, qty: 1, unit: 'sack' },
        { productId: urea.id, qty: 1, unit: 'bag' },
      ],
      paymentMethod: 'cash',
    })
    expect(saleA.total).toBe(3300)
    expect(saleA.lines.map((l) => [l.unitCost, l.vatExempt])).toEqual([
      [1700, true],
      [1400, true],
    ])
    const saleB = await createSale({
      date: '2026-09-10',
      customerId: nena.id,
      lines: [{ productId: spray.id, qty: 2, unit: 'bottle' }],
      paymentMethod: 'credit',
      delivery: { address: 'Purok 3', fee: 100 },
    })
    expect([saleB.total, saleB.paidAmount, saleB.lines[0].unitCost, saleB.lines[0].vatExempt]).toEqual([1220, 0, 448, false])
    const ureaLot = (await lotsOnHand(urea.id))[0]
    expect(ureaLot.qtyOnHand).toBe(1)
    await writeOffExpired({ lotId: ureaLot.id, date: '2026-09-12' })
    await recordLoss({ productId: grower.id, qty: 10, date: '2026-09-13', note: 'torn sack' })
    await recordPayable({ supplierId: smc.id, date: '2026-09-15', amount: 10000, method: 'cash' })
    await recordReceivable({ customerId: nena.id, date: '2026-09-18', amount: 500, method: 'gcash' })
    await addTransaction({ date: '2026-09-20', kind: 'expense', category: 'utilities', amount: 1200 })
    await addTransaction({ date: '2026-09-25', kind: 'loan', category: '', amount: 20000 })
    await addTransaction({ date: '2026-09-28', kind: 'loanPayment', category: '', amount: 2500 })

    // The ledger holds the posted rows beside the hand entries
    expect((await listTransactions(SEPT)).map((t) => [t.kind, t.category, t.amount]).sort()).toEqual(
      [
        ['capital', 'capital', 50000],
        ['drawing', 'drawing', 2000],
        ['expense', 'rent', 5000],
        ['expense', 'stock purchases', 7280],
        ['expense', 'stock purchases', 17000],
        ['expense', 'utilities', 1200],
        ['loan', 'loan', 20000],
        ['loanPayment', 'loan payment', 2500],
        ['revenue', 'Empty sacks', 60],
        ['revenue', 'sales', 1220],
        ['revenue', 'sales', 3300],
      ].sort(),
    )

    const rows = await periodRows(SEPT)
    const products = await listProducts({ includeExtension: true })

    // Income statement
    const s = incomeStatement(SEPT, rows)
    expect(s.revenue).toEqual({ sales: 4520, other: 60, total: 4580 })
    expect(s.cogs).toBe(3996)
    expect(s.grossProfit).toBe(584)
    expect(s.grossMarginPct).toBe(12.75)
    expect(s.writeOffs).toEqual({ expired: 1400, loss: 340, total: 1740 })
    expect(s.expenses).toEqual({ rows: [{ category: 'rent', amount: 5000 }, { category: 'utilities', amount: 1200 }], total: 6200 })
    expect(s.netIncome).toBe(-7356)

    // Cash flow
    const c = cashFlow(SEPT, rows)
    expect(c.operating.rows.map((r) => r.amount)).toEqual([3300, 500, 60, -7280, -10000, -6200])
    expect([c.operating.total, c.capital.total, c.financing.total, c.net]).toEqual([-19620, 48000, 17500, 45880])

    // Margin
    const m = marginReport(SEPT, { sales: rows.sales, products })
    expect(m.products.map((r) => [r.name, r.revenue, r.cost, r.margin, r.marginPct])).toEqual([
      ['Cypermethrin 100 ml', 1120, 896, 224, 20],
      ['Urea 46-0-0', 1550, 1400, 150, 9.68],
      ['Expert Hog Grower mash', 1750, 1700, 50, 2.86],
    ])
    expect(m.categories.map((r) => [r.category, r.margin])).toEqual([
      ['pesticide', 224],
      ['fertilizer', 150],
      ['feed', 50],
    ])
    expect(m.total).toEqual({ revenue: 4420, cost: 3996, margin: 424, marginPct: 9.59 })

    // Valuation
    const v = inventoryValuation(await stockSnapshots())
    expect(v.rows.map((r) => [r.name, r.onHand, r.unit, r.atCost, r.avgCost, r.atAverage])).toEqual([
      ['Expert Hog Grower mash', 440, 'kg', 14960, 34, 14960],
      ['Cypermethrin 100 ml', 8, 'bottle', 3584, 448, 3584],
    ])
    expect(v.total).toEqual({ atCost: 18544, atAverage: 18544 })

    // Break-even and returns
    expect(breakEven(s)).toEqual({ fixedExpenses: 6200, grossMarginPct: 12.75, breakEvenSales: 48623.29, sales: 4580, coveragePct: 9.42, shortfall: 44043.29 })
    const r = returns('2026-09-30', await historyRows('2026-09-30'))
    expect(r).toEqual({
      capital: 50000,
      netIncomeToDate: -7356,
      roiPct: -14.71,
      monthsElapsed: 1,
      paybackMonths: null,
      paybackProjectedMonths: null,
      months: [{ month: '2026-09', netIncome: -7356, cumulative: -7356 }],
    })

    // The three tax modes
    const taxInput = { sales: rows.sales, purchases: rows.purchases, products }
    expect(taxEstimate('off', SEPT, taxInput)).toEqual({ mode: 'off' })
    expect(taxEstimate('nonVat', SEPT, taxInput)).toEqual({ mode: 'nonVat', exemptSales: 3300, taxableSales: 1220, grossSales: 4520, percentageTax: 36.6, eightPercent: 361.6 })
    expect(taxEstimate('vat', SEPT, taxInput)).toEqual({ mode: 'vat', exemptSales: 3300, vatableSales: 1220, outputVat: 130.71, vatablePurchases: 4480, inputVat: 480, vatPayable: -349.29 })
  })
})
