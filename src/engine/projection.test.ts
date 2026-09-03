import { describe, expect, it } from 'vitest'
import { parameters } from './history.fixture'
import { defaultScenario, project, type ScenarioParams, sensitivity } from './projection'

// The 7.4 fixture: a cash-only store with flat sales, hand-computed.
//   12 months from 2027-01; steady sales 300,000, no ramp, no seasonality; margin 12 percent;
//   rent 8,000 and a helper 12,000 fixed; variable expenses 1 percent of sales; no tax, no credit;
//   30 days of stock (one month of COGS bought before opening); capex 60,000 over 5 years
//   (1,000 a month); opening capital 400,000.
//   Every month: sales 300,000, COGS 264,000, gross 36,000, variable 3,000, fixed 20,000,
//   depreciation 1,000, net income 12,000; cash +13,000 (no depreciation in cash).
//   Month 0: capex 60,000 and opening stock 264,000 = 324,000 out. Payback at month 25
//   (324,000 / 13,000 = 24.9). Break-even sales 21,000 / 0.11 = 190,909.09 a month.
const flat = (): ScenarioParams => ({
  startMonth: '2027-01',
  months: 12,
  steadyStateSales: 300000,
  ramp: 'none',
  grossMarginPct: 12,
  salesMix: {},
  fixedExpenses: [
    { label: 'Rent', amount: 8000 },
    { label: 'Helper', amount: 12000 },
  ],
  variableExpensePct: 1,
  salesTaxPct: 0,
  creditSalesPct: 0,
  dsoDays: 0,
  dpoDays: 0,
  dioDays: 30,
  badDebtPct: 0,
  openingCapital: 400000,
  capex: [{ label: 'Shelving and scale', amount: 60000, lifeYears: 5 }],
})

describe('project', () => {
  it('runs the flat cash store to the hand-computed months and summary', () => {
    const p = project(flat(), parameters())
    expect(p.months).toHaveLength(12)
    expect(p.months[0]).toMatchObject({
      month: '2027-01',
      index: 1,
      ramp: 1,
      season: 1,
      sales: 300000,
      cogs: 264000,
      grossProfit: 36000,
      variableExpenses: 3000,
      fixedExpenses: 20000,
      depreciation: 1000,
      badDebt: 0,
      tax: 0,
      interest: 0,
      netIncome: 12000,
      collections: 300000,
      purchases: 264000,
      purchasePayments: 264000,
      loanPayment: 0,
      netCash: 13000,
      inventory: 264000,
    })
    expect(p.months[0].cash).toBe(400000 - 324000 + 13000)
    expect(p.months[11]).toMatchObject({ month: '2027-12', netIncome: 12000, cash: 232000 })
    expect(p.opening).toEqual({ capex: 60000, openingStock: 264000, loan: 0, total: 324000 })
    expect(p.summary).toEqual({
      totalSales: 3600000,
      totalNetIncome: 144000,
      capitalPeak: 324000,
      capitalPeakMonth: 0,
      paybackMonth: null,
      breakEvenMonth: 1,
      breakEvenSalesPerMonth: 190909.09,
      endingCash: 232000,
      endingInventory: 264000,
    })
    expect(project({ ...flat(), months: 36 }, parameters()).summary.paybackMonth).toBe(25)
    expect(p.explanation.text).toContain('324,000')
    expect(p.explanation.assumptions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: 'Ramp curve', source: 'FK-113' }),
        expect.objectContaining({ label: 'Break-even', source: 'FK-65' }),
      ]),
    )
  })

  it('ramps the first year (60 to 100 percent), applies the category seasonal index and lags collections and payments', () => {
    const p = project({ ...flat(), ramp: 'default', salesMix: { feed: 1 }, creditSalesPct: 40, dsoDays: 30, dpoDays: 30, badDebtPct: 2 }, parameters())
    // January: ramp 60 percent, feed Q1 index 0.97
    expect(p.months[0]).toMatchObject({ ramp: 0.6, season: 0.97, sales: 174600 })
    expect(p.months[11]).toMatchObject({ ramp: 1, season: 1.07, sales: 321000 })
    // Credit sales of January (40 percent) arrive in February less the 2 percent bad debt; the first purchases are paid in February
    expect(p.months[0].collections).toBe(104760)
    expect(p.months[1].collections).toBeCloseTo(0.6 * p.months[1].sales + 0.4 * 0.98 * 174600, 2)
    expect(p.months[0].purchasePayments).toBe(0)
    expect(p.months[1].purchasePayments).toBe(p.months[0].purchases)
    expect(p.months[0].badDebt).toBeCloseTo(174600 * 0.4 * 0.02, 2)
    const slow = project({ ...flat(), ramp: 'slow', months: 24 }, parameters())
    expect(slow.months[0].ramp).toBe(0.6)
    expect(slow.months[23].ramp).toBe(1)
  })

  it('charges diminishing interest and the principal on a loan and counts it in the opening funding', () => {
    const p = project({ ...flat(), loan: { amount: 120000, ratePctPerYear: 12, months: 12 } }, parameters())
    expect(p.opening.loan).toBe(120000)
    expect(p.months[0]).toMatchObject({ interest: 1200, loanPayment: 10000 })
    expect(p.months[1].interest).toBe(1100)
    expect(p.months[11]).toMatchObject({ interest: 100, loanPayment: 10000 })
    expect(p.summary.capitalPeak).toBe(324000 - 120000)
    expect(p.months[0].netIncome).toBe(12000 - 1200)
  })

  it('applies the sales tax, rejects out-of-range inputs and seeds a scenario from the research defaults', () => {
    const taxed = project({ ...flat(), salesTaxPct: 3 }, parameters())
    expect(taxed.months[0]).toMatchObject({ tax: 9000, netIncome: 3000 })
    expect(() => project({ ...flat(), months: 6 }, parameters())).toThrow(/12 to 36/)
    expect(() => project({ ...flat(), grossMarginPct: 120 }, parameters())).toThrow(/margin/i)
    expect(() => project({ ...flat(), steadyStateSales: 0 }, parameters())).toThrow(/sales/i)
    const seed = defaultScenario('2027-01')
    expect(seed).toMatchObject({ startMonth: '2027-01', months: 24, ramp: 'default', grossMarginPct: 12, dsoDays: 30, badDebtPct: 2 })
    expect(seed.fixedExpenses.map((f) => [f.label, f.amount])).toEqual(
      expect.arrayContaining([
        ['Helper', 13650],
        ['Electricity', 2956.66],
      ]),
    )
    expect(seed.loan).toBeUndefined()
  })
})

describe('sensitivity', () => {
  it('runs the fixed set beside the base: lower sales, dearer purchases (3.2 percent margin), slower payers, doubled bad debt, dearer rent', () => {
    const s = sensitivity({ ...flat(), months: 36, creditSalesPct: 40, dsoDays: 30, badDebtPct: 2 }, parameters())
    expect(s.rows.map((r) => r.id)).toEqual(['sales-10', 'sales-20', 'purchase+10', 'dso+15', 'baddebt-x2', 'rent+20'])
    const by = (id: string) => s.rows.find((r) => r.id === id)!
    expect(by('sales-10').summary.totalSales).toBeCloseTo(s.base.totalSales * 0.9, 2)
    expect(by('sales-10').summary.totalNetIncome).toBeLessThan(s.base.totalNetIncome)
    expect(by('purchase+10').params.grossMarginPct).toBe(3.2)
    expect(by('purchase+10').summary.breakEvenSalesPerMonth).toBeGreaterThan(s.base.breakEvenSalesPerMonth)
    expect(by('dso+15').params.dsoDays).toBe(45)
    expect(by('dso+15').summary.capitalPeak).toBeGreaterThan(s.base.capitalPeak)
    expect(by('baddebt-x2').params.badDebtPct).toBe(4)
    expect(by('rent+20').params.fixedExpenses.find((f) => f.label === 'Rent')?.amount).toBe(9600)
    expect(by('rent+20').params.fixedExpenses.find((f) => f.label === 'Helper')?.amount).toBe(12000)
    for (const r of s.rows) expect(r.summary.paybackMonth === null || r.summary.paybackMonth >= s.base.paybackMonth!).toBe(true)
    expect(s.explanation.assumptions).toEqual(expect.arrayContaining([expect.objectContaining({ source: 'FK-114' })]))
  })
})
