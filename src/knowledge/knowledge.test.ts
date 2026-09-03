import { describe, expect, it } from 'vitest'
import type { Product } from '../types'
import { CATEGORY_ORDER } from './categories'
import type { Cited } from './cite'
import { SOURCE_DOCS } from './cite'
import {
  defaultParameters,
  MARGIN_BOUNDS,
  OPEX_DEFAULTS,
  PARAMETER_DEFAULTS,
  parameterSource,
  RAMP_CURVE,
  RAMP_CURVE_SLOW,
  RULE_DEFAULTS,
  SCENARIO_DEFAULTS,
  SENSITIVITY_SET,
} from './parameters'
import { CROP_INPUTS, cropNeeds, FEED_PROGRAMS, programNeeds } from './programs'
import { ATTRIBUTE_INDEXES, demandIndex, eventsFor, SEASON_EVENTS, SEASONAL_INDEX_DEFAULTS } from './seasons'
import { STRATEGIES, strategyById } from './strategies'

// The knowledge modules are compiled research data (TDD exclusion, decision 11): these
// tests check shape and citation, not the figures. A source must be a parameter row id
// that exists in research/parameters.md, a section of a research document that exists,
// or 'assumption' with a note that says so.

// The research documents, read as text at test time (never bundled: only this test imports them).
const RESEARCH = import.meta.glob('../../research/*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>
const research = (name: string) => RESEARCH[`../../research/${name}.md`]
const rowIds = new Set([...research('parameters').matchAll(/^\| [a-z-]+ \| ([A-Z]{2}-\d+) \|/gm)].map((m) => m[1]))
const headingsOf = (prefix: string) => research(SOURCE_DOCS[prefix])

function checkSource(source: string, note: string | undefined, where: string) {
  if (source === 'assumption') {
    expect(note, `${where}: an assumption needs a note`).toBeTruthy()
    return
  }
  const section = source.match(/^([A-Z]{2}):(\d+)$/)
  if (section) {
    expect(SOURCE_DOCS[section[1]], `${where}: unknown document ${section[1]}`).toBeTruthy()
    expect(headingsOf(section[1]).includes(`\n## ${section[2]}. `), `${where}: section ${source} not found`).toBe(true)
    return
  }
  expect(source, `${where}: source must be a row id, a section or 'assumption'`).toMatch(/^[A-Z]{2}-\d+$/)
  expect(rowIds.has(source), `${where}: row ${source} is not in research/parameters.md`).toBe(true)
}

// Walks any value, checking every { value, source } it finds and every `source` string on a plain object.
function checkCitations(node: unknown, where: string) {
  if (!node || typeof node !== 'object') return
  if (Array.isArray(node)) return node.forEach((n, i) => checkCitations(n, `${where}[${i}]`))
  const o = node as Record<string, unknown>
  if ('source' in o && typeof o.source === 'string') checkSource(o.source, typeof o.note === 'string' ? o.note : undefined, where)
  for (const [k, v] of Object.entries(o)) if (k !== 'matches') checkCitations(v, `${where}.${k}`)
}

describe('knowledge citations', () => {
  it('reads the 1046 parameter rows of research/parameters.md', () => {
    expect(rowIds.size).toBe(1046)
    expect(rowIds.has('FK-108')).toBe(true)
  })

  it('every parameter default, projection default, seasonal index, event, program, crop input and strategy resolves its source', () => {
    checkCitations(PARAMETER_DEFAULTS, 'PARAMETER_DEFAULTS')
    checkCitations(
      { MARGIN_BOUNDS, RAMP_CURVE, RAMP_CURVE_SLOW, SENSITIVITY_SET, OPEX_DEFAULTS, RULE_DEFAULTS, SCENARIO_DEFAULTS },
      'projection and rule defaults',
    )
    checkCitations(SEASONAL_INDEX_DEFAULTS, 'SEASONAL_INDEX_DEFAULTS')
    checkCitations(ATTRIBUTE_INDEXES, 'ATTRIBUTE_INDEXES')
    checkCitations(SEASON_EVENTS, 'SEASON_EVENTS')
    checkCitations(FEED_PROGRAMS, 'FEED_PROGRAMS')
    checkCitations(CROP_INPUTS, 'CROP_INPUTS')
    for (const s of STRATEGIES) {
      const doc = headingsOf(s.doc)
      for (const ref of s.sources) expect(doc.includes(`[${ref}]`), `${s.id}: ${ref} not cited in ${s.doc}`).toBe(true)
    }
  })
})

describe('parameters', () => {
  it('has a cited default for every key and category, fertilizer as the only sourced target margin', () => {
    const d = defaultParameters()
    expect(Object.keys(d).sort()).toEqual(Object.keys(PARAMETER_DEFAULTS).sort())
    expect(d.targetMarginPct).toEqual({ fertilizer: 3.5 })
    for (const c of CATEGORY_ORDER) {
      expect(typeof d.expiryWarningDays[c]).toBe('number')
      expect(d.seasonalIndex[c]).toHaveLength(4)
    }
    expect(parameterSource('carryingCostPctPerYear')).toMatchObject({ value: 25, source: 'FK-108' })
    expect(parameterSource('targetMarginPct', 'fertilizer')).toMatchObject({ value: 3.5, source: 'SS-106' })
    expect(parameterSource('targetMarginPct', 'feed')).toBeUndefined()
    expect(parameterSource('seasonalIndex', 'pesticide')).toMatchObject({ source: 'PM-127' })
    expect(MARGIN_BOUNDS.floorPct.value).toBeLessThan(MARGIN_BOUNDS.ceilingPct.value)
  })

  it('pins the ramp curves to the research: 12 months to 100, the slow variant 24, and the six sensitivities', () => {
    expect(RAMP_CURVE.value).toHaveLength(12)
    expect(RAMP_CURVE.value[0]).toBe(60)
    expect(RAMP_CURVE.value[11]).toBe(100)
    expect(RAMP_CURVE_SLOW.value).toHaveLength(24)
    expect(RAMP_CURVE_SLOW.value[0]).toBe(60)
    expect(RAMP_CURVE_SLOW.value[23]).toBe(100)
    expect(SENSITIVITY_SET.value.map((s) => s.id)).toEqual(['sales-10', 'sales-20', 'purchase+10', 'dso+15', 'baddebt-x2', 'rent+20'])
  })
})

describe('seasons', () => {
  const product = (over: Partial<Product>): Product =>
    ({
      id: 'p',
      name: 'x',
      category: 'feed',
      baseUnit: 'kg',
      sellUnits: [],
      repackable: false,
      vatExempt: true,
      licenceClass: 'none',
      coldChain: false,
      hasExpiry: false,
      reorderLevel: 0,
      reorderQty: 0,
      updatedAt: '',
      ...over,
    }) as Product

  it('category indices average 1.00 over the year (the sourced feed row 3.99 as published) and the feed row matches PM-125', () => {
    for (const c of CATEGORY_ORDER) {
      const sum = SEASONAL_INDEX_DEFAULTS[c].value.reduce((a, b) => a + b, 0)
      expect(Math.abs(sum - 4), c).toBeLessThanOrEqual(0.01)
    }
    expect(SEASONAL_INDEX_DEFAULTS.feed.value).toEqual([0.97, 0.96, 0.99, 1.07])
    for (const a of ATTRIBUTE_INDEXES) expect(Math.round(a.index.value.reduce((x, y) => x + y, 0) * 100) / 100, a.id).toBe(4)
  })

  it('picks the attribute refinement before the category index and cites it', () => {
    const idx = defaultParameters().seasonalIndex
    expect(demandIndex(product({ category: 'pesticide', pesticideClass: 'herbicide' }), idx, 5)).toMatchObject({
      index: 1.25,
      label: 'Herbicides',
      year: { source: 'PM:11' },
    })
    expect(demandIndex(product({ category: 'pesticide', pesticideClass: 'fungicide' }), idx, 8)).toMatchObject({
      index: 1.35,
      label: 'pesticide',
      year: { source: 'PM-127' },
    })
    expect(demandIndex(product({ category: 'seed', crops: ['tomato'] }), idx, 11)).toMatchObject({ index: 1.25, label: 'Vegetable seed' })
    expect(demandIndex(product({ category: 'seed', crops: ['rice'] }), idx, 11)).toMatchObject({ index: 1.2, label: 'seed' })
    expect(demandIndex(product({ category: 'feed', species: ['gamefowl'] }), idx, 1)).toMatchObject({ index: 1.1, label: 'Gamefowl feed and supplements' })
    expect(demandIndex(product({ category: 'tool' }), idx, 1)).toMatchObject({ index: 1, year: { source: 'assumption' } })
  })

  it('lists the events whose lead window opens within the weeks ahead, filtered by region', () => {
    const ids = (month: number, weeks: number, region?: 'luzon' | 'visayas' | 'mindanao') => eventsFor(month, weeks, region).map((e) => e.id)
    // October, four weeks ahead: the dry-season plantings, the cool-season vegetables, the Christmas livestock, the derbies and the clearance at harvest; not the wet season
    expect(ids(10, 4, 'luzon')).toEqual([
      'riceDryPlanting',
      'cornDryPlanting',
      'herbicideAfterPlanting',
      'vegetableCoolSeason',
      'christmasBroilers',
      'christmasHogs',
      'cockDerbies',
      'stagSeason',
      'fertilizerLeanSeason',
    ])
    expect(ids(10, 2, 'luzon')).not.toContain('christmasBroilers') // chicks go in the first half of November: not yet
    expect(ids(10, 4, 'mindanao')).not.toContain('riceDryPlanting')
    expect(ids(6, 2)).toContain('wetSeasonPests') // July is 4.3 weeks off, the lead is 3
    expect(ids(6, 0)).not.toContain('wetSeasonPests')
    expect(SEASON_EVENTS.map((e) => e.id).length).toBe(new Set(SEASON_EVENTS.map((e) => e.id)).size)
    for (const e of SEASON_EVENTS)
      expect(
        e.months.every((m) => m >= 1 && m <= 12),
        e.id,
      ).toBe(true)
  })
})

describe('programs', () => {
  it('stage totals agree with the cited program totals within rounding and every program names a species and stages', () => {
    for (const p of FEED_PROGRAMS) {
      expect(p.stages.length, p.id).toBeGreaterThan(0)
      const sum = p.stages.reduce((a, s) => a + s.kgPerHead.value, 0)
      if (p.per === 'cycle') expect(Math.abs(sum - p.totalKgPerHead.value) / p.totalKgPerHead.value, `${p.id} total`).toBeLessThan(0.01)
    }
    expect(FEED_PROGRAMS.map((p) => p.id)).toEqual([
      'broiler-da',
      'broiler-unifeeds',
      'layer-pullet',
      'layer-hen',
      'hog-bmeg-expert',
      'sow-cycle',
      'gamefowl-stag',
      'gamefowl-maintenance',
      'duck-layer',
      'quail-layer',
    ])
    expect(programNeeds(FEED_PROGRAMS[0], 100).map((n) => [n.stage.stage, n.kg])).toEqual([
      ['booster', 7],
      ['starter', 126],
      ['finisher', 126],
    ])
    expect(programNeeds(FEED_PROGRAMS[4], 10).map((n) => n.kg)).toEqual([132, 297, 1134, 729])
  })

  it('crop inputs give per-hectare quantities in the product category the store sells', () => {
    expect(CROP_INPUTS.map((c) => c.id)).toEqual(['rice-inbred-ws', 'rice-inbred-ds', 'rice-hybrid', 'corn-da', 'tomato', 'ampalaya', 'eggplant'])
    for (const c of CROP_INPUTS) for (const i of c.items) expect(['seed', 'fertilizer', 'pesticide'], `${c.id} ${i.name}`).toContain(i.category)
    expect(cropNeeds(CROP_INPUTS[0], 2).map((n) => [n.item.name, n.qty, n.item.unit])).toEqual([
      ['Certified inbred seed', 80, 'kg'],
      ['Complete 14-14-14(-12S)', 8, 'bag'],
      ['Urea', 6, 'bag'],
    ])
  })
})

describe('strategy catalog', () => {
  it('holds the 15 + 4 entries of PLAN.md section 9 as P1 extended them, every field filled', () => {
    expect(STRATEGIES).toHaveLength(19)
    expect(STRATEGIES.map((s) => s.number)).toEqual(['1', '2', '3', '4', '5', '6', '6a', '6b', '7', '8', '9', '10', '11', '12', '13', '14', '15', '15a', '15b'])
    expect(new Set(STRATEGIES.map((s) => s.id)).size).toBe(19)
    expect(STRATEGIES.filter((s) => s.side === 'buying')).toHaveLength(8)
    expect(STRATEGIES.filter((s) => s.side === 'selling')).toHaveLength(11)
    const keys = Object.keys(defaultParameters())
    for (const s of STRATEGIES) {
      expect(s.title.length, `${s.id}.title`).toBeGreaterThan(5)
      for (const f of ['description', 'cashCycle', 'costStructure', 'revenueUnit', 'whenItWins', 'whenItLoses', 'risks', 'records'] as const)
        expect(s[f].length, `${s.id}.${f}`).toBeGreaterThan(20)
      expect(s.sources.length, s.id).toBeGreaterThan(0)
      for (const p of s.parameters) expect(keys, `${s.id} parameter ${p}`).toContain(p)
      expect(s.doc).toBe(s.side === 'buying' ? 'BS' : 'SS')
    }
    expect(strategyById('buy-2-forward-buying')?.parameters).toContain('forwardBuyRiskMarginPts')
    expect(strategyById('nope')).toBeUndefined()
  })
})

// Type-level check that Cited stays the shape the engine reads.
const _shape: Cited<number> = PARAMETER_DEFAULTS.carryingCostPctPerYear
void _shape
