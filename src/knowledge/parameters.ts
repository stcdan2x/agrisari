import type { ProductCategory } from '../types'
import { cite, type Cited } from './cite'
import { type QuarterIndex, SEASONAL_INDEX_DEFAULTS } from './seasons'

// The store parameters of PLAN.md section 8 with their research defaults (P7 design
// decision 2): the values live in the settings row `parameters` as the store's overrides,
// loaded over these defaults by src/db/parameterRepo.ts and edited in Settings. Every
// default carries its research row; a category with no sourced figure is left unset and
// the rule that needs it says so instead of guessing.

export interface AllowancePct {
  current: number
  d31: number
  d61: number
  d90: number
}

export interface StoreParameters {
  targetMarginPct: Partial<Record<ProductCategory, number>> // percent of selling price; a SKU's own targetMarginPct wins
  carryingCostPctPerYear: number
  fundingRatePctPerYear: number
  forwardBuyRiskMarginPts: number
  serviceLevelZ: number
  deadStockDays: number
  expiryWarningDays: Record<ProductCategory, number>
  creditTermsDays: number
  latePaymentSharePct: number
  allowancePct: AllowancePct
  deliveryTripCost: number
  seasonalIndex: Record<ProductCategory, QuarterIndex>
}

export type ParameterKey = keyof StoreParameters

export interface CitedParameters {
  targetMarginPct: Partial<Record<ProductCategory, Cited<number>>>
  carryingCostPctPerYear: Cited<number>
  fundingRatePctPerYear: Cited<number>
  forwardBuyRiskMarginPts: Cited<number>
  serviceLevelZ: Cited<number>
  deadStockDays: Cited<number>
  expiryWarningDays: Record<ProductCategory, Cited<number>>
  creditTermsDays: Cited<number>
  latePaymentSharePct: Cited<number>
  allowancePct: Cited<AllowancePct>
  deliveryTripCost: Cited<number>
  seasonalIndex: Record<ProductCategory, Cited<QuarterIndex>>
}

const feedWindow = (what: string) =>
  cite(30, 'SK-114', `${what}: compounded feed keeps 1 to 2 months in the tropics (SK-22), 60 days in the rainy season (SK-38)`)
const pesticideWindow = (what: string) => cite(90, 'SK-115', `${what}: 2-year shelf life from manufacture when the label is silent (SK-12)`)
const vetWindow = (what: string) => cite(90, 'SK-116', `${what}: short-dated first`)

export const PARAMETER_DEFAULTS: CitedParameters = {
  targetMarginPct: {
    fertilizer: cite(
      3.5,
      'SS-106',
      'the per-bag practice: PHP 35 on a PHP 995 urea bag (SS-100); feeds, agrochemicals, seeds and vet lines have no sourced figure and are user-entered between the 3.5 floor and the 25.05 sector ceiling (FK-16)',
    ),
  },
  carryingCostPctPerYear: cite(25, 'FK-108', 'mid-range of the derived build-up: 15 with an owned bodega to 32 rented; 2.08 percent per month (BS-73)'),
  fundingRatePctPerYear: cite(
    12,
    'FK-89',
    'SB Corp formal rate, diminishing; 2 (ANYO) and 30 (P3 via MFI) are the scenario alternatives; bank SME mid-point 10.7 (BS-86)',
  ),
  forwardBuyRiskMarginPts: cite(
    2,
    'BS-74',
    'the forward-buy signal fires when the expected rise over h months exceeds h x carrying cost per month plus this margin',
  ),
  serviceLevelZ: cite(
    1.65,
    'SK-86',
    '95 percent cycle service level; 1.28 for 90 (SK-85), 2.33 for 99 (SK-87); safety stock = Z x CV x sqrt(lead time) in days of demand (SK-117)',
  ),
  deadStockDays: cite(
    90,
    'SK-101',
    "no sale within a set period; the period is user-set in the research (open question), 90 is the app's starting value; perishables count as dead when unsold within shelf life (SK-100)",
  ),
  expiryWarningDays: {
    feed: feedWindow('feeds'),
    feedIngredient: feedWindow('feed ingredients'),
    pet: feedWindow('pet food'),
    seed: cite(90, 'SK-18', 'certification samples must be taken within 3 months of harvest; open lots checked monthly (SK-53)'),
    fertilizer: cite(0, 'assumption', 'inorganic fertilizer carries no expiry (PC section 10); 0 = no warning'),
    pesticide: pesticideWindow('pesticides'),
    disinfectant: pesticideWindow('disinfectants'),
    vetDrug: vetWindow('veterinary drugs'),
    vaccine: vetWindow('vaccines'),
    vitamin: vetWindow('vitamins and supplements'),
    tool: cite(0, 'assumption', 'no expiry; 0 = no warning'),
    equipment: cite(0, 'assumption', 'no expiry; 0 = no warning'),
    other: cite(0, 'assumption', 'no expiry by default; 0 = no warning'),
  },
  creditTermsDays: cite(
    30,
    'SS-32',
    'the current bucket of the aging (up to 30 days); production-cycle credit runs 3 to 4 months for hogs (SS-24) and about 6 months for rice, set per customer',
  ),
  latePaymentSharePct: cite(20, 'SS-16', 'input-dealer credit repaid on time 80 percent (SS-13); this is delay, not write-off'),
  allowancePct: cite(
    { current: 1, d31: 5, d61: 20, d90: 50 },
    'FK-52',
    "the WE-2 percentages by aging bucket are an assumption; IFRS 9 illustration 0.3, 1.6, 3.6, 6.6, 10.6 (SS-27 to SS-31); replace with the store's own write-off history",
  ),
  deliveryTripCost: cite(
    265,
    'SS-58',
    'a sedan-class trip of 10 km with four sacks on the Lalamove card; motorcycle with one parcel 104 (SS-57), L300 with twenty sacks 480 (SS-59)',
  ),
  seasonalIndex: SEASONAL_INDEX_DEFAULTS,
}

const strip = <T>(c: Cited<T>): T => c.value
const stripRecord = <K extends string, T>(r: Record<K, Cited<T>>): Record<K, T> =>
  Object.fromEntries(Object.entries<Cited<T>>(r).map(([k, c]) => [k, c.value])) as Record<K, T>

export function defaultParameters(): StoreParameters {
  const d = PARAMETER_DEFAULTS
  return {
    targetMarginPct: stripRecord(d.targetMarginPct as Record<string, Cited<number>>) as Partial<Record<ProductCategory, number>>,
    carryingCostPctPerYear: strip(d.carryingCostPctPerYear),
    fundingRatePctPerYear: strip(d.fundingRatePctPerYear),
    forwardBuyRiskMarginPts: strip(d.forwardBuyRiskMarginPts),
    serviceLevelZ: strip(d.serviceLevelZ),
    deadStockDays: strip(d.deadStockDays),
    expiryWarningDays: stripRecord(d.expiryWarningDays),
    creditTermsDays: strip(d.creditTermsDays),
    latePaymentSharePct: strip(d.latePaymentSharePct),
    allowancePct: { ...strip(d.allowancePct) },
    deliveryTripCost: strip(d.deliveryTripCost),
    seasonalIndex: stripRecord(d.seasonalIndex) as Record<ProductCategory, QuarterIndex>,
  }
}

// The source behind a parameter's default, for the explanation of a rule that used it.
export function parameterSource(key: ParameterKey, category?: ProductCategory): Cited<unknown> | undefined {
  const d = PARAMETER_DEFAULTS[key]
  if (key === 'targetMarginPct' || key === 'expiryWarningDays' || key === 'seasonalIndex') {
    return category ? (d as Record<string, Cited<unknown> | undefined>)[category] : undefined
  }
  return d as Cited<unknown>
}

// Labels and units for the Settings editor and the explanations.
export const PARAMETER_LABELS: Record<
  Exclude<ParameterKey, 'targetMarginPct' | 'expiryWarningDays' | 'seasonalIndex' | 'allowancePct'>,
  { label: string; unit: string }
> = {
  carryingCostPctPerYear: { label: 'Inventory carrying cost', unit: '% of stock value per year' },
  fundingRatePctPerYear: { label: 'Cost of money', unit: '% per year' },
  forwardBuyRiskMarginPts: { label: 'Forward-buy risk margin', unit: 'percentage points' },
  serviceLevelZ: { label: 'Service level (Z)', unit: '1.28 = 90%, 1.65 = 95%, 2.33 = 99%' },
  deadStockDays: { label: 'Dead stock after', unit: 'days without a sale' },
  creditTermsDays: { label: 'Credit terms', unit: 'days' },
  latePaymentSharePct: { label: 'Late payment share', unit: '% of credit paid late' },
  deliveryTripCost: { label: 'Delivery trip cost', unit: 'PHP per trip' },
}

// Bounds shown in the UI for the target margin (FK section 3): fertilizer practice as the
// floor, the sector average as the ceiling.
export const MARGIN_BOUNDS = {
  floorPct: cite(3.5, 'SS-106', 'fertilizer dealer practice'),
  ceilingPct: cite(25.05, 'FK-16', 'PSA ASPBI 2022 gross margin, retail of other goods in specialized stores'),
}

// Projection defaults for 7.4: the ramp curve, the sensitivity set and the operating cost
// figures a new store can start from.
export const RAMP_CURVE = cite<number[]>(
  [60.0, 63.6, 67.3, 70.9, 74.5, 78.2, 81.8, 85.5, 89.1, 92.7, 96.4, 100.0],
  'FK-113',
  'percent of steady-state sales, months 1 to 12, then 100; mean 80 (FK-111)',
)
export const RAMP_CURVE_SLOW = cite<number[]>(
  Array.from({ length: 24 }, (_, i) => Math.round((60 + (40 * i) / 23) * 10) / 10),
  'FK-112',
  'slow variant reaching 100 at month 24 for a market with an established competitor',
)
export const SENSITIVITY_SET = cite(
  [
    { id: 'sales-10', label: 'Sales -10%', salesPct: -10 },
    { id: 'sales-20', label: 'Sales -20%', salesPct: -20 },
    { id: 'purchase+10', label: 'Purchase prices +10%', purchasePct: 10 },
    { id: 'dso+15', label: 'Customers pay 15 days later', dsoDays: 15 },
    { id: 'baddebt-x2', label: 'Bad debt doubled', badDebtFactor: 2 },
    { id: 'rent+20', label: 'Rent +20%', rentPct: 20 },
  ],
  'FK-114',
  'the fixed set; purchase +10 on a 12 percent margin store leaves 3.2 percent',
)
export const OPEX_DEFAULTS = {
  helperPayPerMonth: cite(13650, 'FK-37', '525 x 26 paid days; add statutory employer shares and 13th month (about 1,137.50 per month)'),
  electricityPerMonth: cite(2956.66, 'FK-41', '200 kWh at 14.7833; the kWh is an assumption'),
  equipmentLifeYears: cite(5, 'FK-105', 'shelving, counters, refrigerator; small equipment 3 years; residual 5 percent (FK-103)'),
  motorcycleLifeYears: cite(5, 'FK-104', 'assumption pending the COA schedule'),
}

// Rule tunables for 7.2 and 7.3 that are not store parameters in v1: the engine reads them
// as they stand and every explanation cites them.
export const RULE_DEFAULTS = {
  velocityWindowDays: cite(90, 'FK-115', 'sales velocity and its variability are read over the last 90 days (the first-90-days baseline rule)'),
  minHistoryDays: cite(
    14,
    'assumption',
    'a product with under two weeks of stock history gets no velocity-based reorder; the level typed on the product applies instead',
  ),
  reorderCoverDays: cite(
    30,
    'assumption',
    'an order covers the lead time plus one month; fertilizer and seed one season (BS-75), pesticides at most a year (SK-15)',
  ),
  forwardBuyMonths: cite(1, 'BS:5', 'one extra month of fast movers at most on a feed notice; the fertilizer season ahead is strategy 2 on the Plan page'),
  minCoPurchases: cite(3, 'assumption', 'two products bought together at least three times in the window make a bundle suggestion (strategy 10)'),
  topCustomers: cite(5, 'assumption', 'the retention list shows the five customers with the most revenue in the window (strategy 7)'),
  retentionIdleDays: cite(30, 'assumption', 'a top customer with no purchase for a month is flagged for a visit or a call (strategy 7)'),
  seasonWeeksAhead: cite(
    4,
    'assumption',
    "seasonal reminders open four weeks before an event's lead window: stock arrives two to four weeks before the peak (strategy 13)",
  ),
  clearanceMarkdownPct: cite(
    10,
    'assumption',
    'dealers clear fertilizer at PHP 10 to 20 per bag (BS-11); ten percent off is the starting markdown for an expiring lot, never below cost',
  ),
}

// The scenario a new store starts from on the Plan page (7.4): the research's small-store
// worked example, every figure the owner's to change.
export const SCENARIO_DEFAULTS = {
  months: cite(24, 'assumption', 'two years shows the ramp year and the first full year; 12 to 36 allowed'),
  steadyStateSales: cite(300000, 'FK-79', "the worked examples' 300,000 a month is illustrative: enter the store's own figure"),
  grossMarginPct: cite(12, 'FK-114', 'the 12 percent margin store of the sensitivity example; a feed-heavy store sits near the fertilizer floor'),
  rent: cite(8000, 'FK-66', 'small store fixed costs, WE-5'),
  helper: cite(13650, 'FK-37', 'one helper at 525 a day x 26 paid days'),
  electricity: cite(2956.66, 'FK-41', '200 kWh at the Meralco rate'),
  otherFixed: cite(6500, 'FK-66', 'the other fixed items of WE-5: 3,000 + 1,000 + 1,500 + 1,000'),
  variableExpensePct: cite(1, 'assumption', 'QR Ph merchant fee of 1 percent as the variable cost of cashless sales'),
  salesTaxPct: cite(0, 'assumption', 'tax mode off; 3 percent of VATable sales in non-VAT mode (RT-78)'),
  creditSalesPct: cite(40, 'FK-79', 'the working-capital pin: 40 percent of sales on credit'),
  dsoDays: cite(30, 'SS-32', 'collections lag one aging bucket'),
  dpoDays: cite(15, 'FK-58', 'the WE-3 payables pin, 15.21 days'),
  dioDays: cite(30, 'FK-56', 'the WE-3 inventory pin, 30.42 days'),
  badDebtPct: cite(2, 'SS-33', 'the 2 percent planning input of the credit worked example; break-even 2.8'),
  openingCapital: cite(400000, 'FK-77', 'small counter store startup 364,545.72 before contingency, rounded up'),
}
