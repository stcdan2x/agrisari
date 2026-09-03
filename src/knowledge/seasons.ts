import type { PesticideClass, Product, ProductCategory, Species } from '../types'
import { cite, type Cited } from './cite'

// The seasonal calendar of research/philippine-market-and-seasonality.md (sections 3 to 6
// and 11) compiled for the engine: demand indices by quarter per category, the attribute
// refinements the section 11 table gives below category level, and the dated events that
// drive the seasonal push and stock-up reminders (7.2 and 7.3). The feed row is sourced
// arithmetic; the calendar rows are the research's own defaults, to be replaced by the
// store's sales history after its first year (PM-126 note).

export type QuarterIndex = [q1: number, q2: number, q3: number, q4: number]

const FLAT: QuarterIndex = [1, 1, 1, 1]
const flat = (what: string) =>
  cite<QuarterIndex>(FLAT, 'assumption', `no seasonal series for ${what} in the research; flat until the store has a year of sales`)

export const SEASONAL_INDEX_DEFAULTS: Record<ProductCategory, Cited<QuarterIndex>> = {
  feed: cite([0.97, 0.96, 0.99, 1.07], 'PM-125', 'from the PSA slaughter volume index; feed is consumed 1 to 6 months before slaughter'),
  feedIngredient: cite([0.97, 0.96, 0.99, 1.07], 'PM-125', 'follows feed'),
  seed: cite([0.75, 1.35, 0.7, 1.2], 'PM-126', 'two planting peaks, May to July and October to December, Luzon-weighted; calendar-based'),
  fertilizer: cite([0.85, 1.25, 0.8, 1.1], 'PM-126', 'basal at planting plus topdressing 3 to 6 weeks later; calendar-based'),
  pesticide: cite([0.85, 0.9, 1.35, 0.9], 'PM-127', 'wet-season pest pressure July to September; calendar-based'),
  disinfectant: cite([0.85, 0.9, 1.35, 0.9], 'PM-127', 'follows pesticide: wet-season disease pressure'),
  pet: cite([0.97, 0.96, 0.99, 1.07], 'PM-125', 'pet food is a specialty feed; follows feed'),
  tool: flat('tools'),
  equipment: flat('equipment'),
  vetDrug: flat('veterinary drugs'),
  vaccine: flat('vaccines'),
  vitamin: flat('vitamins and supplements'),
  other: flat('other products'),
}

// Refinements below category level from the section 11 table (no row ids of their own).
export interface AttributeIndex {
  id: string
  label: string
  index: Cited<QuarterIndex>
  matches: (p: Product) => boolean
}

const GRAIN_CROPS = ['rice', 'palay', 'corn', 'maize']
const isVegetableSeed = (p: Product) => p.category === 'seed' && !!p.crops?.length && !p.crops.some((c) => GRAIN_CROPS.some((g) => c.toLowerCase().includes(g)))

export const ATTRIBUTE_INDEXES: AttributeIndex[] = [
  {
    id: 'herbicide',
    label: 'Herbicides',
    index: cite([0.8, 1.25, 0.85, 1.1], 'PM:11', '2 to 3 weeks after each planting peak'),
    matches: (p) => p.category === 'pesticide' && p.pesticideClass === 'herbicide',
  },
  {
    id: 'vegetableSeed',
    label: 'Vegetable seed',
    index: cite([1.1, 0.85, 0.8, 1.25], 'PM:11', 'cool-season crops planted October to January, all-season crops flat'),
    matches: isVegetableSeed,
  },
  {
    id: 'gamefowlFeed',
    label: 'Gamefowl feed and supplements',
    index: cite([1.1, 1.05, 0.9, 0.95], 'PM:11', 'conditioning before the January to February and May derbies, stag season September to November'),
    matches: (p) => (p.category === 'feed' || p.category === 'vitamin') && !!p.species?.includes('gamefowl'),
  },
]

export const quarterOf = (month: number): 0 | 1 | 2 | 3 => Math.floor((month - 1) / 3) as 0 | 1 | 2 | 3

// The demand index of a product in a calendar month (1 to 12): an attribute refinement
// when one matches, else the store's category index (the parameters row, seeded from
// SEASONAL_INDEX_DEFAULTS). Returns the whole-year index with its source so the
// explanation can cite it.
export function demandIndex(
  product: Product,
  categoryIndex: Record<ProductCategory, QuarterIndex>,
  month: number,
): { index: number; year: Cited<QuarterIndex>; label: string } {
  const attr = ATTRIBUTE_INDEXES.find((a) => a.matches(product))
  const year = attr ? attr.index : cite(categoryIndex[product.category], SEASONAL_INDEX_DEFAULTS[product.category].source)
  return { index: year.value[quarterOf(month)], year, label: attr ? attr.label : product.category }
}

// Dated demand events. `months` are the months the store sells into; `leadWeeks` is how
// far ahead stock should be on the shelf; `pushes` says which products the event moves.
export type Region = 'luzon' | 'visayas' | 'mindanao' | 'all'

export interface SeasonEvent {
  id: string
  name: string
  months: number[]
  leadWeeks: number
  region: Region
  pushes: { categories?: ProductCategory[]; species?: Species[]; pesticideClass?: PesticideClass[]; stages?: string[] }
  effect: 'demand' | 'displaces' | 'clearance'
  source: string
  note: string
}

export const SEASON_EVENTS: SeasonEvent[] = [
  {
    id: 'riceWetPlanting',
    name: 'Wet-season rice planting',
    months: [6, 7],
    leadWeeks: 4,
    region: 'luzon',
    pushes: { categories: ['seed', 'fertilizer'] },
    effect: 'demand',
    source: 'PM-41',
    note: 'window April to August, peak June to July; seed and basal fertilizer sell in the month before the peak, urea topdressing 3 to 6 weeks after',
  },
  {
    id: 'riceDryPlanting',
    name: 'Dry-season rice planting',
    months: [11, 12],
    leadWeeks: 4,
    region: 'luzon',
    pushes: { categories: ['seed', 'fertilizer'] },
    effect: 'demand',
    source: 'PM-42',
    note: 'window September to February, peak November to December; hybrid seed is the commercial line here (RCEF gives inbred seed free in the wet season)',
  },
  {
    id: 'cornWetPlanting',
    name: 'Wet-season corn planting',
    months: [5, 6],
    leadWeeks: 4,
    region: 'all',
    pushes: { categories: ['seed', 'fertilizer'] },
    effect: 'demand',
    source: 'PM-46',
    note: 'Region 2 plants in May; Mindanao rain onset May (PM-47); Visayas biggest crop from the May rains (PM-48)',
  },
  {
    id: 'cornDryPlanting',
    name: 'Dry-season corn planting',
    months: [10, 11],
    leadWeeks: 4,
    region: 'all',
    pushes: { categories: ['seed', 'fertilizer'] },
    effect: 'demand',
    source: 'PM-46',
    note: 'Region 2 October to November; Mindanao second crop October to December',
  },
  {
    id: 'herbicideAfterPlanting',
    name: 'Herbicide after the planting peaks',
    months: [6, 7, 11, 12],
    leadWeeks: 2,
    region: 'all',
    pushes: { categories: ['pesticide'], pesticideClass: ['herbicide'] },
    effect: 'demand',
    source: 'PM:11',
    note: '2 to 3 weeks after each planting peak; weed control window 0 to 45 days (PK-95)',
  },
  {
    id: 'wetSeasonPests',
    name: 'Wet-season pests and diseases',
    months: [7, 8, 9],
    leadWeeks: 3,
    region: 'all',
    pushes: { categories: ['pesticide'], pesticideClass: ['fungicide', 'insecticide', 'molluscicide'] },
    effect: 'demand',
    source: 'PM-127',
    note: 'brown spot, stem borer, blast, sheath blight and snails in the cloudy wet season (PM-56, PM-58); a smaller wave December to February for the dry-season crop',
  },
  {
    id: 'vegetableCoolSeason',
    name: 'Cool-season vegetable planting',
    months: [10, 11, 12, 1],
    leadWeeks: 3,
    region: 'all',
    pushes: { categories: ['seed'] },
    effect: 'demand',
    source: 'PM-51',
    note: 'cabbage and Chinese cabbage October to December, potato September to January (PM-53), squash November to January (PM-54); ampalaya, eggplant, okra and sitao all season (PM-55)',
  },
  {
    id: 'christmasBroilers',
    name: 'Christmas broilers',
    months: [11, 12],
    leadWeeks: 2,
    region: 'all',
    pushes: { categories: ['feed', 'vaccine', 'vitamin'], species: ['broiler'], stages: ['booster', 'starter', 'finisher'] },
    effect: 'demand',
    source: 'PM-40',
    note: 'chicks and booster in the first half of November for December sales, finisher feed to mid-December; holiday pork and chicken demand peaks November to December (PM-37)',
  },
  {
    id: 'christmasHogs',
    name: 'Christmas hogs',
    months: [8, 9, 10, 11, 12],
    leadWeeks: 2,
    region: 'all',
    pushes: { categories: ['feed'], species: ['hog'], stages: ['grower', 'finisher'] },
    effect: 'demand',
    source: 'SS-24',
    note: 'a hog finished for December is on grower-finisher feed for the 3 to 4 months before; slaughter volume peaks in Q4 (PM-21)',
  },
  {
    id: 'fiestaSeason',
    name: 'Fiesta season and Holy Week',
    months: [3, 4, 5],
    leadWeeks: 4,
    region: 'all',
    pushes: { categories: ['feed'], species: ['broiler', 'hog'] },
    effect: 'demand',
    source: 'PM-112',
    note: 'hog farmgate is highest March to June (index 1.039 in March); broilers for a May fiesta are started late March to April',
  },
  {
    id: 'cockDerbies',
    name: 'Cock derbies (late January and May)',
    months: [11, 12, 1, 3, 4, 5],
    leadWeeks: 8,
    region: 'all',
    pushes: { categories: ['feed', 'vitamin'], species: ['gamefowl'], stages: ['conditioning', 'maintenance'] },
    effect: 'demand',
    source: 'PM-59',
    note: 'World Slasher Cup late January to early February and mid-May (PM-60); conditioning feeds and vitamins sell 2 months before (PK-50)',
  },
  {
    id: 'stagSeason',
    name: 'Stag derby season',
    months: [6, 7, 8, 9, 10, 11],
    leadWeeks: 4,
    region: 'all',
    pushes: { categories: ['feed', 'vitamin'], species: ['gamefowl'], stages: ['developer', 'conditioning'] },
    effect: 'demand',
    source: 'PM-61',
    note: 'stag derbies September to November (PM-62); developer and stabilizer feeds from June',
  },
  {
    id: 'rcefSeedRollout',
    name: 'RCEF free inbred seed (wet season)',
    months: [3, 4, 5, 6, 7, 8, 9],
    leadWeeks: 0,
    region: 'all',
    pushes: { categories: ['seed'] },
    effect: 'displaces',
    source: 'SS-67',
    note: 'certified inbred rice seed is given free 16 March to 15 September to registered farmers, displacing retail inbred seed; hybrid, corn and vegetable seed stay commercial',
  },
  {
    id: 'fertilizerLeanSeason',
    name: 'Fertilizer lean season at rice harvest',
    months: [8, 9, 10],
    leadWeeks: 0,
    region: 'luzon',
    pushes: { categories: ['fertilizer'] },
    effect: 'clearance',
    source: 'PM-45',
    note: 'wet-season harvest June to October; dealers cut margins to clear stock toward harvest (SS-97); stock one season of cover only (BS-75)',
  },
]

// Events whose demand months include `month` and whose lead window opens within `weeksAhead`.
export function eventsFor(month: number, weeksAhead: number, region: Region = 'all'): SeasonEvent[] {
  return SEASON_EVENTS.filter((e) => {
    if (region !== 'all' && e.region !== 'all' && e.region !== region) return false
    return e.months.some((m) => {
      const ahead = ((m - month + 12) % 12) * 4.345
      return ahead <= e.leadWeeks + weeksAhead
    })
  })
}
