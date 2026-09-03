import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { monthRange } from '../engine/dates'
import { createCustomer } from './customerRepo'
import { dashboardCharts, dashboardFigures, priceTrend, productsWithPrices } from './dashboardRepo'
import { db } from './db'
import { saveParameters } from './parameterRepo'
import { createProduct } from './productRepo'
import { createPurchase, receiveLine } from './purchaseRepo'
import { createSale } from './saleRepo'
import { createSupplier } from './supplierRepo'
import { addTransaction } from './transactionRepo'

// The P8 verify fixture: a store read on 2026-09-30 with September as the period, every tile
// figure checked against hand-computed values.
//   05-01 capital 50,000; Agro Depot (COD) 10 nozzles at 80 = 800 paid and received the same day,
//         never sold since (152 days on 09-30: dead stock 800)
//   08-20 Agro Depot (COD) 10 bottles cypermethrin at 448 = 4,480 paid, received the same day,
//         the lot expiring 10-20 (20 days on 09-30)
//   08-25 sale B on credit to Aling Nena: 2 bottles at 560 = 1,120 (cost 896) + delivery 100
//         pending = 1,220 (36 days on 09-30: past 30 days)
//   09-01 SMC dealer (15 days): 10 sacks grower at 1,700 = 17,000 due 09-16, unpaid (overdue);
//         received 09-02 as 500 kg at 34, the feed lot life of 40 days putting its expiry on 10-12
//   09-03 rent 5,000
//   09-06 sale A, cash: 1 sack grower 1,750 (cost 1,700)
//   09-15 sale D on credit to Nena: 1 bottle 560 (cost 448) (15 days on 09-30: current)
//   09-20 SMC dealer: 5 sacks grower at 1,700 = 8,500 due 10-05 (inside the week from 09-30), not received
//   09-30 sale C, cash: 5 kg grower at 38 = 190 (cost 170)
// Sales: today 190; September 1,750 + 560 + 190 = 2,500 over three sales.
// Margin: revenue 2,500, COGS 1,700 + 448 + 170 = 2,318, gross 182 (7.28%).
// Cash on hand: 50,000 - 800 - 4,480 - 5,000 + 1,750 + 190 = 41,660; September net -5,000 + 1,940 = -3,060.
// Receivables: 1,220 past 30 days + 560 current = 1,780, one customer overdue.
// Payables: 17,000 overdue (14 days), 8,500 due this week, 25,500 open.
// Stock: spray 7 on a reorder level of 8 (low); two lots expiring within 30 days (spray 10-20,
// grower 10-12); nozzles dead at 800; value at cost 445 x 34 + 7 x 448 + 10 x 80 = 19,066.
// Top sellers by revenue: grower 1,940 (margin 70), spray 560 (margin 112); the delivery fee out.

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
const AS_OF = '2026-09-30'

async function seed() {
  const grower = await createProduct({
    name: 'Expert Hog Grower mash',
    category: 'feed',
    baseUnit: 'kg',
    sellUnits: [
      { unit: 'sack', factor: 50, price: 1750 },
      { unit: 'kg', factor: 1, price: 38 },
    ],
    reorderLevel: 100,
    reorderQty: 500,
  })
  const spray = await createProduct({
    name: 'Cypermethrin 100 ml',
    category: 'pesticide',
    baseUnit: 'bottle',
    sellUnits: [{ unit: 'bottle', factor: 1, price: 560 }],
    reorderLevel: 8,
    reorderQty: 10,
  })
  const nozzle = await createProduct({ name: 'Sprayer nozzle', category: 'tool', baseUnit: 'piece', sellUnits: [{ unit: 'piece', factor: 1, price: 120 }] })
  const smc = await createSupplier({ name: 'SMC dealer', terms: 'days15', leadTimeDays: 5 })
  const agro = await createSupplier({ name: 'Agro Depot', terms: 'cod' })
  const nena = await createCustomer({ name: 'Aling Nena', type: 'backyard', creditLimit: 5000 })

  await addTransaction({ date: '2026-05-01', kind: 'capital', category: '', amount: 50000 })
  const poNozzle = await createPurchase({ date: '2026-05-01', supplierId: agro.id, lines: [{ productId: nozzle.id, qty: 10, unit: 'piece', unitCost: 80 }] })
  await receiveLine({ purchaseId: poNozzle.id, lineIndex: 0, qty: 10, date: '2026-05-01' })
  const poSpray = await createPurchase({
    date: '2026-08-20',
    supplierId: agro.id,
    lines: [{ productId: spray.id, qty: 10, unit: 'bottle', unitCost: 448, expiryDate: '2026-10-20' }],
  })
  await receiveLine({ purchaseId: poSpray.id, lineIndex: 0, qty: 10, date: '2026-08-20' })
  const saleB = await createSale({
    date: '2026-08-25',
    customerId: nena.id,
    lines: [{ productId: spray.id, qty: 2, unit: 'bottle' }],
    paymentMethod: 'credit',
    delivery: { address: 'Purok 3', fee: 100 },
  })
  expect([saleB.total, saleB.paidAmount]).toEqual([1220, 0])
  const poSmc = await createPurchase({ date: '2026-09-01', supplierId: smc.id, lines: [{ productId: grower.id, qty: 10, unit: 'sack', unitCost: 1700 }] })
  expect(poSmc.dueDate).toBe('2026-09-16')
  await receiveLine({ purchaseId: poSmc.id, lineIndex: 0, qty: 10, date: '2026-09-02' })
  await addTransaction({ date: '2026-09-03', kind: 'expense', category: 'rent', amount: 5000 })
  await createSale({ date: '2026-09-06', lines: [{ productId: grower.id, qty: 1, unit: 'sack' }], paymentMethod: 'cash' })
  await createSale({ date: '2026-09-15', customerId: nena.id, lines: [{ productId: spray.id, qty: 1, unit: 'bottle' }], paymentMethod: 'credit' })
  const poSmc2 = await createPurchase({ date: '2026-09-20', supplierId: smc.id, lines: [{ productId: grower.id, qty: 5, unit: 'sack', unitCost: 1700 }] })
  expect(poSmc2.dueDate).toBe('2026-10-05')
  await createSale({ date: '2026-09-30', lines: [{ productId: grower.id, qty: 5, unit: 'kg' }], paymentMethod: 'cash' })
  return { grower, spray, nozzle }
}

describe('dashboardFigures', () => {
  it('assembles the twelve tile figures for September from the seeded store, matching the hand-computed values', async () => {
    const { grower, spray, nozzle } = await seed()
    const f = await dashboardFigures(SEPT, AS_OF)

    expect(f.period).toEqual(SEPT)
    expect(f.asOf).toBe(AS_OF)
    expect(f.sales).toEqual({ today: 190, period: 2500, count: 3 })
    expect(f.margin).toEqual({ grossProfit: 182, grossMarginPct: 7.28 })
    expect(f.cash).toEqual({ onHand: 41660, periodNet: -3060 })
    expect(f.receivables).toEqual({ outstanding: 1780, overdue: 1220, customersOverdue: 1 })
    expect(f.payables).toEqual({ dueThisWeek: 8500, countDueThisWeek: 1, overdue: 17000, countOverdue: 1, open: 25500 })
    expect(f.deliveries).toEqual({ pending: 1 })
    expect(f.stock).toEqual({ lowStock: 1, expiring30: 2, expired: 0, deadStockValue: 800, valueAtCost: 19066 })
    expect(f.topSellers).toEqual([
      { productId: grower.id, name: 'Expert Hog Grower mash', revenue: 1940, margin: 70 },
      { productId: spray.id, name: 'Cypermethrin 100 ml', revenue: 560, margin: 112 },
    ])
    expect(f.alerts.map((a) => [a.type, a.productId]).sort()).toEqual(
      [
        ['lowStock', spray.id],
        ['expiring', spray.id],
        ['expiring', grower.id],
        ['deadStock', nozzle.id],
      ].sort(),
    )
  })

  it('reads the dead-stock days from the store parameters and counts the extension lines out', async () => {
    const { nozzle } = await seed()
    await saveParameters({ deadStockDays: 200 })
    const f = await dashboardFigures(SEPT, AS_OF)
    expect(f.stock.deadStockValue).toBe(0)
    expect(f.alerts.some((a) => a.type === 'deadStock')).toBe(false)

    const vaccine = await createProduct({
      name: 'ND vaccine',
      category: 'vaccine',
      baseUnit: 'vial',
      sellUnits: [{ unit: 'vial', factor: 1, price: 150 }],
      reorderLevel: 5,
      extension: true,
    })
    expect(vaccine.extension).toBe(true)
    const g = await dashboardFigures(SEPT, AS_OF)
    expect(g.stock.lowStock).toBe(1) // the vaccine at 0 on hand is not counted
    expect(g.stock.valueAtCost).toBe(19066)
    expect(nozzle.id).toBeTruthy()
  })

  it('gives a day period its own flows while the balances and the stock stay as of the same day', async () => {
    await seed()
    const f = await dashboardFigures({ from: AS_OF, to: AS_OF }, AS_OF)
    expect(f.sales).toEqual({ today: 190, period: 190, count: 1 })
    expect(f.margin).toEqual({ grossProfit: 20, grossMarginPct: 10.53 })
    expect(f.cash).toEqual({ onHand: 41660, periodNet: 190 })
    expect(f.receivables).toEqual({ outstanding: 1780, overdue: 1220, customersOverdue: 1 })
    expect(f.stock.valueAtCost).toBe(19066)
    expect(f.topSellers).toEqual([{ productId: expect.any(String), name: 'Expert Hog Grower mash', revenue: 190, margin: 20 }])
  })

  it('assembles the chart series for the period from the same seeded store', async () => {
    const { grower } = await seed()
    const c = await dashboardCharts(SEPT, AS_OF, 6)
    expect(c.months).toEqual(['2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09'])
    // August: the credit sale of 2 bottles 1,120 plus its 100 delivery fee (cost 896); September: 2,500 on 2,318 of COGS
    expect(c.monthly.slice(4)).toEqual([
      { month: '2026-08', sales: 1220, cogs: 896, margin: 324 },
      { month: '2026-09', sales: 2500, cogs: 2318, margin: 182 },
    ])
    expect(c.monthly[0]).toEqual({ month: '2026-04', sales: 0, cogs: 0, margin: 0 })
    expect(c.categories).toEqual([
      { category: 'feed', label: 'Feeds', revenue: 1940, margin: 70 },
      { category: 'pesticide', label: 'Pesticides', revenue: 560, margin: 112 },
    ])
    expect(c.aging.map((a) => a.amount)).toEqual([560, 1220, 0, 0])
    // Month-end stock account: nozzles 800 from May; 8 bottles at 448 added in August; the grower lot less 55 kg in September
    expect(c.inventoryValue.map((v) => v.value)).toEqual([0, 800, 800, 800, 4384, 19066])
    // The receipts logged the supplier prices per base unit
    expect(await priceTrend(grower.id)).toEqual([{ date: '2026-09-02', value: 34, supplierId: expect.any(String) }])
    // The price trend offers only the products with a supplier price on the log, by name
    expect((await productsWithPrices()).map((p) => p.name)).toEqual(['Cypermethrin 100 ml', 'Expert Hog Grower mash', 'Sprayer nozzle'])
  })
})
