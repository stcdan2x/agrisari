import type { LoadedParameters } from '../db/parameterRepo'
import { defaultParameters } from '../knowledge/parameters'
import type { CustomerAging } from '../db/paymentRepo'
import type { Customer, ISODate, PriceObservation, Product, Sale, StockLot, StockMove, Supplier } from '../types'
import type { BuyingInput } from './buying'
import type { SellingInput } from './selling'
import { plusDays } from './dates'

// One seeded 90-day history for the P7 golden tests, built in memory (no database): the
// rows the engine reads, with the hand-computed expectations in buying.test.ts.
//   today 2026-09-30; the velocity window is the 90 days 07-03 to 09-30
//   grower (feed, kg, sack of 50): 465 kg received 07-01 at 34; 4 and 6 kg sold on alternate
//     days through the window (450 kg, mean 5, sigma 1); 15 kg on hand; SMC lead time 5 learned
//   urea (fertilizer, bag): 40 bags received 07-01 at 1,400; one bag every third day (30 bags);
//     10 on hand; Agro lead time 3 typed; supplier quotes 1,400 on 08-01 and 1,540 on 09-30
//   cypermethrin (pesticide, bottle at 560): lot 1 of 10 at 448 received 07-01 expiring 10-31,
//     lot 2 of 12 at 448 received 09-01 expiring 2027-06-30; one bottle every 15 days (6 sold)
//   nozzle (tool, piece at 120): 10 received 05-01 at 80, never sold
//   vitamin (sachet at 40, SKU target margin 25): 100 received 09-01 at 36, 20 sold in September
//   layer mash (feed, kg, sack of 50, reorder level 200 and qty 250 typed): 200 kg received
//     09-26 at 30, 20 kg sold: five days of history
export const TODAY: ISODate = '2026-09-30'
const STAMP = '2026-09-30T00:00:00.000Z'

let seq = 0
const id = (p: string) => `${p}-${++seq}`

export function product(over: Partial<Product> & Pick<Product, 'id' | 'name' | 'category' | 'baseUnit' | 'sellUnits'>): Product {
  return {
    repackable: false,
    vatExempt: false,
    licenceClass: 'none',
    coldChain: false,
    hasExpiry: false,
    reorderLevel: 0,
    reorderQty: 0,
    updatedAt: STAMP,
    deletedAt: null,
    ...over,
  }
}

export const move = (productId: string, date: ISODate, qtyDelta: number, unitCost: number, reason: StockMove['reason'], lotId?: string): StockMove => ({
  id: id('m'),
  productId,
  ...(lotId ? { lotId } : {}),
  date,
  qtyDelta,
  unitCost,
  reason,
  updatedAt: STAMP,
  deletedAt: null,
})

export const lot = (productId: string, receivedDate: ISODate, qtyOnHand: number, unitCost: number, expiryDate?: ISODate): StockLot => ({
  id: id('lot'),
  productId,
  receivedDate,
  qtyOnHand,
  unitCost,
  ...(expiryDate ? { expiryDate } : {}),
  updatedAt: STAMP,
  deletedAt: null,
})

const quote = (
  productId: string,
  date: ISODate,
  value: number,
  unit: string,
  supplierId: string,
  source: PriceObservation['source'] = 'heard',
): PriceObservation => ({
  id: id('q'),
  date,
  productId,
  kind: 'supplierPrice',
  value,
  unit,
  source,
  supplierId,
  updatedAt: STAMP,
  deletedAt: null,
})

export const parameters = (): LoadedParameters => ({ values: defaultParameters(), overridden: [] })

export function seededHistory(): BuyingInput {
  seq = 0
  const smc: Supplier = { id: 'smc', name: 'SMC dealer', terms: 'days15', leadTimeDays: 7, updatedAt: STAMP, deletedAt: null }
  const agro: Supplier = { id: 'agro', name: 'Agro Depot', terms: 'cod', leadTimeDays: 3, updatedAt: STAMP, deletedAt: null }

  const grower = product({
    id: 'grower',
    name: 'Expert Hog Grower mash',
    category: 'feed',
    baseUnit: 'kg',
    sellUnits: [
      { unit: 'sack', factor: 50, price: 1750 },
      { unit: 'kg', factor: 1, price: 38 },
    ],
    hasExpiry: true,
    lotShelfLifeDays: 40,
    vatExempt: true,
  })
  const growerLot = lot('grower', '2026-07-01', 15, 34)
  const growerMoves = [move('grower', '2026-07-01', 465, 34, 'purchase', growerLot.id)]
  for (let i = 0; i < 90; i++) growerMoves.push(move('grower', plusDays('2026-07-03', i), i % 2 === 0 ? -4 : -6, 34, 'sale', growerLot.id))

  const urea = product({
    id: 'urea',
    name: 'Urea 46-0-0',
    category: 'fertilizer',
    baseUnit: 'bag',
    sellUnits: [{ unit: 'bag', factor: 1, price: 1550 }],
    vatExempt: true,
  })
  const ureaLot = lot('urea', '2026-07-01', 10, 1400)
  const ureaMoves = [move('urea', '2026-07-01', 40, 1400, 'purchase', ureaLot.id)]
  for (let i = 0; i < 90; i += 3) ureaMoves.push(move('urea', plusDays('2026-07-03', i), -1, 1400, 'sale', ureaLot.id))

  const spray = product({
    id: 'spray',
    name: 'Cypermethrin 100 ml',
    category: 'pesticide',
    baseUnit: 'bottle',
    sellUnits: [{ unit: 'bottle', factor: 1, price: 560 }],
    hasExpiry: true,
  })
  const sprayLot1 = lot('spray', '2026-07-01', 4, 448, '2026-10-31')
  const sprayLot2 = lot('spray', '2026-09-01', 12, 448, '2027-06-30')
  const sprayMoves = [move('spray', '2026-07-01', 10, 448, 'purchase', sprayLot1.id), move('spray', '2026-09-01', 12, 448, 'purchase', sprayLot2.id)]
  for (let i = 0; i < 6; i++) sprayMoves.push(move('spray', plusDays('2026-07-15', i * 15), -1, 448, 'sale', sprayLot1.id))

  const nozzle = product({ id: 'nozzle', name: 'Sprayer nozzle', category: 'tool', baseUnit: 'piece', sellUnits: [{ unit: 'piece', factor: 1, price: 120 }] })
  const nozzleLot = lot('nozzle', '2026-05-01', 10, 80)
  const nozzleMoves = [move('nozzle', '2026-05-01', 10, 80, 'purchase', nozzleLot.id)]

  const vitamin = product({
    id: 'vitamin',
    name: 'Vitamin-electrolyte sachet',
    category: 'vitamin',
    baseUnit: 'sachet',
    sellUnits: [{ unit: 'sachet', factor: 1, price: 40 }],
    hasExpiry: true,
    targetMarginPct: 25,
  })
  const vitaminLot = lot('vitamin', '2026-09-01', 80, 36, '2027-09-01')
  const vitaminMoves = [move('vitamin', '2026-09-01', 100, 36, 'purchase', vitaminLot.id)]
  for (let i = 0; i < 20; i++) vitaminMoves.push(move('vitamin', plusDays('2026-09-02', i), -1, 36, 'sale', vitaminLot.id))

  const mash = product({
    id: 'mash',
    name: 'Layer mash',
    category: 'feed',
    baseUnit: 'kg',
    sellUnits: [{ unit: 'sack', factor: 50, price: 1650 }],
    hasExpiry: true,
    lotShelfLifeDays: 40,
    vatExempt: true,
    reorderLevel: 200,
    reorderQty: 250,
  })
  const mashLot = lot('mash', '2026-09-26', 180, 30)
  const mashMoves = [move('mash', '2026-09-26', 200, 30, 'purchase', mashLot.id), move('mash', '2026-09-28', -20, 30, 'sale', mashLot.id)]

  return {
    today: TODAY,
    snapshots: [
      { product: grower, onHand: 15, lots: [growerLot], moves: growerMoves },
      { product: urea, onHand: 10, lots: [ureaLot], moves: ureaMoves },
      { product: spray, onHand: 16, lots: [sprayLot1, sprayLot2], moves: sprayMoves },
      { product: nozzle, onHand: 10, lots: [nozzleLot], moves: nozzleMoves },
      { product: vitamin, onHand: 80, lots: [vitaminLot], moves: vitaminMoves },
      { product: mash, onHand: 180, lots: [mashLot], moves: mashMoves },
    ],
    suppliers: [smc, agro],
    supply: [
      { productId: 'grower', supplierId: 'smc', leadTimeDays: 5, leadTimeLearned: true },
      { productId: 'urea', supplierId: 'agro', leadTimeDays: 3, leadTimeLearned: false },
      { productId: 'spray', supplierId: 'agro', leadTimeDays: 3, leadTimeLearned: false },
      { productId: 'nozzle', supplierId: 'agro', leadTimeDays: 3, leadTimeLearned: false },
      { productId: 'mash', supplierId: 'smc', leadTimeDays: 5, leadTimeLearned: true },
    ],
    priceLog: [
      quote('urea', '2026-07-01', 1400, 'bag', 'agro', 'own'),
      quote('urea', '2026-08-01', 1400, 'bag', 'agro'),
      quote('urea', '2026-09-30', 1540, 'bag', 'agro'),
    ],
    parameters: parameters(),
  }
}

// The selling side of the same history (7.3): three named customers and a walk-in, nine
// sales in the window with four deliveries, and the receivables aging the payments
// repository would report on 09-30.
//   S8 07-10 Ben, cash: 3 bags urea (4,650)
//   S9 07-20 Rosa, cash: 1 sack grower (1,750): her only purchase, 72 days ago
//   S1 09-05 Nena, credit, delivered (fee 100): 1 sack grower + 5 vitamin sachets (1,950)
//   S2 09-10 Ben, cash, delivered (no fee): 2 bags urea (3,100)
//   S3 09-12 walk-in, cash: 1 sack grower + 2 sachets (1,830)
//   S4 09-15 Nena, credit, delivered (fee 100): 2 sacks grower + 5 sachets (3,700)
//   S5 09-20 Ben, cash: 2 bottles cypermethrin + 1 bag urea (2,670)
//   S6 09-22 walk-in, cash: 1 sack grower + 3 sachets (1,870)
//   S7 09-25 Nena, credit, delivered (fee 100): 1 sack grower + 1 bottle (2,310)
// Lines 23,830 at a cost of 22,184: margin 1,646 (6.91 percent), delivery fees out.
// Grower and the vitamin sold together in S1, S3, S4 and S6. Nena owes 6,000 (2,000 current,
// 3,000 at 31 to 60 days, 1,000 at 61 to 90) on a 5,000 limit; Ben 1,500 current on 20,000.
const sale = (
  id: string,
  date: ISODate,
  customerId: string | undefined,
  lines: [productId: string, qty: number, unit: string, unitPrice: number, unitCost: number][],
  paymentMethod: Sale['paymentMethod'],
  fee?: number,
): Sale => {
  const subtotal = lines.reduce((s, l) => s + l[1] * l[3], 0)
  const total = subtotal + (fee ?? 0)
  return {
    id,
    date,
    ...(customerId ? { customerId } : {}),
    lines: lines.map(([productId, qty, unit, unitPrice, unitCost]) => ({ productId, qty, unit, unitPrice, unitCost })),
    total,
    paymentMethod,
    paidAmount: paymentMethod === 'credit' ? 0 : total,
    ...(fee !== undefined ? { delivery: { address: 'Purok 3', fee, status: 'delivered' as const } } : {}),
    updatedAt: STAMP,
    deletedAt: null,
  }
}

export function seededSelling(): SellingInput {
  const buying = seededHistory()
  const grower = buying.snapshots.find((s) => s.product.id === 'grower')!
  grower.product = { ...grower.product, species: ['hog'], stage: 'grower' }
  const spray = buying.snapshots.find((s) => s.product.id === 'spray')!
  spray.product = { ...spray.product, pesticideClass: 'insecticide' }
  const mash = buying.snapshots.find((s) => s.product.id === 'mash')!
  mash.product = { ...mash.product, species: ['layer'], stage: 'layer1' }
  const finisher = product({
    id: 'finisher',
    name: 'Expert Hog Finisher mash',
    category: 'feed',
    baseUnit: 'kg',
    sellUnits: [{ unit: 'sack', factor: 50, price: 1700 }],
    hasExpiry: true,
    lotShelfLifeDays: 40,
    vatExempt: true,
    species: ['hog'],
    stage: 'finisher',
  })
  buying.snapshots.push({ product: finisher, onHand: 0, lots: [], moves: [] })
  const customers: Customer[] = [
    { id: 'nena', name: 'Aling Nena', type: 'backyard', creditLimit: 5000, updatedAt: STAMP, deletedAt: null },
    { id: 'ben', name: 'Mang Ben', type: 'commercial', creditLimit: 20000, updatedAt: STAMP, deletedAt: null },
    { id: 'rosa', name: 'Aling Rosa', type: 'backyard', updatedAt: STAMP, deletedAt: null },
  ]
  const sales: Sale[] = [
    sale('s8', '2026-07-10', 'ben', [['urea', 3, 'bag', 1550, 1400]], 'cash'),
    sale('s9', '2026-07-20', 'rosa', [['grower', 1, 'sack', 1750, 1700]], 'cash'),
    sale(
      's1',
      '2026-09-05',
      'nena',
      [
        ['grower', 1, 'sack', 1750, 1700],
        ['vitamin', 5, 'sachet', 40, 36],
      ],
      'credit',
      100,
    ),
    sale('s2', '2026-09-10', 'ben', [['urea', 2, 'bag', 1550, 1400]], 'cash', 0),
    sale(
      's3',
      '2026-09-12',
      undefined,
      [
        ['grower', 1, 'sack', 1750, 1700],
        ['vitamin', 2, 'sachet', 40, 36],
      ],
      'cash',
    ),
    sale(
      's4',
      '2026-09-15',
      'nena',
      [
        ['grower', 2, 'sack', 1750, 1700],
        ['vitamin', 5, 'sachet', 40, 36],
      ],
      'credit',
      100,
    ),
    sale(
      's5',
      '2026-09-20',
      'ben',
      [
        ['spray', 2, 'bottle', 560, 448],
        ['urea', 1, 'bag', 1550, 1400],
      ],
      'cash',
    ),
    sale(
      's6',
      '2026-09-22',
      undefined,
      [
        ['grower', 1, 'sack', 1750, 1700],
        ['vitamin', 3, 'sachet', 40, 36],
      ],
      'cash',
    ),
    sale(
      's7',
      '2026-09-25',
      'nena',
      [
        ['grower', 1, 'sack', 1750, 1700],
        ['spray', 1, 'bottle', 560, 448],
      ],
      'credit',
      100,
    ),
  ]
  const aging: CustomerAging[] = [
    { customerId: 'nena', name: 'Aling Nena', total: 6000, current: 2000, d31: 3000, d61: 1000, d90: 0, oldest: '2026-07-25' },
    { customerId: 'ben', name: 'Mang Ben', total: 1500, current: 1500, d31: 0, d61: 0, d90: 0, oldest: '2026-09-20' },
  ]
  return { ...buying, sales, customers, aging }
}
