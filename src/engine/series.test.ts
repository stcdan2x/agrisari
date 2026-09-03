import { describe, expect, it } from 'vitest'
import type { Aging } from '../db/paymentRepo'
import type { PriceObservation, Product, Sale, StockMove, Transaction } from '../types'
import { agingSeries, categorySeries, inventoryValueSeries, monthlySeries, monthsEnding, priceSeries } from './series'

const STAMP = '2026-09-30T00:00:00.000Z'
const tx = (date: string, kind: Transaction['kind'], category: string, amount: number, saleId?: string): Transaction => ({
  id: `t-${date}-${amount}`,
  date,
  kind,
  category,
  amount,
  links: saleId ? { saleId } : {},
  updatedAt: STAMP,
})
const move = (date: string, qtyDelta: number, unitCost: number, reason: StockMove['reason'], deleted = false): StockMove => ({
  id: `m-${date}-${qtyDelta}`,
  productId: 'p',
  date,
  qtyDelta,
  unitCost,
  reason,
  updatedAt: STAMP,
  ...(deleted ? { deletedAt: STAMP } : {}),
})
const product = (id: string, name: string, category: Product['category'], baseUnit: string, sellUnits: Product['sellUnits']): Product => ({
  id,
  name,
  category,
  baseUnit,
  sellUnits,
  repackable: false,
  vatExempt: true,
  licenceClass: 'none',
  coldChain: false,
  hasExpiry: false,
  reorderLevel: 0,
  reorderQty: 0,
  updatedAt: STAMP,
})

describe('monthsEnding', () => {
  it('lists the months ascending, ending at the given one, across a year boundary', () => {
    expect(monthsEnding('2026-09', 3)).toEqual(['2026-07', '2026-08', '2026-09'])
    expect(monthsEnding('2027-01', 4)).toEqual(['2026-10', '2026-11', '2026-12', '2027-01'])
    expect(monthsEnding('2026-09', 1)).toEqual(['2026-09'])
  })
})

describe('monthlySeries', () => {
  it('gives sales, COGS and their margin per month, an empty month as zeros, other revenue out', () => {
    const transactions = [
      tx('2026-08-10', 'revenue', 'sales', 1000, 's1'),
      tx('2026-09-06', 'revenue', 'sales', 2500, 's2'),
      tx('2026-09-08', 'revenue', 'Empty sacks', 60),
      tx('2026-09-03', 'expense', 'rent', 5000),
    ]
    const moves = [
      move('2026-08-10', -10, 80, 'sale'),
      move('2026-09-06', -50, 34, 'sale'),
      move('2026-09-30', -5, 34, 'sale'),
      move('2026-09-15', -13.5, 34, 'loss'),
      move('2026-09-02', 500, 34, 'purchase'),
    ]
    expect(monthlySeries(['2026-07', '2026-08', '2026-09'], { transactions, moves })).toEqual([
      { month: '2026-07', sales: 0, cogs: 0, margin: 0 },
      { month: '2026-08', sales: 1000, cogs: 800, margin: 200 },
      { month: '2026-09', sales: 2500, cogs: 1870, margin: 630 },
    ])
  })
})

describe('categorySeries', () => {
  it('gives the period revenue and margin per category from the frozen sale lines, largest revenue first', () => {
    const products = [
      product('g', 'Grower', 'feed', 'kg', [{ unit: 'sack', factor: 50, price: 1750 }]),
      product('s', 'Spray', 'pesticide', 'bottle', [{ unit: 'bottle', factor: 1, price: 560 }]),
    ]
    const sales: Sale[] = [
      {
        id: 'a',
        date: '2026-09-06',
        lines: [{ productId: 'g', qty: 1, unit: 'sack', unitPrice: 1750, unitCost: 1700 }],
        total: 1750,
        paymentMethod: 'cash',
        paidAmount: 1750,
        updatedAt: STAMP,
      },
      {
        id: 'b',
        date: '2026-09-10',
        lines: [{ productId: 's', qty: 2, unit: 'bottle', unitPrice: 560, unitCost: 448 }],
        total: 1220,
        paymentMethod: 'credit',
        paidAmount: 0,
        delivery: { address: 'x', fee: 100, status: 'pending' },
        updatedAt: STAMP,
      },
      {
        id: 'c',
        date: '2026-08-10',
        lines: [{ productId: 's', qty: 5, unit: 'bottle', unitPrice: 560, unitCost: 448 }],
        total: 2800,
        paymentMethod: 'cash',
        paidAmount: 2800,
        updatedAt: STAMP,
      },
    ]
    expect(categorySeries({ from: '2026-09-01', to: '2026-09-30' }, { sales, products })).toEqual([
      { category: 'feed', label: 'Feeds', revenue: 1750, margin: 50 },
      { category: 'pesticide', label: 'Pesticides', revenue: 1120, margin: 224 },
    ])
  })
})

describe('agingSeries', () => {
  it('sums the four buckets across customers with their labels, in age order', () => {
    const rows: Aging[] = [
      { total: 1780, current: 560, d31: 1220, d61: 0, d90: 0 },
      { total: 300, current: 0, d31: 0, d61: 100, d90: 200 },
    ]
    expect(agingSeries(rows)).toEqual([
      { bucket: 'current', label: 'Up to 30 days', amount: 560 },
      { bucket: 'd31', label: '31 to 60', amount: 1220 },
      { bucket: 'd61', label: '61 to 90', amount: 100 },
      { bucket: 'd90', label: 'Over 90', amount: 200 },
    ])
  })
})

describe('inventoryValueSeries', () => {
  it('runs the stock account (quantity times the snapshotted cost) through each month end, deleted moves out', () => {
    const moves = [
      move('2026-05-01', 10, 80, 'purchase'),
      move('2026-08-05', -2, 80, 'sale'),
      move('2026-09-02', 500, 34, 'purchase'),
      move('2026-09-06', -50, 34, 'sale'),
      move('2026-09-07', -100, 34, 'sale', true),
    ]
    expect(inventoryValueSeries(monthsEnding('2026-09', 6), moves)).toEqual([
      { month: '2026-04', value: 0 },
      { month: '2026-05', value: 800 },
      { month: '2026-06', value: 800 },
      { month: '2026-07', value: 800 },
      { month: '2026-08', value: 640 },
      { month: '2026-09', value: 15940 },
    ])
  })
})

describe('priceSeries', () => {
  it('gives the supplier prices per base unit ascending by date, other kinds out', () => {
    const grower = product('g', 'Grower', 'feed', 'kg', [{ unit: 'sack', factor: 50, price: 1750 }])
    const obs = (date: string, kind: PriceObservation['kind'], value: number, unit: string, supplierId?: string): PriceObservation => ({
      id: `o-${date}-${value}`,
      date,
      productId: 'g',
      kind,
      value,
      unit,
      source: 'own',
      ...(supplierId ? { supplierId } : {}),
      updatedAt: STAMP,
    })
    const observations = [
      obs('2026-09-20', 'supplierPrice', 35, 'kg', 'smc'),
      obs('2026-09-01', 'supplierPrice', 1700, 'sack', 'smc'),
      obs('2026-09-10', 'competitorPrice', 1800, 'sack'),
      obs('2026-09-15', 'supplierPrice', 1750, 'sack', 'agro'),
    ]
    expect(priceSeries(observations, grower)).toEqual([
      { date: '2026-09-01', value: 34, supplierId: 'smc' },
      { date: '2026-09-15', value: 35, supplierId: 'agro' },
      { date: '2026-09-20', value: 35, supplierId: 'smc' },
    ])
  })
})
