import type { Source } from './cite'

// The Tagalog and trade terms the counter uses (PLAN.md F7, decision 6: English UI, the
// terms in the Guide glossary and field hints). Each entry names the research section the
// term is used in and, where one exists, the topic that explains the thing.
export interface GlossaryEntry {
  term: string
  meaning: string
  source: Source
  topic?: string
}

export const GLOSSARY: GlossaryEntry[] = [
  {
    term: 'tingi',
    meaning:
      'Selling part of a sack, bottle or box by the kilo, litre, sachet or piece. Allowed for feeds and feed ingredients, for fertilizer only under the dealer-repacker licence, never for pesticides or veterinary drugs.',
    source: 'SS:Tingi (repack) pricing',
    topic: 'tingi-pricing',
  },
  {
    term: 'suki',
    meaning: 'A regular customer who keeps buying from one seller and is rewarded with preferential treatment, credit priority and sometimes a lower price.',
    source: 'SS:Suki loyalty schemes',
    topic: 'suki',
  },
  {
    term: 'listahan',
    meaning: 'The credit list: the notebook (now the app) where each customer\'s charges and payments are written. A sale "on listahan" is a credit sale.',
    source: 'SS:Credit ("listahan" / utang) policy: terms, limits, aging, collection and bad debt',
    topic: 'credit-policy',
  },
  {
    term: 'utang',
    meaning: 'Debt; what a customer owes on the listahan.',
    source: 'SS:Credit ("listahan" / utang) policy: terms, limits, aging, collection and bad debt',
    topic: 'credit-policy',
  },
  { term: 'bodega', meaning: 'The storeroom or warehouse behind the counter where sacks are stacked on pallets.', source: 'IS:1.1', topic: 'feed-storage' },
  {
    term: 'sako',
    meaning: 'A sack: 50 kg of feed or fertilizer unless the label says otherwise (25 kg and 1 kg packs exist for young-animal feeds).',
    source: 'PC:10',
    topic: 'feeds',
  },
  {
    term: 'darak',
    meaning: 'Rice bran, sold by the sack and by the kilo as a feed ingredient. D1 (cono) is the finer, oilier grade; D2 (kiskis) is coarser.',
    source: 'PC:2',
    topic: 'feed-ingredients',
  },
  {
    term: 'cono',
    meaning: 'Rice bran D1: the finer grade from a cono mill, minimum 11 percent protein, turns rancid fastest.',
    source: 'PC:2',
    topic: 'feed-ingredients',
  },
  { term: 'kiskis', meaning: 'Rice bran D2: the coarser grade from a kiskisan mill, minimum 9 percent protein.', source: 'PC:2', topic: 'feed-ingredients' },
  {
    term: 'mais',
    meaning: 'Corn; yellow corn grain is the main energy ingredient of hog and poultry feed and is sold whole or cracked.',
    source: 'PC:2',
    topic: 'feed-ingredients',
  },
  { term: 'binlid', meaning: 'Broken grain (cracked corn or broken rice) sold as a feed ingredient.', source: 'PC:2', topic: 'feed-ingredients' },
  { term: 'pulot', meaning: 'Molasses, sold by the litre or gallon as a feed ingredient and binder.', source: 'PC:2', topic: 'feed-ingredients' },
  { term: 'asin', meaning: 'Salt, sold in 1 kg or 50 kg for home-mixed rations.', source: 'PC:2', topic: 'feed-ingredients' },
  { term: 'apog', meaning: 'Limestone (calcium carbonate), the calcium source in home-mixed layer rations.', source: 'PC:2', topic: 'feed-ingredients' },
  { term: 'abono', meaning: 'Fertilizer. "Ilang sako ng abono?" asks how many bags per hectare.', source: 'PK:2.1', topic: 'fertilizer' },
  { term: 'binhi', meaning: 'Seed. Certified rice seed carries the blue BPI-NSQCS tag.', source: 'PK:3.1', topic: 'seeds' },
  {
    term: 'palay',
    meaning: 'Unmilled rice; the crop the rice farmer sells at harvest, whose farmgate price sets when the farmer has cash.',
    source: 'PM:10',
    topic: 'customer-income-prices',
  },
  { term: 'panuig', meaning: 'The first cropping of the year in Bukidnon usage, usually started in July.', source: 'PM:4', topic: 'crop-calendars' },
  {
    term: 'tag-ulan',
    meaning: 'The rainy or wet season: pests and diseases thrive, and the store sells fungicide, molluscicide and typhoon-tolerant seed.',
    source: 'PK:5',
    topic: 'rainy-season-pests',
  },
  { term: 'sisiw', meaning: 'Chick. "Ilang sako para sa 100 sisiw?" is the broiler batch question.', source: 'PK:5', topic: 'broiler-feeding-program' },
  { term: 'biik', meaning: 'Piglet or weaner, bought at about 30 days and 8 to 10 kg.', source: 'PK:5', topic: 'hog-feeding-program' },
  { term: 'inahin', meaning: 'A breeding female: a sow (inahing baboy) or a laying hen.', source: 'PK:5', topic: 'hog-feeding-program' },
  { term: 'baboy', meaning: 'Hog or pig.', source: 'PK:5', topic: 'hog-feeding-program' },
  { term: 'manok', meaning: 'Chicken.', source: 'PK:5', topic: 'layer-feeding-program' },
  { term: 'itik', meaning: 'Duck; duck layer pellet is fed from 16 weeks to culling.', source: 'PK:5', topic: 'duck-quail-native-feeding' },
  { term: 'kambing', meaning: 'Goat.', source: 'PK:5', topic: 'goat-cattle-feeding' },
  {
    term: 'panabong',
    meaning: 'A gamefowl kept for fighting; "panabong na stag" is a young fighting cock in development.',
    source: 'PK:5',
    topic: 'gamefowl-feeding-program',
  },
  { term: 'sabong', meaning: 'Cockfighting; derby dates set the demand for conditioning feed and supplements.', source: 'PM:6', topic: 'derby-calendar' },
  {
    term: 'stag',
    meaning: 'A young gamefowl cock, from about 1 month to its first fighting season; stag derbies run September to November.',
    source: 'PM:6',
    topic: 'derby-calendar',
  },
  {
    term: 'mestiso',
    meaning: 'A crossbred (F3 or F5) grow-out hog, the animal the value feed lines are formulated for.',
    source: 'PC:1.2',
    topic: 'hog-feeding-program',
  },
  { term: 'kuhol', meaning: 'Golden apple snail, the rice pest a molluscicide is sold against.', source: 'PK:5', topic: 'pesticide-classes' },
  { term: 'daga', meaning: 'Rat; rodenticide and traps, with community-wide control.', source: 'PK:5', topic: 'pesticide-classes' },
  { term: 'uod', meaning: 'Worm or caterpillar; "may uod sa mais" usually means fall armyworm.', source: 'PK:5', topic: 'corn-inputs' },
  { term: 'pestisidyo', meaning: 'Pesticide.', source: 'PK:5', topic: 'pesticide-safety' },
  { term: 'bakuna', meaning: 'Vaccine.', source: 'PK:5', topic: 'vaccination-schedules' },
  { term: 'gamot', meaning: 'Medicine; a veterinary drug.', source: 'PK:5', topic: 'dosage-and-withdrawal' },
  {
    term: 'paiwi',
    meaning:
      'A cooperative integration scheme: the cooperative supplies piglets, feed and veterinary supplies, the member supplies labour and housing, and the profit is shared.',
    source: 'IS:6',
    topic: 'integrators',
  },
  { term: 'viajero', meaning: 'A travelling livestock trader who buys hogs and birds from raisers.', source: 'IS:6', topic: 'integrators' },
  { term: 'paleta', meaning: 'A pallet (also tarimas): the wooden platform that keeps sacks off the floor.', source: 'SK:2.3', topic: 'feed-storage' },
  { term: 'lagadera', meaning: 'A plastic watering can, sold in 1.5 to 8 litre sizes.', source: 'PC:6', topic: 'tools-and-equipment' },
  {
    term: 'sari-sari',
    meaning: 'The neighbourhood variety store; some hold a fertilizer dealer licence and some buy feed to resell in tingi.',
    source: 'IS:1.1',
    topic: 'store-formats',
  },
  {
    term: 'agrivet',
    meaning: 'An agricultural and veterinary supply store: the retail input node of the livestock, poultry and crop value chains.',
    source: 'IS:1',
    topic: 'what-an-agrivet-is',
  },
  { term: '5-6', meaning: 'The informal moneylender: borrow 5, repay 6, about 20 percent per cycle.', source: 'FK:11', topic: 'capital-sources' },
  {
    term: 'GCash',
    meaning: 'The e-wallet most customers pay with; QR Ph payments cost the merchant 1 percent, cards 3.2 percent.',
    source: 'SS:Payment methods and merchant fees',
    topic: 'payment-methods',
  },
  {
    term: 'RSBSA',
    meaning: 'Registry System for Basic Sectors in Agriculture: the farmer registry that fertilizer vouchers and RCEF seed are issued against.',
    source: 'PM:12',
    topic: 'subsidy-programs',
  },
  {
    term: 'RCEF',
    meaning: 'Rice Competitiveness Enhancement Fund: gives registered rice farmers free certified inbred seed each season.',
    source: 'PM:12',
    topic: 'subsidy-programs',
  },
  {
    term: 'MOET',
    meaning: 'Minus-One Element Technique: the PhilRice pot test that shows which nutrient a rice soil lacks.',
    source: 'PK:2.1',
    topic: 'rice-inputs',
  },
  {
    term: 'LCC',
    meaning: 'Leaf colour chart: read weekly from 14 days after transplanting to time the urea top-dress.',
    source: 'PK:2.1',
    topic: 'rice-inputs',
  },
  {
    term: 'ASD',
    meaning: 'Accredited Safety Dispenser: the FPA-trained person every fertilizer and pesticide dealer must have on staff.',
    source: 'RT:2.1',
    topic: 'fpa-dealer-licence',
  },
  {
    term: 'LTO',
    meaning: 'Licence to Operate, issued by the FPA (fertilizer and pesticide dealers), the BAI (feed establishments) or the FDA (veterinary drug outlets).',
    source: 'RT:2.1',
    topic: 'fpa-dealer-licence',
  },
  { term: 'FEFO', meaning: 'First expired, first out: the lot with the earliest expiry is sold first.', source: 'SK:1', topic: 'fefo-and-expiry' },
  {
    term: 'WAC',
    meaning: 'Weighted average cost: the stock valuation the app uses; every purchase recomputes the average and every sale consumes it.',
    source: 'FK:1',
    topic: 'weighted-average-cost',
  },
  {
    term: 'DAT and DAS',
    meaning: 'Days after transplanting and days after sowing: how rice fertilizer and pesticide timings are stated.',
    source: 'PK:2.1',
    topic: 'rice-inputs',
  },
]
