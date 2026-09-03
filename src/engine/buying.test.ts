import { describe, expect, it } from 'vitest'
import {
  type BuyingRecommendation,
  buyingRecommendations,
  type ClearanceRec,
  type ForwardBuyRec,
  type ReorderRec,
  type RepriceRec,
  type StopBuyingRec,
} from './buying'
import { move, seededHistory } from './history.fixture'

// Golden tests per rule on the seeded history (hand-computed values in history.fixture.ts).
const report = () => buyingRecommendations(seededHistory())
const ofType = <T extends BuyingRecommendation>(type: T['type']) => report().recommendations.filter((r): r is T => r.type === type)

describe('reorder', () => {
  it('reorders the grower: velocity 5 kg a day, lead time 5, safety stock 3.69 kg at Z 1.65, 15 on hand, 4 sacks to order', () => {
    const [r, ...rest] = ofType<ReorderRec>('reorder').filter((r) => r.productId === 'grower')
    expect(rest).toEqual([])
    expect(r).toMatchObject({
      type: 'reorder',
      productId: 'grower',
      priority: 'high',
      onHand: 15,
      velocityPerDay: 5,
      leadTimeDays: 5,
      safetyStock: 3.69,
      reorderPoint: 28.69,
      daysOfCover: 3,
      suggestedQty: 200,
      packs: '4 sacks',
    })
    expect(r.explanation.text).toContain('5 kg a day')
    expect(r.explanation.text).toContain('4 sacks')
    expect(r.explanation.assumptions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: 'Sales velocity', origin: 'history' }),
        expect.objectContaining({ label: 'Lead time', value: 5, origin: 'history' }),
        expect.objectContaining({ label: 'Service level Z', value: 1.65, source: 'SK-86', origin: 'research' }),
        expect.objectContaining({ label: 'Cover after the lead time', value: 30, source: 'assumption', origin: 'research' }),
      ]),
    )
  })

  it('leaves urea alone (10 bags on hand against a reorder point of 2.35) and uses the typed level for the five-day-old layer mash', () => {
    const recs = ofType<ReorderRec>('reorder')
    expect(recs.find((r) => r.productId === 'urea')).toBeUndefined()
    const mash = recs.find((r) => r.productId === 'mash')!
    expect(mash).toMatchObject({ priority: 'medium', onHand: 180, velocityPerDay: null, reorderPoint: 200, suggestedQty: 250, packs: '5 sacks' })
    expect(mash.explanation.text).toContain('level typed on the product')
    expect(mash.explanation.assumptions).toEqual(expect.arrayContaining([expect.objectContaining({ label: 'Reorder level', value: 200, origin: 'store' })]))
  })

  it('caps a perishable order at the shelf life left after the lead time, and the order quantity never falls when velocity rises', () => {
    const input = seededHistory()
    const grower = input.snapshots.find((s) => s.product.id === 'grower')!
    // Ten times the sales: 50 kg a day, uncapped order 50 x 35 + 36.89 - 15 = 1,771.89, the cap (40 - 5) x 50 = 1,750 -> 35 sacks
    grower.moves = grower.moves.map((m) => (m.reason === 'sale' ? { ...m, qtyDelta: m.qtyDelta * 10 } : m))
    const capped = buyingRecommendations(input).recommendations.find((r): r is ReorderRec => r.type === 'reorder' && r.productId === 'grower')!
    expect(capped.suggestedQty).toBe(1750)
    expect(capped.explanation.text).toContain('shelf life')
    let last = 0
    for (const factor of [1, 1.5, 2, 3, 5, 8, 10]) {
      // at half the velocity 15 kg is above the 14.35 reorder point and nothing fires, so the property starts at 1
      const scaled = seededHistory()
      const g = scaled.snapshots.find((s) => s.product.id === 'grower')!
      g.moves = g.moves.map((m) => (m.reason === 'sale' ? { ...m, qtyDelta: m.qtyDelta * factor } : m))
      const rec = buyingRecommendations(scaled).recommendations.find((r): r is ReorderRec => r.type === 'reorder' && r.productId === 'grower')!
      expect(rec.suggestedQty, `factor ${factor}`).toBeGreaterThanOrEqual(last)
      last = rec.suggestedQty
    }
  })

  it('explains a product it cannot place: no lead time for the vitamin supplier', () => {
    const notes = report().notes
    expect(notes.some((n) => n.text.includes('Vitamin-electrolyte sachet') && n.text.includes('lead time'))).toBe(true)
  })
})

describe('forward buy', () => {
  it('flags urea: 1,400 to 1,540 in two months is 5 percent a month against a 4.08 percent hurdle; ten bags for the extra month', () => {
    const [r, ...rest] = ofType<ForwardBuyRec>('forwardBuy')
    expect(rest).toEqual([])
    expect(r).toMatchObject({
      productId: 'urea',
      priority: 'medium',
      earlierPrice: 1400,
      latestPrice: 1540,
      spanDays: 60,
      monthlyRisePct: 5,
      hurdlePct: 4.08,
      extraMonths: 1,
      suggestedQty: 10,
      packs: '10 bag',
      estimatedGain: 449.17,
    })
    expect(r.explanation.assumptions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: 'Carrying cost', value: 25, source: 'FK-108', origin: 'research' }),
        expect.objectContaining({ label: 'Forward-buy risk margin', value: 2, source: 'BS-74', origin: 'research' }),
      ]),
    )
  })

  it('stays quiet below the hurdle and on a lot that would not outlive the extra month', () => {
    const flat = seededHistory()
    flat.priceLog = flat.priceLog.map((q) => ({ ...q, value: 1400 }))
    expect(buyingRecommendations(flat).recommendations.filter((r) => r.type === 'forwardBuy')).toEqual([])
    const short = seededHistory()
    const urea = short.snapshots.find((s) => s.product.id === 'urea')!
    urea.product = { ...urea.product, hasExpiry: true, lotShelfLifeDays: 20 }
    const rep = buyingRecommendations(short)
    expect(rep.recommendations.filter((r) => r.type === 'forwardBuy')).toEqual([])
    expect(rep.notes.some((n) => n.text.includes('Urea') && n.text.includes('shelf life'))).toBe(true)
  })
})

describe('stop buying', () => {
  it('lists the nozzle: ten pieces worth 800 with no sale since the receipt 152 days ago', () => {
    const [r, ...rest] = ofType<StopBuyingRec>('stopBuying')
    expect(rest).toEqual([])
    expect(r).toMatchObject({ productId: 'nozzle', priority: 'medium', onHand: 10, value: 800, daysSinceSale: null, daysSinceReceipt: 152, deadAfterDays: 90 })
    expect(r.explanation.assumptions).toEqual(expect.arrayContaining([expect.objectContaining({ label: 'Dead stock after', value: 90, source: 'SK-101' })]))
  })

  it('counts a perishable as dead when unsold within its shelf life', () => {
    const input = seededHistory()
    input.snapshots = input.snapshots.filter((s) => s.product.id === 'mash')
    const mash = input.snapshots[0]
    mash.moves = [move('mash', '2026-08-01', 200, 30, 'purchase', mash.lots[0].id)]
    mash.onHand = 200
    const [r] = buyingRecommendations(input).recommendations.filter((r): r is StopBuyingRec => r.type === 'stopBuying')
    expect(r).toMatchObject({ productId: 'mash', daysSinceReceipt: 60, deadAfterDays: 40 })
  })
})

describe('expiry clearance', () => {
  it('clears two bottles of the October lot at 504 (10 percent off, above the 448 cost): 1,008 recovered against an 896 write-off', () => {
    const [r, ...rest] = ofType<ClearanceRec>('clearance')
    expect(rest).toEqual([])
    expect(r).toMatchObject({
      productId: 'spray',
      priority: 'medium',
      qty: 4,
      expiryDate: '2026-10-31',
      daysToExpiry: 31,
      expectedSales: 2,
      excess: 2,
      currentPrice: 560,
      unitCost: 448,
      suggestedPrice: 504,
      recovery: 1008,
      writeOffValue: 896,
    })
    expect(r.explanation.assumptions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: 'Expiry warning window', value: 90, source: 'SK-115' }),
        expect.objectContaining({ label: 'Clearance markdown', value: 10, source: 'assumption' }),
      ]),
    )
  })

  it('never suggests a price below cost, whatever the markdown, and skips a lot that sells out in time', () => {
    for (const price of [560, 500, 460, 449, 448, 400]) {
      const input = seededHistory()
      const spray = input.snapshots.find((s) => s.product.id === 'spray')!
      spray.product = { ...spray.product, sellUnits: [{ unit: 'bottle', factor: 1, price }] }
      const rec = buyingRecommendations(input).recommendations.find((r): r is ClearanceRec => r.type === 'clearance')!
      expect(rec.suggestedPrice, `price ${price}`).toBeGreaterThanOrEqual(448)
      expect(rec.recovery, `price ${price}`).toBeGreaterThanOrEqual(rec.writeOffValue)
    }
    const brisk = seededHistory()
    const spray = brisk.snapshots.find((s) => s.product.id === 'spray')!
    for (let i = 0; i < 20; i++) spray.moves.push(move('spray', '2026-09-29', -0.1, 448, 'sale')) // 2 more bottles sold: velocity 8 in 90 days, 2.75 expected by expiry
    spray.moves.push(move('spray', '2026-09-29', -2, 448, 'sale', spray.lots[0].id))
    spray.moves = spray.moves.filter((m) => m.qtyDelta !== -0.1)
    spray.lots[0].qtyOnHand = 2
    expect(buyingRecommendations(brisk).recommendations.filter((r) => r.type === 'clearance')).toEqual([])
  })
})

describe('reprice', () => {
  it('lifts the vitamin from 40 to 48 for its 25 percent SKU target (cost 36, margin 10 percent) and leaves urea at 9.68 against 3.5', () => {
    const [r, ...rest] = ofType<RepriceRec>('reprice')
    expect(rest).toEqual([])
    expect(r).toMatchObject({
      productId: 'vitamin',
      priority: 'medium',
      unit: 'sachet',
      currentPrice: 40,
      unitCost: 36,
      marginPct: 10,
      targetPct: 25,
      suggestedPrice: 48,
    })
    expect(r.explanation.assumptions).toEqual(expect.arrayContaining([expect.objectContaining({ label: 'Target margin', value: 25, origin: 'store' })]))
  })

  it('names the categories with no target margin once, with the research bounds', () => {
    const note = report().notes.find((n) => n.text.includes('target margin'))!
    expect(note.text).toContain('Feeds')
    expect(note.text).toContain('Pesticides')
    expect(note.text).toContain('Tools')
    expect(note.text).not.toContain('Fertilizers')
    expect(note.assumptions).toEqual(expect.arrayContaining([expect.objectContaining({ source: 'SS-106' }), expect.objectContaining({ source: 'FK-16' })]))
  })
})
