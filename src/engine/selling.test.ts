import { describe, expect, it } from 'vitest'
import { seededSelling } from './history.fixture'
import {
  type BundleRec,
  type CreditRiskRec,
  type DeliveryRec,
  type SeasonalRec,
  type SellingRecommendation,
  sellingRecommendations,
  type TopCustomerRec,
} from './selling'

// Golden tests per selling rule on the seeded history (history.fixture.ts, seededSelling).
const report = () => sellingRecommendations(seededSelling())
const ofType = <T extends SellingRecommendation>(type: T['type']) => report().recommendations.filter((r): r is T => r.type === type)

describe('bundles', () => {
  it('pairs the grower with the vitamin sachet, bought together four times, with the 2 to 3 percent bundle discount rule', () => {
    const pairs = ofType<BundleRec>('bundle').filter((b) => b.kind === 'coPurchase')
    expect(pairs).toHaveLength(1)
    expect(pairs[0]).toMatchObject({
      kind: 'coPurchase',
      priority: 'medium',
      productIds: ['grower', 'vitamin'],
      timesTogether: 4,
      blendedMarginPct: 3.02,
      suggestedDiscountPct: 1.5,
    })
    expect(pairs[0].explanation.text).toContain('4 times')
    expect(pairs[0].explanation.assumptions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: 'Bundle discount', source: 'SS-109' }),
        expect.objectContaining({ label: 'Minimum co-purchases', value: 3, source: 'assumption' }),
      ]),
    )
  })

  it('suggests the hog programme pack from the stages the store carries and names the missing ones', () => {
    const programs = ofType<BundleRec>('bundle').filter((b) => b.kind === 'program')
    expect(programs).toHaveLength(1)
    expect(programs[0]).toMatchObject({
      kind: 'program',
      programId: 'hog-bmeg-expert',
      productIds: ['grower', 'finisher'],
      missingStages: ['preStarter', 'starter'],
    })
    expect(programs[0].explanation.text).toContain('113.4 kg')
    expect(programs[0].explanation.assumptions).toEqual(expect.arrayContaining([expect.objectContaining({ source: 'PK-32', origin: 'research' })]))
  })
})

describe('delivery threshold', () => {
  it('sets free delivery at 3,836.54 (trip 265 over a 6.91 percent margin) and shows the four delivered orders all below it', () => {
    const [r, ...rest] = ofType<DeliveryRec>('delivery')
    expect(rest).toEqual([])
    expect(r).toMatchObject({ tripCost: 265, marginPct: 6.91, threshold: 3836.54, deliveries: 4, belowThreshold: 4, avgFeeBelow: 75, suggestedFee: 265 })
    expect(r.explanation.assumptions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: 'Delivery trip cost', value: 265, source: 'SS-58', origin: 'research' }),
        expect.objectContaining({ label: 'Threshold rule', source: 'SS-60' }),
      ]),
    )
  })

  it('notes the missing margin when there are no sales yet', () => {
    const input = seededSelling()
    input.sales = []
    const rep = sellingRecommendations(input)
    expect(rep.recommendations.filter((r) => r.type === 'delivery')).toEqual([])
    expect(rep.notes.some((n) => n.text.includes('delivery threshold'))).toBe(true)
  })
})

describe('credit risk', () => {
  it('lists Nena: 4,000 past 30-day terms, 1,000 over her 5,000 limit, 370 expected loss; Ben stays off the list', () => {
    const [r, ...rest] = ofType<CreditRiskRec>('creditRisk')
    expect(rest).toEqual([])
    expect(r).toMatchObject({
      customerId: 'nena',
      priority: 'high',
      owed: 6000,
      overdue: 4000,
      creditLimit: 5000,
      overLimit: 1000,
      expectedLoss: 370,
      oldest: '2026-07-25',
    })
    expect(r.explanation.assumptions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: 'Credit terms', value: 30, source: 'SS-32' }),
        expect.objectContaining({ label: 'Allowance by bucket', source: 'FK-52' }),
      ]),
    )
  })
})

describe('top customers', () => {
  it('ranks Ben, Nena and Rosa by revenue in the window and flags Rosa idle for 72 days', () => {
    const recs = ofType<TopCustomerRec>('topCustomer')
    expect(recs.map((r) => [r.customerId, r.revenue, r.sharePct, r.daysSinceLast, r.idle])).toEqual([
      ['ben', 10420, 43.73, 10, false],
      ['nena', 7960, 33.4, 5, false],
      ['rosa', 1750, 7.34, 72, true],
    ])
    expect(recs[2].priority).toBe('medium')
    expect(recs[2].explanation.text).toContain('72 days')
    expect(recs[0].explanation.assumptions).toEqual(expect.arrayContaining([expect.objectContaining({ label: 'Suki reward', source: 'SS-108' })]))
  })
})

describe('seasonal push', () => {
  it('opens the events within four weeks with the products they move and their days of cover', () => {
    const recs = ofType<SeasonalRec>('seasonal')
    expect(recs.map((r) => [r.eventId, r.effect, r.products.map((p) => p.productId)])).toEqual([
      ['cornDryPlanting', 'demand', ['urea']],
      ['wetSeasonPests', 'demand', ['spray']],
      ['christmasHogs', 'demand', ['grower']],
      ['fertilizerLeanSeason', 'clearance', ['urea']],
    ])
    const hogs = recs.find((r) => r.eventId === 'christmasHogs')!
    // The finisher has never been stocked: a catalog line, counted rather than listed
    expect(hogs.products).toEqual([{ productId: 'grower', name: 'Expert Hog Grower mash', onHand: 15, daysOfCover: 3 }])
    expect(hogs.unstocked).toEqual(['Expert Hog Finisher mash'])
    expect(hogs.explanation.text).toContain('1 catalog line never stocked (Expert Hog Finisher mash)')
    expect(hogs.priority).toBe('high')
    expect(hogs.explanation.assumptions).toEqual(expect.arrayContaining([expect.objectContaining({ source: 'SS-24' })]))
    expect(recs.find((r) => r.eventId === 'cornDryPlanting')!.products[0].daysOfCover).toBe(30)
  })
})
