import { CATEGORY_ORDER } from '../knowledge/categories'
import { defaultParameters, type ParameterKey, type StoreParameters } from '../knowledge/parameters'
import type { QuarterIndex } from '../knowledge/seasons'
import type { ProductCategory } from '../types'
import { db } from './db'
import { now } from './repo'

// The store parameters (P7 design decision 2): the settings row `parameters` holds only
// the keys the store has edited; loading lays them over the research defaults, so a
// default added by a later build shows through and an explanation can say which values
// are the store's own.

export const PARAMETERS_KEY = 'parameters'

export interface LoadedParameters {
  values: StoreParameters
  overridden: ParameterKey[]
}

const KEYS = Object.keys(defaultParameters()) as ParameterKey[]

async function storedOverrides(): Promise<Partial<StoreParameters>> {
  const row = await db.settings.get(PARAMETERS_KEY)
  return row && !row.deletedAt && row.value && typeof row.value === 'object' ? (row.value as Partial<StoreParameters>) : {}
}

function merge(overrides: Partial<StoreParameters>): LoadedParameters {
  const values = { ...defaultParameters(), ...overrides }
  return { values, overridden: Object.keys(overrides).filter((k) => KEYS.includes(k as ParameterKey)) as ParameterKey[] }
}

export async function loadParameters(): Promise<LoadedParameters> {
  return merge(await storedOverrides())
}

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const pct = (v: unknown, what: string) => {
  if (!isNum(v) || v < 0 || v > 100) throw new Error(`${what} must be a percentage between 0 and 100`)
}
const days = (v: unknown, what: string, min: number) => {
  if (!isNum(v) || !Number.isInteger(v) || v < min) throw new Error(`${what} must be a whole number of days, at least ${min}`)
}
const money = (v: unknown, what: string) => {
  if (!isNum(v) || v < 0) throw new Error(`${what} must be 0 or more`)
}
const perCategory = (v: unknown, what: string, check: (x: unknown, label: string) => void, all: boolean) => {
  if (!v || typeof v !== 'object') throw new Error(`${what} must be set per category`)
  const rec = v as Record<string, unknown>
  for (const k of Object.keys(rec)) {
    if (!CATEGORY_ORDER.includes(k as ProductCategory)) throw new Error(`${what}: ${k} is not a product category`)
    check(rec[k], `${what} for ${k}`)
  }
  if (all) for (const c of CATEGORY_ORDER) if (!(c in rec)) throw new Error(`${what} for ${c} is missing`)
}
const quarterIndex = (v: unknown, what: string) => {
  if (!Array.isArray(v) || v.length !== 4 || !v.every((x) => isNum(x) && x > 0)) throw new Error(`${what} needs four quarterly indices above 0`)
}

function validate(patch: Partial<StoreParameters>): void {
  for (const key of Object.keys(patch)) if (!KEYS.includes(key as ParameterKey)) throw new Error(`${key} is not a store parameter`)
  const p = patch
  if ('targetMarginPct' in p) perCategory(p.targetMarginPct, 'Target margin', pct, false)
  if ('carryingCostPctPerYear' in p) pct(p.carryingCostPctPerYear, 'Carrying cost')
  if ('fundingRatePctPerYear' in p) pct(p.fundingRatePctPerYear, 'Cost of money')
  if ('forwardBuyRiskMarginPts' in p) pct(p.forwardBuyRiskMarginPts, 'Forward-buy risk margin')
  if ('serviceLevelZ' in p && (!isNum(p.serviceLevelZ) || p.serviceLevelZ <= 0 || p.serviceLevelZ > 4))
    throw new Error('Service level Z must be above 0 and at most 4')
  if ('deadStockDays' in p) days(p.deadStockDays, 'Dead stock days', 1)
  if ('expiryWarningDays' in p) perCategory(p.expiryWarningDays, 'Expiry warning days', (x, l) => days(x, l, 0), true)
  if ('creditTermsDays' in p) days(p.creditTermsDays, 'Credit terms', 0)
  if ('latePaymentSharePct' in p) pct(p.latePaymentSharePct, 'Late payment share')
  if ('allowancePct' in p) {
    const a = p.allowancePct as Record<string, unknown> | undefined
    if (!a || typeof a !== 'object') throw new Error('Allowance percentages must be set per aging bucket')
    for (const b of ['current', 'd31', 'd61', 'd90']) pct(a[b], `Allowance for ${b}`)
  }
  if ('deliveryTripCost' in p) money(p.deliveryTripCost, 'Delivery trip cost')
  if ('seasonalIndex' in p) perCategory(p.seasonalIndex, 'Seasonal index', quarterIndex, true)
}

// Merges the patch into the stored overrides after validating it; the row carries the
// sync stamps like every other table.
export async function saveParameters(patch: Partial<StoreParameters>): Promise<LoadedParameters> {
  validate(patch)
  const next: Partial<StoreParameters> = { ...(await storedOverrides()) }
  for (const key of Object.keys(patch) as ParameterKey[]) {
    const v = patch[key]
    ;(next as Record<string, unknown>)[key] = Array.isArray(v) ? [...(v as QuarterIndex)] : v && typeof v === 'object' ? JSON.parse(JSON.stringify(v)) : v
  }
  await db.settings.put({ key: PARAMETERS_KEY, value: next, updatedAt: now(), deletedAt: null })
  return merge(next)
}

// Back to the research defaults: a tombstone, so a synced device drops its copy too.
export async function resetParameters(): Promise<void> {
  const stamp = now()
  await db.settings.put({ key: PARAMETERS_KEY, value: {}, updatedAt: stamp, deletedAt: stamp })
}
