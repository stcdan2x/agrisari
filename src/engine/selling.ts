import type { CustomerAging } from '../db/paymentRepo'
import { costState } from '../db/stockRepo'
import type { Assumption, Explanation } from '../knowledge/cite'
import { parameterSource, RULE_DEFAULTS, type ParameterKey } from '../knowledge/parameters'
import { FEED_PROGRAMS } from '../knowledge/programs'
import { eventsFor, type SeasonEvent } from '../knowledge/seasons'
import type { Customer, FeedStage, ISODate, Product, Sale } from '../types'
import { type BuyingInput, type Priority, velocityOf } from './buying'
import { daysBetween, plusDays } from './dates'

// The selling rules of PLAN.md section 8 (TASK 001 step 7.3): bundles from co-purchases
// and the feed programmes, the free-delivery threshold, the credit-risk list, the top
// customers to retain, and the seasonal push and stock-up reminders. Pure functions over
// the buying input plus the sales, customers and receivables aging.

export interface SellingInput extends BuyingInput {
  sales: Sale[]
  customers: Customer[]
  aging: CustomerAging[] // open receivables per customer as of today
}

interface RecBase {
  priority: Priority
  explanation: Explanation
}

export interface BundleRec extends RecBase {
  type: 'bundle'
  kind: 'coPurchase' | 'program'
  title: string
  productIds: string[]
  timesTogether?: number
  blendedMarginPct?: number
  suggestedDiscountPct?: number
  programId?: string
  missingStages?: FeedStage[]
}

export interface DeliveryRec extends RecBase {
  type: 'delivery'
  tripCost: number
  marginPct: number
  threshold: number
  deliveries: number
  belowThreshold: number
  avgFeeBelow: number | null
  suggestedFee: number
}

export interface CreditRiskRec extends RecBase {
  type: 'creditRisk'
  customerId: string
  customerName: string
  owed: number
  overdue: number
  creditLimit: number | null
  overLimit: number
  expectedLoss: number
  oldest?: ISODate
}

export interface TopCustomerRec extends RecBase {
  type: 'topCustomer'
  customerId: string
  customerName: string
  rank: number
  revenue: number
  sharePct: number
  orders: number
  lastPurchase: ISODate
  daysSinceLast: number
  idle: boolean
}

export interface SeasonalProduct {
  productId: string
  name: string
  onHand: number
  daysOfCover: number | null
}

export interface SeasonalRec extends RecBase {
  type: 'seasonal'
  eventId: string
  name: string
  effect: SeasonEvent['effect']
  months: number[]
  leadWeeks: number
  products: SeasonalProduct[] // the lines the store stocks or has traded
  unstocked: string[] // catalog lines the event moves that the store has never stocked
}

export type SellingRecommendation = BundleRec | DeliveryRec | CreditRiskRec | TopCustomerRec | SeasonalRec

export interface SellingReport {
  recommendations: SellingRecommendation[]
  notes: Explanation[]
}

const round2 = (n: number) => Math.round(n * 100) / 100
const fmt = (n: number) => (Number.isInteger(n) ? String(n) : String(round2(n)))
const peso = (n: number) => '₱' + round2(n).toLocaleString('en-PH', { maximumFractionDigits: 2 })
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

const rule = (label: string, key: keyof typeof RULE_DEFAULTS): Assumption => ({
  label,
  value: RULE_DEFAULTS[key].value,
  source: RULE_DEFAULTS[key].source,
  origin: 'research',
})

function param(input: SellingInput, label: string, key: ParameterKey): Assumption {
  const raw = input.parameters.values[key]
  return {
    label,
    value: typeof raw === 'number' ? raw : JSON.stringify(raw),
    source: parameterSource(key)?.source ?? 'assumption',
    origin: input.parameters.overridden.includes(key) ? 'store' : 'research',
  }
}

const lineRevenue = (s: Sale) => s.lines.reduce((a, l) => a + l.qty * l.unitPrice, 0)
const lineCost = (s: Sale) => s.lines.reduce((a, l) => a + l.qty * l.unitCost, 0)

function windowSales(input: SellingInput): Sale[] {
  const start = plusDays(input.today, 1 - RULE_DEFAULTS.velocityWindowDays.value)
  return input.sales.filter((s) => !s.deletedAt && s.date >= start && s.date <= input.today)
}

// Current price and replayed average cost of one pack (the largest sell unit) of a product.
function packEconomics(input: SellingInput, id: string): { name: string; unit: string; price: number; cost: number } | null {
  const snap = input.snapshots.find((s) => s.product.id === id)
  if (!snap) return null
  const pack = [...snap.product.sellUnits].filter((u) => u.price > 0).sort((a, b) => b.factor - a.factor)[0]
  if (!pack) return null
  const avg = costState(snap.moves).avgCost
  return { name: snap.product.name, unit: pack.unit, price: pack.price, cost: round2(avg * pack.factor) }
}

function bundleRules(input: SellingInput, out: SellingRecommendation[]) {
  const min = RULE_DEFAULTS.minCoPurchases.value
  const pairs = new Map<string, number>()
  for (const s of windowSales(input)) {
    const ids = [...new Set(s.lines.map((l) => l.productId))].sort()
    for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) pairs.set(`${ids[i]}|${ids[j]}`, (pairs.get(`${ids[i]}|${ids[j]}`) ?? 0) + 1)
  }
  for (const [key, times] of [...pairs.entries()].sort((a, b) => b[1] - a[1])) {
    if (times < min) continue
    const [a, b] = key.split('|')
    const ea = packEconomics(input, a)
    const eb = packEconomics(input, b)
    if (!ea || !eb) continue
    const revenue = ea.price + eb.price
    const blended = ((revenue - ea.cost - eb.cost) / revenue) * 100
    const discount = Math.max(0, Math.min(3, Math.floor(blended / 2 / 0.5) * 0.5))
    out.push({
      type: 'bundle',
      kind: 'coPurchase',
      title: `${ea.name} + ${eb.name}`,
      priority: 'medium',
      productIds: [a, b],
      timesTogether: times,
      blendedMarginPct: round2(blended),
      suggestedDiscountPct: discount,
      explanation: {
        text:
          `${ea.name} and ${eb.name} were bought together ${times} times in the last ${RULE_DEFAULTS.velocityWindowDays.value} days. One ${ea.unit} plus one ${eb.unit} sells for ${peso(revenue)} on a cost of ${peso(ea.cost + eb.cost)}, a ${fmt(round2(blended))} percent blended margin. ` +
          (discount > 0
            ? `Offer them as a bundle at up to ${fmt(discount)} percent off (half the blended margin, never above the 2 to 3 percent rule), or give a free high-margin item instead of a price cut.`
            : `The blended margin leaves no room for a discount: bundle them with a freebie, not a price cut.`),
        assumptions: [
          rule('Minimum co-purchases', 'minCoPurchases'),
          { label: 'Bundle discount', value: '2 to 3 percent of the bundle price, within the blended margin', source: 'SS-109', origin: 'research' },
          {
            label: 'Pack cost',
            value: `${ea.name} ${peso(ea.cost)}, ${eb.name} ${peso(eb.cost)} at weighted average cost`,
            source: 'FK-01',
            origin: 'history',
          },
        ],
      },
    })
  }
  for (const program of FEED_PROGRAMS) {
    const covered: { stage: FeedStage; product: Product }[] = []
    const missing: FeedStage[] = []
    for (const stage of program.stages) {
      const product = input.snapshots
        .map((s) => s.product)
        .find((p) => p.category === 'feed' && p.species?.includes(program.species) && p.stage === stage.stage)
      if (product) covered.push({ stage: stage.stage, product })
      else if (!missing.includes(stage.stage)) missing.push(stage.stage)
    }
    const ids = [...new Set(covered.map((c) => c.product.id))]
    if (ids.length < 2) continue
    const stageText = program.stages.map((s) => `${s.label}: ${fmt(s.kgPerHead.value)} kg per head`).join('; ')
    out.push({
      type: 'bundle',
      kind: 'program',
      title: program.name,
      priority: 'low',
      productIds: ids,
      programId: program.id,
      missingStages: missing,
      explanation: {
        text:
          `${program.name}: sell the whole programme (${fmt(program.totalKgPerHead.value)} kg per head${program.per === 'month' ? ' per month' : ''}) instead of sacks. You carry ${covered.map((c) => c.product.name).join(' and ')}${missing.length > 0 ? `; the ${missing.join(', ')} stage${missing.length > 1 ? 's are' : ' is'} not in the catalog yet` : ''}. ` +
          `Stages: ${stageText}. Add-ons: ${program.addOns.map((a) => `${a.name} (${a.timing})`).join(', ') || 'none'}.`,
        assumptions: [
          { label: 'Feed per head', value: `${fmt(program.totalKgPerHead.value)} kg`, source: program.totalKgPerHead.source, origin: 'research' },
          ...program.stages.map((s) => ({
            label: s.label,
            value: `${fmt(s.kgPerHead.value)} kg per head`,
            source: s.kgPerHead.source,
            origin: 'research' as const,
          })),
        ],
      },
    })
  }
}

function deliveryRule(input: SellingInput, out: SellingRecommendation[], notes: Explanation[]) {
  const sales = windowSales(input)
  const revenue = sales.reduce((a, s) => a + lineRevenue(s), 0)
  const cost = sales.reduce((a, s) => a + lineCost(s), 0)
  const trip = input.parameters.values.deliveryTripCost
  if (revenue <= 0 || revenue <= cost) {
    notes.push({
      text: `No delivery threshold yet: the free-delivery point is the trip cost (${peso(trip)}) over the gross margin ratio, and there ${revenue <= 0 ? 'are no sales in the window' : 'is no gross margin in the window'} to read it from.`,
      assumptions: [
        param(input, 'Delivery trip cost', 'deliveryTripCost'),
        { label: 'Threshold rule', value: 'trip cost / gross margin percent', source: 'SS-60', origin: 'research' },
      ],
    })
    return
  }
  const margin = (revenue - cost) / revenue
  const threshold = round2(trip / margin)
  const delivered = sales.filter((s) => s.delivery)
  const below = delivered.filter((s) => lineRevenue(s) < threshold)
  const avgFeeBelow = below.length > 0 ? round2(below.reduce((a, s) => a + (s.delivery?.fee ?? 0), 0) / below.length) : null
  out.push({
    type: 'delivery',
    priority: below.length > 0 && (avgFeeBelow ?? 0) < trip ? 'medium' : 'low',
    tripCost: trip,
    marginPct: round2(margin * 100),
    threshold,
    deliveries: delivered.length,
    belowThreshold: below.length,
    avgFeeBelow,
    suggestedFee: trip,
    explanation: {
      text:
        `A delivery trip costs about ${peso(trip)} and the store's gross margin over the last ${RULE_DEFAULTS.velocityWindowDays.value} days is ${fmt(round2(margin * 100))} percent, so an order needs to reach ${peso(threshold)} before free delivery pays for itself. ` +
        `${delivered.length} order${delivered.length === 1 ? ' was' : 's were'} delivered in the window, ${below.length} below that line` +
        `${avgFeeBelow !== null ? `, charged ${peso(avgFeeBelow)} on average against the ${peso(trip)} trip` : ''}. Below the threshold charge the trip cost, or batch drops on a route day.`,
      assumptions: [
        param(input, 'Delivery trip cost', 'deliveryTripCost'),
        { label: 'Threshold rule', value: 'trip cost / gross margin percent', source: 'SS-60', origin: 'research' },
        { label: 'Fee below the threshold', value: 'the trip cost', source: 'SS-61', origin: 'research' },
        { label: 'Gross margin', value: `${fmt(round2(margin * 100))} percent on ${peso(revenue)} of sales`, source: 'FK-115', origin: 'history' },
      ],
    },
  })
}

function creditRiskRule(input: SellingInput, out: SellingRecommendation[]) {
  const p = input.parameters.values
  const terms = p.creditTermsDays
  for (const a of input.aging) {
    if (a.total <= 0) continue
    const overdue = round2(terms <= 30 ? a.d31 + a.d61 + a.d90 : terms <= 60 ? a.d61 + a.d90 : a.d90)
    const customer = input.customers.find((c) => c.id === a.customerId)
    const limit = customer?.creditLimit ?? null
    const overLimit = limit !== null && limit > 0 ? Math.max(0, round2(a.total - limit)) : 0
    if (overdue <= 0 && overLimit <= 0) continue
    const expectedLoss = round2(
      (a.current * p.allowancePct.current + a.d31 * p.allowancePct.d31 + a.d61 * p.allowancePct.d61 + a.d90 * p.allowancePct.d90) / 100,
    )
    const severe = a.d61 + a.d90 > 0 || overLimit > 0
    out.push({
      type: 'creditRisk',
      priority: severe ? 'high' : 'medium',
      customerId: a.customerId,
      customerName: a.name,
      owed: a.total,
      overdue,
      creditLimit: limit,
      overLimit,
      expectedLoss,
      ...(a.oldest ? { oldest: a.oldest } : {}),
      explanation: {
        text:
          `${a.name} owes ${peso(a.total)}: ${peso(a.current)} within ${terms} days, ${peso(a.d31)} at 31 to 60, ${peso(a.d61)} at 61 to 90, ${peso(a.d90)} over 90${a.oldest ? ` (oldest ${a.oldest})` : ''}. ` +
          `${peso(overdue)} is past the ${terms}-day terms${overLimit > 0 ? ` and the balance is ${peso(overLimit)} over the ${peso(limit ?? 0)} limit` : ''}; at the allowance rates about ${peso(expectedLoss)} may not come back. ` +
          `${severe ? 'Stop new credit until it is settled and collect in person' : 'Remind by text or a visit before the next sale'}.`,
        assumptions: [
          param(input, 'Credit terms', 'creditTermsDays'),
          {
            label: 'Allowance by bucket',
            value: `${p.allowancePct.current}, ${p.allowancePct.d31}, ${p.allowancePct.d61}, ${p.allowancePct.d90} percent`,
            source: parameterSource('allowancePct')?.source ?? 'assumption',
            origin: input.parameters.overridden.includes('allowancePct') ? 'store' : 'research',
          },
          ...(limit !== null ? [{ label: 'Credit limit', value: limit, source: 'assumption', origin: 'store' as const }] : []),
          { label: 'Collection practice', value: 'personal visit, then reminder, then the barangay', source: 'SS-21', origin: 'research' },
        ],
      },
    })
  }
}

function topCustomerRule(input: SellingInput, out: SellingRecommendation[]) {
  const sales = windowSales(input)
  const total = sales.reduce((a, s) => a + lineRevenue(s), 0)
  if (total <= 0) return
  const by = new Map<string, { revenue: number; orders: number; last: ISODate }>()
  for (const s of sales) {
    if (!s.customerId) continue
    const cur = by.get(s.customerId) ?? { revenue: 0, orders: 0, last: s.date }
    by.set(s.customerId, { revenue: cur.revenue + lineRevenue(s), orders: cur.orders + 1, last: s.date > cur.last ? s.date : cur.last })
  }
  const ranked = [...by.entries()].sort((a, b) => b[1].revenue - a[1].revenue).slice(0, RULE_DEFAULTS.topCustomers.value)
  ranked.forEach(([customerId, c], i) => {
    const name = input.customers.find((x) => x.id === customerId)?.name ?? customerId
    const days = daysBetween(c.last, input.today)
    const idle = days > RULE_DEFAULTS.retentionIdleDays.value
    out.push({
      type: 'topCustomer',
      priority: idle ? 'medium' : 'low',
      customerId,
      customerName: name,
      rank: i + 1,
      revenue: round2(c.revenue),
      sharePct: round2((c.revenue / total) * 100),
      orders: c.orders,
      lastPurchase: c.last,
      daysSinceLast: days,
      idle,
      explanation: {
        text:
          `${name} is number ${i + 1}: ${peso(c.revenue)} over ${c.orders} order${c.orders === 1 ? '' : 's'} in the last ${RULE_DEFAULTS.velocityWindowDays.value} days, ${fmt(round2((c.revenue / total) * 100))} percent of sales, last bought ${days === 0 ? 'today' : `${days} days ago`}. ` +
          (idle
            ? `Nothing for over ${RULE_DEFAULTS.retentionIdleDays.value} days: a visit or a call before the next production cycle starts elsewhere.`
            : `Keep the suki treatment non-price on thin-margin lines: first call on stock, credit priority, delivery priority, a freebie.`),
        assumptions: [
          rule('Retention list size', 'topCustomers'),
          rule('Idle after', 'retentionIdleDays'),
          { label: 'Suki reward', value: 'non-price by default; a discount only inside the line margin', source: 'SS-108', origin: 'research' },
        ],
      },
    })
  })
}

function matches(e: SeasonEvent, p: Product): boolean {
  const push = e.pushes
  if (push.categories && !push.categories.includes(p.category)) return false
  if (push.species && !p.species?.some((s) => push.species!.includes(s))) return false
  if (push.pesticideClass && (!p.pesticideClass || !push.pesticideClass.includes(p.pesticideClass))) return false
  if (push.stages && (!p.stage || !push.stages.includes(p.stage))) return false
  return true
}

function seasonalRule(input: SellingInput, out: SellingRecommendation[], notes: Explanation[]) {
  const month = Number(input.today.slice(5, 7))
  const ahead = RULE_DEFAULTS.seasonWeeksAhead.value
  for (const e of eventsFor(month, ahead, 'all')) {
    const products: SeasonalProduct[] = []
    const unstocked: string[] = []
    for (const snap of input.snapshots) {
      if (!matches(e, snap.product)) continue
      // A catalog line never stocked or traded is counted, not listed: the seeded catalog would bury the rest.
      if (snap.onHand <= 0 && snap.moves.length === 0) {
        unstocked.push(snap.product.name)
        continue
      }
      const v = velocityOf(snap, input.today)
      products.push({
        productId: snap.product.id,
        name: snap.product.name,
        onHand: snap.onHand,
        daysOfCover: v && v.perDay > 0 ? round2(snap.onHand / v.perDay) : null,
      })
    }
    if (products.length === 0 && unstocked.length === 0) continue
    const monthNames = e.months.map((m) => MONTHS[m - 1]).join(', ')
    const stocked = products
      .map((p) => `${p.name} (${fmt(p.onHand)} on hand${p.daysOfCover !== null ? `, ${fmt(p.daysOfCover)} days of cover` : ''})`)
      .join('; ')
    const never =
      unstocked.length > 0
        ? `${unstocked.length} catalog line${unstocked.length === 1 ? '' : 's'} never stocked (${unstocked.slice(0, 3).join(', ')}${unstocked.length > 3 ? ' and more' : ''})`
        : ''
    const list = [products.length > 0 ? stocked : 'none of the lines it moves', never].filter(Boolean).join('; ')
    if (e.effect === 'displaces') {
      if (products.length === 0) continue
      notes.push({
        text: `${e.name} (${monthNames}): ${e.note}. Affected: ${stocked}.`,
        assumptions: [{ label: e.name, value: monthNames, source: e.source, origin: 'research' }],
      })
      continue
    }
    const horizon = (e.leadWeeks + ahead) * 7
    const short = products.some((p) => (p.daysOfCover !== null && p.daysOfCover < horizon) || p.onHand <= 0)
    out.push({
      type: 'seasonal',
      priority: e.effect === 'clearance' ? 'medium' : products.length === 0 ? 'low' : short ? 'high' : 'medium',
      eventId: e.id,
      name: e.name,
      effect: e.effect,
      months: e.months,
      leadWeeks: e.leadWeeks,
      products,
      unstocked,
      explanation: {
        text:
          e.effect === 'clearance'
            ? `${e.name} (${monthNames}): ${e.note}. Run down ${list} rather than carry it through the lean months.`
            : `${e.name} (${monthNames}): ${e.note}. Stock should be on the shelf ${e.leadWeeks} weeks ahead. You carry ${list}${short ? '; the cover is short of the window' : ''}.`,
        assumptions: [
          { label: e.name, value: monthNames, source: e.source, origin: 'research' },
          rule('Reminder opens', 'seasonWeeksAhead'),
          { label: 'Days of cover', value: 'stock on hand over the 90-day sales velocity', source: 'FK-115', origin: 'history' },
        ],
      },
    })
  }
}

export function sellingRecommendations(input: SellingInput): SellingReport {
  const recommendations: SellingRecommendation[] = []
  const notes: Explanation[] = []
  bundleRules(input, recommendations)
  deliveryRule(input, recommendations, notes)
  creditRiskRule(input, recommendations)
  topCustomerRule(input, recommendations)
  seasonalRule(input, recommendations, notes)
  return { recommendations, notes }
}
