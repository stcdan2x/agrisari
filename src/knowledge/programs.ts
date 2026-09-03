import type { FeedStage, ProductCategory, Species } from '../types'
import { cite, type Cited } from './cite'

// Feed programs and crop inputs from research/product-knowledge-for-counter-advice.md
// sections 1 to 3, compiled for the bundle recommender (7.3) and the counter: how much of
// each stage one head or one hectare takes, with the add-ons the programme calls for.
// Quantities are kg per head (feeds) or per hectare (crops); the sack is 50 kg unless the
// product says otherwise, so the recommender rounds to the product's pack.

export interface ProgramStage {
  stage: FeedStage
  label: string
  kgPerHead: Cited<number>
  days?: number
}

export interface AddOn {
  category: ProductCategory
  name: string
  timing: string
  source: string
}

export interface FeedProgram {
  id: string
  species: Species
  name: string
  per: 'cycle' | 'month' // kg per head per production cycle, or per month of the standing stage
  stages: ProgramStage[]
  totalKgPerHead: Cited<number>
  addOns: AddOn[]
  note: string
}

export const FEED_PROGRAMS: FeedProgram[] = [
  {
    id: 'broiler-da',
    species: 'broiler',
    name: 'Broiler, DA Cagayan Valley program (42 to 45 days)',
    per: 'cycle',
    stages: [
      { stage: 'booster', label: 'Chick booster, 7 days at 10 g', kgPerHead: cite(0.07, 'PK-01', '10 g/head/day for 7 days'), days: 7 },
      { stage: 'starter', label: 'Broiler starter, 21 days at 60 g', kgPerHead: cite(1.26, 'PK-02', '60 g/head/day for 21 days'), days: 21 },
      { stage: 'finisher', label: 'Broiler finisher, 14 days at 90 g', kgPerHead: cite(1.26, 'PK-03', '90 g/head/day for 14 days'), days: 14 },
    ],
    totalKgPerHead: cite(2.59, 'PK-04', '42 to 45 days to 1.6 kg live (PK-05, PK-06); 4 percent mortality in the DA cost example (PK-07)'),
    addOns: [
      { category: 'vitamin', name: 'Vitamin-electrolyte sachet for brooding stress', timing: 'first week', source: 'PK:1' },
      { category: 'vaccine', name: 'NCD vaccine', timing: 'days 8 to 10 and 26 to 28', source: 'PK-106' },
      { category: 'vaccine', name: 'Fowl pox vaccine (optional)', timing: 'days 21 to 24', source: 'PK-107' },
    ],
    note: '100 chicks: 7 kg booster, 126 kg starter (3 sacks or 2 sacks plus 26 kg tingi), 126 kg finisher; 259 kg in all',
  },
  {
    id: 'broiler-unifeeds',
    species: 'broiler',
    name: 'Broiler, Unifeeds 35-day table',
    per: 'cycle',
    stages: [
      { stage: 'booster', label: 'Chick booster mash, days 1 to 10', kgPerHead: cite(0.249, 'PK-08'), days: 10 },
      { stage: 'starter', label: 'Broiler starter crumble, days 11 to 28', kgPerHead: cite(1.413, 'PK-09'), days: 18 },
      { stage: 'finisher', label: 'Broiler finisher crumble, days 29 to 35', kgPerHead: cite(0.828, 'PK-10'), days: 7 },
    ],
    totalKgPerHead: cite(2.49, 'PK-11', '249 kg per 100 heads to 1.53 kg live at day 35'),
    addOns: [{ category: 'vaccine', name: 'NCD vaccine', timing: 'days 8 to 10 and 26 to 28', source: 'PK-106' }],
    note: '100 chicks: 24.9 kg booster, 141.3 kg starter (3 sacks), 82.8 kg finisher (2 sacks)',
  },
  {
    id: 'layer-pullet',
    species: 'layer',
    name: 'Layer pullet to 18 weeks (Unifeeds)',
    per: 'cycle',
    stages: [
      { stage: 'booster', label: 'Chick booster mash, weeks 1 to 2', kgPerHead: cite(0.189, 'PK-15'), days: 14 },
      { stage: 'starter', label: 'Chick starter mash, weeks 3 to 8', kgPerHead: cite(1.463, 'PK-16'), days: 42 },
      { stage: 'grower', label: 'Chick grower mash, weeks 9 to 16', kgPerHead: cite(3.451, 'PK-17'), days: 56 },
      { stage: 'layer1', label: 'Grower plus layer mash, weeks 17 to 18', kgPerHead: cite(1.127, 'PK-18'), days: 14 },
    ],
    totalKgPerHead: cite(6.23, 'PK-14', 'the guide says 12 bags per 100 heads; first egg at 20 to 22 weeks (PK-22)'),
    addOns: [
      { category: 'vaccine', name: 'IBD (Gumboro) live vaccine', timing: 'days 15 to 18, 21 to 25, 28 to 32', source: 'PK-108' },
      { category: 'vaccine', name: 'Newcastle live boosters during lay', timing: 'every 30 to 60 days in high-challenge areas', source: 'PK-109' },
    ],
    note: 'restrict pullets to 85 percent of intake at 16 to 18 weeks (PK-23); never feed layer mash to chicks (PK-24)',
  },
  {
    id: 'layer-hen',
    species: 'layer',
    name: 'Laying hen, per month',
    per: 'month',
    stages: [{ stage: 'layer1', label: 'Layer mash, 104 g/hen/day', kgPerHead: cite(3.12, 'PK-21', '104 g x 30 days; 3.30 kg at 110 g (PK-19)'), days: 30 }],
    totalKgPerHead: cite(3.12, 'PK-21', 'a 100-hen flock buys about 6 sacks a month'),
    addOns: [],
    note: '1.8 kg hen at 80 percent lay (PK-20)',
  },
  {
    id: 'hog-bmeg-expert',
    species: 'hog',
    name: 'Hog, B-MEG Expert program, 10 days to 80 kg',
    per: 'cycle',
    stages: [
      {
        stage: 'preStarter',
        label: 'Pre-starter mash, days 10 to 54 at 0.30 kg',
        kgPerHead: cite(13.2, 'PK-26', '0.30 kg/day x 44 days; 7.5 kg when the weaner arrives at 30 days (PK-38)'),
        days: 44,
      },
      { stage: 'starter', label: 'Starter mash, days 55 to 82 at 1.0 to 1.2 kg', kgPerHead: cite(29.7, 'PK-28', '1.1 kg/day x 27 days'), days: 27 },
      { stage: 'grower', label: 'Grower mash, days 83 to 137 at 2.0 to 2.2 kg', kgPerHead: cite(113.4, 'PK-29', '2.1 kg/day x 54 days'), days: 54 },
      {
        stage: 'finisher',
        label: 'Finisher mash, days 138 to 155 at 2.2 to 2.5 kg',
        kgPerHead: cite(72.9, 'PK-30', '2.35 kg/day x 31 days; another 37.8 kg to 90 kg per the DA table (PK-36)'),
        days: 31,
      },
    ],
    totalKgPerHead: cite(229, 'PK-32', 'the DA intake table gives 228 kg from 20 to 90 kg (PK-33), within 5 percent'),
    addOns: [
      { category: 'vetDrug', name: 'Dewormer', timing: '1 to 2 weeks after weaning', source: 'PK-104' },
      { category: 'vaccine', name: 'Hog cholera vaccine', timing: '1 week before or after weaning', source: 'PK-105' },
      { category: 'vetDrug', name: 'Iron injection', timing: 'day 3, repeat at 14 days', source: 'PK-103' },
      { category: 'vitamin', name: 'Vitamins or electrolytes for transport stress', timing: 'on arrival', source: 'PK:1' },
    ],
    note: '10 weaners: about 52 to 54 sacks over 5 months, from 2 sacks in month 1 to 14 in month 5; market at 80 kg or more (PK-39)',
  },
  {
    id: 'sow-cycle',
    species: 'hog',
    name: 'Sow, per farrowing cycle (B-MEG)',
    per: 'cycle',
    stages: [
      {
        stage: 'gestating',
        label: 'Gestating sow feed, 115 days at 2.0 to 2.5 kg',
        kgPerHead: cite(221, 'PK-40', '30 x 2.0 + 55 x 2.25 + 15 x 2.5'),
        days: 100,
      },
      {
        stage: 'lactating',
        label: 'Lactating sow feed, transition, 28 days of lactation and the dry period',
        kgPerHead: cite(187, 'PK-41', '14 x 3.0 + 28 x 4.5 + 7 x 2.75'),
        days: 49,
      },
    ],
    totalKgPerHead: cite(408, 'PK-42', 'about 8 sacks per sow per cycle'),
    addOns: [{ category: 'vetDrug', name: 'Dewormer for the sow', timing: '14 days before farrowing', source: 'PK-104' }],
    note: 'boars 1.8 to 2.5 kg/day on the same feed (PK-43)',
  },
  {
    id: 'gamefowl-stag',
    species: 'gamefowl',
    name: 'Gamefowl stag, 3 to 6 months',
    per: 'cycle',
    stages: [
      {
        stage: 'developer',
        label: 'Stag developer, 3 to 4 months at 50 to 60 g',
        kgPerHead: cite(1.65, 'PK-47', '30 days x 55 g; ad libitum at 1 to 3 months'),
        days: 30,
      },
      { stage: 'developer', label: 'Stag stabilizer pellets, 4 to 6 months at 60 to 100 g', kgPerHead: cite(4.8, 'PK-52', '60 days x 80 g (PK-48)'), days: 60 },
    ],
    totalKgPerHead: cite(6.45, 'PK-52', '1.65 + 4.8, derived'),
    addOns: [{ category: 'vitamin', name: 'B-complex and the supplement range', timing: 'through conditioning', source: 'PK:1' }],
    note: 'chick booster ad libitum for the first 30 days (PK-46)',
  },
  {
    id: 'gamefowl-maintenance',
    species: 'gamefowl',
    name: 'Gamefowl maintenance and conditioning, per month',
    per: 'month',
    stages: [
      { stage: 'maintenance', label: 'Maintenance, 40 to 50 g twice a day', kgPerHead: cite(2.7, 'PK-49', '90 g/day x 30 days, derived'), days: 30 },
      {
        stage: 'conditioning',
        label: 'Conditioning, 35 to 45 g per feeding for the 14 to 30-day plan before a fight',
        kgPerHead: cite(2.4, 'PK-50', '80 g/day x 30 days, derived; plan length 14 to 30 days (PK-51)'),
        days: 30,
      },
    ],
    totalKgPerHead: cite(2.7, 'PK-49', 'per bird per month on maintenance'),
    addOns: [{ category: 'vitamin', name: 'B-complex, grains and the supplement range', timing: '2 months before the derby', source: 'PK-50' }],
    note: 'pre-conditioning 2 months before the fight, conditioning 1 month before',
  },
  {
    id: 'duck-layer',
    species: 'duck',
    name: 'Duck layer, per month',
    per: 'month',
    stages: [{ stage: 'layer1', label: 'Duck layer feed, 105 to 120 g/bird/day', kgPerHead: cite(3.375, 'PK-53', '112.5 g x 30 days, derived'), days: 30 }],
    totalKgPerHead: cite(3.375, 'PK-53', 'from 16 weeks to culling'),
    addOns: [],
    note: '',
  },
  {
    id: 'quail-layer',
    species: 'quail',
    name: 'Quail layer, per month',
    per: 'month',
    stages: [{ stage: 'layer1', label: 'Quail layer feed, 19.25 g/bird/day', kgPerHead: cite(0.578, 'PK-54', '19.25 g x 30 days, derived'), days: 30 }],
    totalKgPerHead: cite(0.578, 'PK-54', 'from 5 weeks to culling'),
    addOns: [],
    note: '',
  },
]

// kg per stage for a batch, and the whole batch total.
export function programNeeds(program: FeedProgram, heads: number): { stage: ProgramStage; kg: number }[] {
  return program.stages.map((stage) => ({ stage, kg: Math.round(stage.kgPerHead.value * heads * 100) / 100 }))
}

export interface CropItem {
  category: ProductCategory
  name: string
  qtyPerHa: Cited<number>
  unit: string
  timing: string
}

export interface CropInput {
  id: string
  crop: string
  season: 'wet' | 'dry' | 'any'
  name: string
  items: CropItem[]
  note: string
}

export const CROP_INPUTS: CropInput[] = [
  {
    id: 'rice-inbred-ws',
    crop: 'rice',
    season: 'wet',
    name: 'Inbred rice, wet season, 5 t/ha target (PalayCheck)',
    items: [
      {
        category: 'seed',
        name: 'Certified inbred seed',
        qtyPerHa: cite(40, 'PK-88', '20 to 40 kg transplanted; 40 to 60 kg direct wet-seeded (PK-89); certified bags are 40 kg (SK-20)'),
        unit: 'kg',
        timing: 'at sowing',
      },
      {
        category: 'fertilizer',
        name: 'Complete 14-14-14(-12S)',
        qtyPerHa: cite(4, 'PK-63', 'P and K adequate; add 0.5 bag 0-18-0 and 0.5 bag 0-0-60 when deficient (PK-65)'),
        unit: 'bag',
        timing: '10 to 14 days after transplanting',
      },
      {
        category: 'fertilizer',
        name: 'Urea',
        qtyPerHa: cite(3, 'PK-66', '1 bag per LCC trigger, 2 to 3 triggers from 21 DAT to early flowering (PK-67)'),
        unit: 'bag',
        timing: 'LCC-triggered topdressing, weekly readings',
      },
    ],
    note: 'no insecticide for 30 to 40 days after planting (PK-92); herbicide only inside the 0 to 45-day window and as the last option (PK-95)',
  },
  {
    id: 'rice-inbred-ds',
    crop: 'rice',
    season: 'dry',
    name: 'Inbred rice, dry season, 7 t/ha target (PalayCheck)',
    items: [
      { category: 'seed', name: 'Certified inbred seed', qtyPerHa: cite(40, 'PK-88'), unit: 'kg', timing: 'at sowing' },
      {
        category: 'fertilizer',
        name: 'Complete 14-14-14(-12S)',
        qtyPerHa: cite(6, 'PK-64', '5 bags plus 2 bags 16-20-0 when 16-20-0 is the P source'),
        unit: 'bag',
        timing: '10 to 14 days after transplanting',
      },
      {
        category: 'fertilizer',
        name: 'Urea',
        qtyPerHa: cite(4.5, 'PK-66', '1.5 bags per LCC trigger, 2 to 3 triggers'),
        unit: 'bag',
        timing: 'LCC-triggered topdressing',
      },
      {
        category: 'fertilizer',
        name: 'Zinc sulfate',
        qtyPerHa: cite(25, 'PK-68', 'zinc-deficient soils only, at 10 to 14 DAT'),
        unit: 'kg',
        timing: '10 to 14 days after transplanting',
      },
    ],
    note: 'dry-season demand is the hybrid and commercial seed season; RCEF inbred seed is free in the wet season (SS-67)',
  },
  {
    id: 'rice-hybrid',
    crop: 'rice',
    season: 'any',
    name: 'Hybrid rice (ATI Cordillera guide)',
    items: [
      { category: 'seed', name: 'Hybrid rice seed', qtyPerHa: cite(20, 'PK-90', 'the lower rate for hybrids'), unit: 'kg', timing: 'at sowing' },
      {
        category: 'fertilizer',
        name: 'Complete 14-14-14 (or 4 bags 10-15-15)',
        qtyPerHa: cite(3.3, 'PK-72', 'basal without MOET'),
        unit: 'bag',
        timing: 'basal',
      },
      {
        category: 'fertilizer',
        name: 'Urea',
        qtyPerHa: cite(3.5, 'PK-73', '1 at 14 to 30 DAT, 1 at 34 to 50 DAT, 1 around 54 DAT, 0.5 at 10 percent heading'),
        unit: 'bag',
        timing: 'LCC schedule',
      },
      {
        category: 'fertilizer',
        name: 'Muriate of potash 0-0-60',
        qtyPerHa: cite(0.8, 'PK-73', 'with the second urea application'),
        unit: 'bag',
        timing: '34 to 50 days after transplanting',
      },
    ],
    note: 'hybrid yields 15 to 20 percent above inbred under the same conditions (PK-74)',
  },
  {
    id: 'corn-da',
    crop: 'corn',
    season: 'any',
    name: 'Yellow corn, DA program package',
    items: [
      { category: 'seed', name: 'Hybrid or GM corn seed', qtyPerHa: cite(18, 'PK-75', '20 kg for improved OPV'), unit: 'kg', timing: 'at planting' },
      {
        category: 'fertilizer',
        name: 'Urea and complete',
        qtyPerHa: cite(2, 'PK-76', 'the programme package, not the full agronomic rate (open question); 2 bags urea alone raised yield 41 percent (PK-77)'),
        unit: 'bag',
        timing: 'basal and side-dress',
      },
    ],
    note: 'yield target 3.07 to 5.0 t/ha (PK-78)',
  },
  {
    id: 'tomato',
    crop: 'tomato',
    season: 'any',
    name: 'Tomato (DA Cagayan Valley guide)',
    items: [
      {
        category: 'seed',
        name: 'Tomato seed',
        qtyPerHa: cite(0.2, 'PK-79', '100 to 200 g at about 250 seeds per gram; transplant 25 to 30-day seedlings'),
        unit: 'kg',
        timing: 'seedbed',
      },
      { category: 'fertilizer', name: 'Decomposed manure or organic fertilizer', qtyPerHa: cite(20, 'PK-80'), unit: 'bag', timing: 'before land preparation' },
    ],
    note: 'basal 14-14-14 1 tbsp per plant, urea 1 tbsp per plant at 10 to 15 and 30 DAT with muriate of potash (PK-81); off-season May to September pays best (PK-82)',
  },
  {
    id: 'ampalaya',
    crop: 'ampalaya',
    season: 'any',
    name: 'Ampalaya (DA Cagayan Valley guide)',
    items: [
      {
        category: 'seed',
        name: 'Ampalaya seed',
        qtyPerHa: cite(3, 'PK-83', 'one pre-germinated seed per hill at 1.5 to 2.5 m'),
        unit: 'kg',
        timing: 'at planting',
      },
      {
        category: 'fertilizer',
        name: 'Complete 14-14-14',
        qtyPerHa: cite(1, 'PK-84', '20 g per hill x 2,500 hills = 50 kg, derived'),
        unit: 'bag',
        timing: 'before planting',
      },
      {
        category: 'fertilizer',
        name: 'Urea',
        qtyPerHa: cite(1.5, 'PK-84', '10 g per hill every 2 weeks, 2 to 3 times: 75 kg, derived'),
        unit: 'bag',
        timing: 'from week 3 to 4, every 2 weeks',
      },
    ],
    note: '10 to 20 t organic fertilizer per hectare before field preparation (PK-85); bag the fruits against fruit fly',
  },
  {
    id: 'eggplant',
    crop: 'eggplant',
    season: 'any',
    name: 'Eggplant (DA Cagayan Valley guide)',
    items: [
      { category: 'seed', name: 'Eggplant seed', qtyPerHa: cite(0.2, 'PK-86', '100 to 200 g at about 250 seeds per gram'), unit: 'kg', timing: 'seedbed' },
    ],
    note: 'starter solution 2 tbsp 16-20-0 or 14-14-14 to seedlings; harden one week before transplanting',
  },
]

export function cropNeeds(input: CropInput, hectares: number): { item: CropItem; qty: number }[] {
  return input.items.map((item) => ({ item, qty: Math.round(item.qtyPerHa.value * hectares * 100) / 100 }))
}
