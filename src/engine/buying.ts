import type { LoadedParameters } from '../db/parameterRepo'
import { perBaseUnit } from '../db/priceLogRepo'
import { costState, type StockSnapshot } from '../db/stockRepo'
import { CATEGORY_DEFAULTS } from '../knowledge/categories'
import type { Assumption, Explanation } from '../knowledge/cite'
import { MARGIN_BOUNDS, parameterSource, RULE_DEFAULTS, type ParameterKey } from '../knowledge/parameters'
import type { ISODate, PriceObservation, Product, ProductCategory, StockLot, Supplier } from '../types'
import { daysBetween, plusDays } from './dates'
import { packLabel } from './inventory'

// The buying and stock rules of PLAN.md section 8 (TASK 001 step 7.2): pure functions over
// the stock snapshots, the supplier lead times, the price log and the store parameters.
// Every recommendation carries its explanation with the assumptions it used and where each
// came from (the research default, the store's setting or its own history).

export interface ProductSupply {
  productId: string
  supplierId?: string
  leadTimeDays?: number
  leadTimeLearned: boolean
}

export interface BuyingInput {
  today: ISODate
  snapshots: StockSnapshot[]
  suppliers: Supplier[]
  supply: ProductSupply[] // per product: the supplier of its latest purchase and that supplier's lead time
  priceLog: PriceObservation[] // supplierPrice observations
  parameters: LoadedParameters
}

export type Priority = 'high' | 'medium' | 'low'

interface RecBase {
  productId: string
  productName: string
  priority: Priority
  explanation: Explanation
}

export interface ReorderRec extends RecBase {
  type: 'reorder'
  onHand: number
  velocityPerDay: number | null // null when the typed reorder level was used
  leadTimeDays: number | null
  safetyStock: number | null
  reorderPoint: number
  daysOfCover: number | null
  suggestedQty: number // base units, rounded up to the pack
  packs: string
}

export interface ForwardBuyRec extends RecBase {
  type: 'forwardBuy'
  earlierPrice: number
  latestPrice: number
  spanDays: number
  monthlyRisePct: number
  hurdlePct: number
  extraMonths: number
  suggestedQty: number
  packs: string
  estimatedGain: number
}

export interface StopBuyingRec extends RecBase {
  type: 'stopBuying'
  onHand: number
  value: number
  daysSinceSale: number | null
  daysSinceReceipt: number | null
  deadAfterDays: number
}

export interface ClearanceRec extends RecBase {
  type: 'clearance'
  lotId: string
  qty: number
  expiryDate: ISODate
  daysToExpiry: number
  expectedSales: number
  excess: number
  currentPrice: number // per base unit
  unitCost: number
  suggestedPrice: number
  recovery: number
  writeOffValue: number
}

export interface RepriceRec extends RecBase {
  type: 'reprice'
  unit: string
  currentPrice: number
  unitCost: number // per sell unit
  marginPct: number
  targetPct: number
  suggestedPrice: number
}

export type BuyingRecommendation = ReorderRec | ForwardBuyRec | StopBuyingRec | ClearanceRec | RepriceRec

export interface BuyingReport {
  recommendations: BuyingRecommendation[]
  notes: Explanation[] // what the rules could not do and why
}

const round2 = (n: number) => Math.round(n * 100) / 100
const fmt = (n: number) => (Number.isInteger(n) ? String(n) : String(round2(n)))
const peso = (n: number) => '₱' + round2(n).toLocaleString('en-PH', { maximumFractionDigits: 2 })
const plural = (n: number, unit: string) => `${fmt(n)} ${unit}`

// Rounds up to whole packs of the largest sell unit, else to whole base units.
function toPack(qty: number, product: Product): number {
  const pack = [...product.sellUnits].filter((u) => u.factor > 1).sort((a, b) => b.factor - a.factor)[0]
  const factor = pack ? pack.factor : 1
  return Math.max(factor, Math.ceil(qty / factor - 1e-9) * factor)
}

// Price per base unit: the base-unit sell unit, else the largest pack divided by its factor.
function basePrice(product: Product): number {
  const unit =
    product.sellUnits.find((u) => u.factor === 1 && u.price > 0) ?? [...product.sellUnits].filter((u) => u.price > 0).sort((a, b) => b.factor - a.factor)[0]
  return unit ? round2(unit.price / unit.factor) : 0
}

// Sales over the velocity window: base units a day and the coefficient of variation of the
// daily series, or null when the history is shorter than the minimum.
export interface Velocity {
  perDay: number
  cv: number
  days: number
  sold: number
}

export function velocityOf(snap: StockSnapshot, today: ISODate): Velocity | null {
  const window = RULE_DEFAULTS.velocityWindowDays.value
  const firstIn = snap.moves
    .filter((m) => m.qtyDelta > 0)
    .map((m) => m.date)
    .sort()[0]
  if (!firstIn) return null
  const windowStart = plusDays(today, 1 - window)
  const start = firstIn > windowStart ? firstIn : windowStart
  const days = daysBetween(start, today) + 1
  if (days < RULE_DEFAULTS.minHistoryDays.value) return null
  const daily = new Array<number>(days).fill(0)
  for (const m of snap.moves) {
    if (m.reason !== 'sale' || m.date < start || m.date > today) continue
    daily[daysBetween(start, m.date)] += -m.qtyDelta
  }
  const sold = daily.reduce((a, b) => a + b, 0)
  const mean = sold / days
  const variance = daily.reduce((a, q) => a + (q - mean) ** 2, 0) / days
  return { perDay: mean, cv: mean > 0 ? Math.sqrt(variance) / mean : 0, days, sold }
}

class Ctx {
  constructor(readonly input: BuyingInput) {}
  get p() {
    return this.input.parameters.values
  }
  origin(key: ParameterKey): 'research' | 'store' {
    return this.input.parameters.overridden.includes(key) ? 'store' : 'research'
  }
  param(label: string, key: ParameterKey, category?: ProductCategory): Assumption {
    const cited = parameterSource(key, category)
    const raw = category ? (this.p[key] as Record<string, unknown>)[category] : this.p[key]
    const value = typeof raw === 'number' ? raw : JSON.stringify(raw)
    return { label, value, source: cited?.source ?? 'assumption', origin: this.origin(key) }
  }
  rule(label: string, key: keyof typeof RULE_DEFAULTS): Assumption {
    const c = RULE_DEFAULTS[key]
    return { label, value: c.value, source: c.source, origin: 'research' }
  }
  supplierName(id?: string): string {
    return (id && this.input.suppliers.find((s) => s.id === id)?.name) || 'the supplier'
  }
  supply(productId: string): ProductSupply | undefined {
    return this.input.supply.find((s) => s.productId === productId)
  }
}

function reorderRules(ctx: Ctx, out: BuyingRecommendation[], notes: Explanation[]) {
  const { today } = ctx.input
  for (const snap of ctx.input.snapshots) {
    const { product, onHand } = snap
    const unit = product.baseUnit
    const v = velocityOf(snap, today)
    if (!v) {
      // Under two weeks of history: the level typed on the product is the only trigger.
      if (product.reorderLevel > 0 && onHand <= product.reorderLevel) {
        const qty = toPack(product.reorderQty > 0 ? product.reorderQty : product.reorderLevel, product)
        out.push({
          type: 'reorder',
          productId: product.id,
          productName: product.name,
          priority: 'medium',
          onHand,
          velocityPerDay: null,
          leadTimeDays: null,
          safetyStock: null,
          reorderPoint: product.reorderLevel,
          daysOfCover: null,
          suggestedQty: qty,
          packs: packLabel(qty, product),
          explanation: {
            text: `${product.name}: ${plural(onHand, unit)} on hand is at or below the reorder level typed on the product (${plural(product.reorderLevel, unit)}). Order ${plural(qty, unit)} (${packLabel(qty, product)}). There is under ${RULE_DEFAULTS.minHistoryDays.value} days of stock history, so no sales velocity was used yet.`,
            assumptions: [
              { label: 'Reorder level', value: product.reorderLevel, source: 'assumption', origin: 'store' },
              { label: 'Reorder quantity', value: product.reorderQty, source: 'assumption', origin: 'store' },
              ctx.rule('Minimum history', 'minHistoryDays'),
            ],
          },
        })
      }
      continue
    }
    if (v.perDay <= 0) continue
    const supply = ctx.supply(product.id)
    const lt = supply?.leadTimeDays
    if (lt === undefined) {
      notes.push({
        text: `${product.name}: no reorder point can be set because no lead time is known for ${supply?.supplierId ? ctx.supplierName(supply.supplierId) : 'its supplier'}. Set the lead time on the supplier, or receive a purchase order so it is learned.`,
        assumptions: [{ label: 'Sales velocity', value: `${fmt(round2(v.perDay))} ${unit} a day`, source: 'FK-115', origin: 'history' }],
      })
      continue
    }
    const z = ctx.p.serviceLevelZ
    const safetyDays = z * v.cv * Math.sqrt(lt)
    const safety = safetyDays * v.perDay
    const rop = v.perDay * lt + safety
    if (onHand > rop) continue
    const cover = RULE_DEFAULTS.reorderCoverDays.value
    let raw = v.perDay * (lt + cover) + safety - onHand
    let capped = false
    if (product.hasExpiry && product.lotShelfLifeDays) {
      const cap = Math.max(0, (product.lotShelfLifeDays - lt) * v.perDay)
      if (raw > cap) {
        raw = cap
        capped = true
      }
    }
    const qty = toPack(raw, product)
    const packs = packLabel(qty, product)
    const daysOfCover = round2(onHand / v.perDay)
    const supplierName = ctx.supplierName(supply?.supplierId)
    out.push({
      type: 'reorder',
      productId: product.id,
      productName: product.name,
      priority: onHand <= v.perDay * lt ? 'high' : 'medium',
      onHand,
      velocityPerDay: round2(v.perDay),
      leadTimeDays: lt,
      safetyStock: round2(safety),
      reorderPoint: round2(rop),
      daysOfCover,
      suggestedQty: qty,
      packs,
      explanation: {
        text:
          `${product.name}: sold ${fmt(round2(v.perDay))} ${unit} a day over the last ${v.days} days. ${supplierName} takes ${lt} days, so the reorder point is ${plural(round2(rop), unit)} (${plural(round2(v.perDay * lt), unit)} for the lead time plus ${plural(round2(safety), unit)} of safety stock at Z ${z}). ` +
          `${plural(onHand, unit)} on hand covers ${fmt(daysOfCover)} days${onHand <= v.perDay * lt ? ', less than the lead time' : ''}. Order ${plural(qty, unit)} (${packs}) to cover the lead time and ${cover} days more` +
          `${capped ? `, capped by the shelf life left after the lead time (${product.lotShelfLifeDays} days)` : ''}.`,
        assumptions: [
          { label: 'Sales velocity', value: `${fmt(round2(v.perDay))} ${unit} a day over ${v.days} days`, source: 'FK-115', origin: 'history' },
          {
            label: 'Lead time',
            value: lt,
            source: supply?.leadTimeLearned ? 'assumption' : 'assumption',
            origin: supply?.leadTimeLearned ? 'history' : 'store',
          },
          ctx.param('Service level Z', 'serviceLevelZ'),
          {
            label: 'Safety stock',
            value: `${fmt(round2(safetyDays))} days (Z x CV x sqrt(lead time), CV ${fmt(round2(v.cv))})`,
            source: 'SK-117',
            origin: 'history',
          },
          ctx.rule('Cover after the lead time', 'reorderCoverDays'),
          ...(product.hasExpiry && product.lotShelfLifeDays
            ? [
                {
                  label: 'Perishable order cap',
                  value: `(shelf life ${product.lotShelfLifeDays} - lead time) x daily sales`,
                  source: 'SK-94',
                  origin: 'research' as const,
                },
              ]
            : []),
        ],
      },
    })
  }
}

function forwardBuyRules(ctx: Ctx, out: BuyingRecommendation[], notes: Explanation[]) {
  const { today } = ctx.input
  const windowStart = plusDays(today, 1 - RULE_DEFAULTS.velocityWindowDays.value)
  const carryingMonthly = ctx.p.carryingCostPctPerYear / 12
  const hurdle = carryingMonthly + ctx.p.forwardBuyRiskMarginPts
  const months = RULE_DEFAULTS.forwardBuyMonths.value
  for (const snap of ctx.input.snapshots) {
    const { product } = snap
    const quotes = ctx.input.priceLog
      .filter((q) => q.productId === product.id && q.kind === 'supplierPrice' && !q.deletedAt && q.date >= windowStart && q.date <= today)
      .sort((a, b) => a.date.localeCompare(b.date) || a.updatedAt.localeCompare(b.updatedAt))
    if (quotes.length < 2) continue
    const first = quotes[0]
    const last = quotes[quotes.length - 1]
    const spanDays = daysBetween(first.date, last.date)
    if (spanDays < RULE_DEFAULTS.minHistoryDays.value) continue
    const earlier = perBaseUnit(first, product)
    const latest = perBaseUnit(last, product)
    if (earlier <= 0) continue
    const monthlyRise = ((latest / earlier - 1) * 100) / (spanDays / 30)
    if (monthlyRise <= hurdle) continue
    const v = velocityOf(snap, today)
    if (!v || v.perDay <= 0) continue
    const lt = ctx.supply(product.id)?.leadTimeDays ?? 0
    if (product.hasExpiry && product.lotShelfLifeDays && product.lotShelfLifeDays < months * 30 + lt) {
      notes.push({
        text: `${product.name}: the supplier price rose ${fmt(round2(monthlyRise))} percent a month, above the ${fmt(round2(hurdle))} percent hurdle, but a lot keeps only ${product.lotShelfLifeDays} days and an extra month would outlive its shelf life. No forward buy.`,
        assumptions: [{ label: 'Lot shelf life', value: product.lotShelfLifeDays, source: 'assumption', origin: 'store' }],
      })
      continue
    }
    const qty = toPack(v.perDay * 30 * months, product)
    const gain = round2((qty * latest * (monthlyRise - carryingMonthly)) / 100)
    const packs = packLabel(qty, product)
    out.push({
      type: 'forwardBuy',
      productId: product.id,
      productName: product.name,
      priority: monthlyRise > 2 * hurdle ? 'high' : 'medium',
      earlierPrice: earlier,
      latestPrice: latest,
      spanDays,
      monthlyRisePct: round2(monthlyRise),
      hurdlePct: round2(hurdle),
      extraMonths: months,
      suggestedQty: qty,
      packs,
      estimatedGain: gain,
      explanation: {
        text:
          `${product.name}: ${ctx.supplierName(last.supplierId)}'s price went from ${peso(earlier)} to ${peso(latest)} per ${product.baseUnit} in ${spanDays} days, ${fmt(round2(monthlyRise))} percent a month. Holding stock costs ${fmt(round2(carryingMonthly))} percent a month plus a ${ctx.p.forwardBuyRiskMarginPts} point risk margin (${fmt(round2(hurdle))} percent), so buying ${months} month ahead pays. ` +
          `At ${fmt(round2(v.perDay))} ${product.baseUnit} a day that is ${plural(qty, product.baseUnit)} (${packs}) on top of the normal order, about ${peso(gain)} better than buying it next month if the rise holds.`,
        assumptions: [
          { label: 'Supplier price trend', value: `${peso(earlier)} to ${peso(latest)} over ${spanDays} days`, source: 'BS:5', origin: 'history' },
          ctx.param('Carrying cost', 'carryingCostPctPerYear'),
          ctx.param('Forward-buy risk margin', 'forwardBuyRiskMarginPts'),
          ctx.rule('Months bought ahead', 'forwardBuyMonths'),
          { label: 'Sales velocity', value: `${fmt(round2(v.perDay))} ${product.baseUnit} a day over ${v.days} days`, source: 'FK-115', origin: 'history' },
        ],
      },
    })
  }
}

function stopBuyingRules(ctx: Ctx, out: BuyingRecommendation[]) {
  const { today } = ctx.input
  for (const snap of ctx.input.snapshots) {
    const { product, onHand, moves } = snap
    if (onHand <= 0) continue
    const deadAfter = product.hasExpiry && product.lotShelfLifeDays ? Math.min(ctx.p.deadStockDays, product.lotShelfLifeDays) : ctx.p.deadStockDays
    const lastSale = moves
      .filter((m) => m.reason === 'sale')
      .map((m) => m.date)
      .sort()
      .pop()
    const firstReceipt = moves
      .filter((m) => m.qtyDelta > 0)
      .map((m) => m.date)
      .sort()[0]
    const daysSinceSale = lastSale ? daysBetween(lastSale, today) : null
    const daysSinceReceipt = firstReceipt ? daysBetween(firstReceipt, today) : null
    const idle = daysSinceSale ?? daysSinceReceipt
    if (idle === null || idle <= deadAfter) continue
    const value = round2(onHand * costState(moves).avgCost)
    out.push({
      type: 'stopBuying',
      productId: product.id,
      productName: product.name,
      priority: 'medium',
      onHand,
      value,
      daysSinceSale,
      daysSinceReceipt,
      deadAfterDays: deadAfter,
      explanation: {
        text: `${product.name}: ${plural(onHand, product.baseUnit)} worth ${peso(value)} at cost, ${daysSinceSale === null ? `never sold since the receipt ${daysSinceReceipt} days ago` : `no sale for ${daysSinceSale} days`}, past the ${deadAfter}-day dead-stock mark${
          deadAfter !== ctx.p.deadStockDays ? ' (its shelf life)' : ''
        }. Stop buying it; sell it down or clear it.`,
        assumptions: [
          ctx.param('Dead stock after', 'deadStockDays'),
          ...(deadAfter !== ctx.p.deadStockDays
            ? [{ label: 'Perishable dead stock', value: 'no sale within shelf life', source: 'SK-100', origin: 'research' as const }]
            : []),
        ],
      },
    })
  }
}

function clearanceRules(ctx: Ctx, out: BuyingRecommendation[]) {
  const { today } = ctx.input
  const markdown = RULE_DEFAULTS.clearanceMarkdownPct.value
  for (const snap of ctx.input.snapshots) {
    const { product } = snap
    const window = ctx.p.expiryWarningDays[product.category]
    if (!window) continue
    const v = velocityOf(snap, today)
    const perDay = v?.perDay ?? 0
    const price = basePrice(product)
    const lots = snap.lots
      .filter((l): l is StockLot & { expiryDate: ISODate } => !!l.expiryDate && l.qtyOnHand > 0)
      .sort((a, b) => a.expiryDate.localeCompare(b.expiryDate))
    let earlierQty = 0
    for (const lot of lots) {
      const daysToExpiry = daysBetween(today, lot.expiryDate)
      const sellable = Math.max(0, Math.floor(perDay * Math.max(0, daysToExpiry)) - earlierQty)
      earlierQty += lot.qtyOnHand
      if (daysToExpiry > window) continue
      const expected = Math.min(lot.qtyOnHand, sellable)
      const excess = round2(lot.qtyOnHand - expected)
      if (excess <= 0) continue
      const suggested = Math.max(lot.unitCost, round2(price * (1 - markdown / 100)))
      const recovery = round2(excess * suggested)
      const writeOff = round2(excess * lot.unitCost)
      out.push({
        type: 'clearance',
        productId: product.id,
        productName: product.name,
        priority: daysToExpiry <= window / 3 ? 'high' : 'medium',
        lotId: lot.id,
        qty: lot.qtyOnHand,
        expiryDate: lot.expiryDate,
        daysToExpiry,
        expectedSales: expected,
        excess,
        currentPrice: price,
        unitCost: lot.unitCost,
        suggestedPrice: suggested,
        recovery,
        writeOffValue: writeOff,
        explanation: {
          text:
            `${product.name}: a lot of ${plural(lot.qtyOnHand, product.baseUnit)} expires ${daysToExpiry < 0 ? `${-daysToExpiry} days ago` : `in ${daysToExpiry} days`} (${lot.expiryDate}). At ${fmt(round2(perDay))} ${product.baseUnit} a day about ${plural(expected, product.baseUnit)} will sell in time, leaving ${plural(excess, product.baseUnit)}. ` +
            `Mark the excess down to ${peso(suggested)} (${suggested > lot.unitCost ? `${markdown} percent off ${peso(price)}` : 'at cost'}) to recover ${peso(recovery)} instead of writing off ${peso(writeOff)}.`,
          assumptions: [
            ctx.param('Expiry warning window', 'expiryWarningDays', product.category),
            ctx.rule('Clearance markdown', 'clearanceMarkdownPct'),
            { label: 'Price floor', value: `cost ${peso(lot.unitCost)}: any price above it beats the write-off`, source: 'assumption', origin: 'research' },
            { label: 'Sales velocity', value: `${fmt(round2(perDay))} ${product.baseUnit} a day`, source: 'FK-115', origin: 'history' },
          ],
        },
      })
    }
  }
}

function repriceRules(ctx: Ctx, out: BuyingRecommendation[], notes: Explanation[]) {
  const missing = new Set<ProductCategory>()
  for (const snap of ctx.input.snapshots) {
    const { product, moves } = snap
    const skuTarget = product.targetMarginPct
    const target = skuTarget ?? ctx.p.targetMarginPct[product.category]
    if (target === undefined) {
      missing.add(product.category)
      continue
    }
    const avgCost = costState(moves).avgCost
    if (avgCost <= 0) continue
    for (const u of product.sellUnits) {
      if (u.price <= 0) continue
      const unitCost = round2(avgCost * u.factor)
      const marginPct = ((u.price - unitCost) / u.price) * 100
      if (marginPct >= target - 0.005) continue
      const suggested = Math.ceil(unitCost / (1 - target / 100))
      out.push({
        type: 'reprice',
        productId: product.id,
        productName: product.name,
        priority: marginPct < 0 ? 'high' : 'medium',
        unit: u.unit,
        currentPrice: u.price,
        unitCost,
        marginPct: round2(marginPct),
        targetPct: target,
        suggestedPrice: suggested,
        explanation: {
          text: `${product.name} per ${u.unit}: ${peso(u.price)} on a cost of ${peso(unitCost)} is a ${fmt(round2(marginPct))} percent margin against the ${target} percent target. ${peso(suggested)} reaches the target${marginPct < 0 ? '; at the current price every sale loses money' : ''}.`,
          assumptions: [
            skuTarget !== undefined
              ? { label: 'Target margin', value: skuTarget, source: 'assumption', origin: 'store' }
              : ctx.param('Target margin', 'targetMarginPct', product.category),
            { label: 'Weighted average cost', value: `${peso(avgCost)} per ${product.baseUnit}`, source: 'FK-01', origin: 'history' },
          ],
        },
      })
    }
  }
  if (missing.size > 0) {
    const names = [...missing].map((c) => CATEGORY_DEFAULTS[c].label)
    notes.push({
      text: `No target margin is set for ${names.join(', ')}, so the repricing rule skips them. The research has no sourced figure for these lines: enter one in Settings between the ${MARGIN_BOUNDS.floorPct.value} percent floor (fertilizer dealer practice) and the ${MARGIN_BOUNDS.ceilingPct.value} percent ceiling (the sector average).`,
      assumptions: [
        { label: 'Margin floor', value: MARGIN_BOUNDS.floorPct.value, source: MARGIN_BOUNDS.floorPct.source, origin: 'research' },
        { label: 'Margin ceiling', value: MARGIN_BOUNDS.ceilingPct.value, source: MARGIN_BOUNDS.ceilingPct.source, origin: 'research' },
      ],
    })
  }
}

export function buyingRecommendations(input: BuyingInput): BuyingReport {
  const ctx = new Ctx(input)
  const recommendations: BuyingRecommendation[] = []
  const notes: Explanation[] = []
  reorderRules(ctx, recommendations, notes)
  forwardBuyRules(ctx, recommendations, notes)
  stopBuyingRules(ctx, recommendations)
  clearanceRules(ctx, recommendations)
  repriceRules(ctx, recommendations, notes)
  const rank: Record<Priority, number> = { high: 0, medium: 1, low: 2 }
  recommendations.sort((a, b) => rank[a.priority] - rank[b.priority])
  return { recommendations, notes }
}
