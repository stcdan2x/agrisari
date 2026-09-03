import { db } from '../db/db'
import { createProduct, withCategoryDefaults } from '../db/productRepo'
import type { NewRow } from '../db/repo'
import type { FeedStage, LicenceClass, PesticideClass, Product, ProductCategory, ProductForm, Regulator, RxClass, Species } from '../types'
import { CATEGORY_DEFAULTS } from './categories'

// The starter catalog: the 130 representative SKUs of
// research/product-catalog-and-categories.md section 12 (116 launch lines, 14 extension
// lines), transcribed row by row with the section 10 category attributes. Prices are
// not in the research (the market document owns them), so every sell unit starts at 0,
// which the app shows as "no price yet". Ids are stable so a reseed on another device
// merges onto the same rows.
export interface CatalogRow {
  id: string
  name: string
  brand?: string
  category: ProductCategory
  unit?: string // base unit; the category default when omitted
  pack?: [unit: string, factor: number] // the pack sell unit in base units
  tingi?: boolean // also sold by the base unit out of the pack
  species?: Species[]
  crops?: string[]
  stage?: FeedStage
  form?: ProductForm
  vatExempt?: boolean
  licenceClass?: LicenceClass
  hasExpiry?: boolean
  pesticideClass?: PesticideClass
  activeIngredient?: string
  regulator?: Regulator
  rxClass?: RxClass
  withdrawalDays?: Partial<Record<Species, number>>
  extension?: boolean
}

type Extra = Omit<CatalogRow, 'id' | 'name' | 'brand' | 'category'>
const pad = (n: number) => String(n).padStart(3, '0')
const row = (n: number, name: string, brand: string | undefined, category: ProductCategory, o: Extra = {}): CatalogRow => ({
  id: `catalog-${pad(n)}`,
  name,
  ...(brand ? { brand } : {}),
  category,
  ...o,
})
const ext = (n: number, name: string, brand: string | undefined, category: ProductCategory, o: Extra = {}): CatalogRow => ({
  ...row(n, name, brand, category, o),
  id: `catalog-e${String(n).padStart(2, '0')}`,
  extension: true,
})

// Shorthands for the feed lines: sack of N kg sold whole or by the kg.
const sack = (n: number): Pick<CatalogRow, 'pack' | 'tingi'> => ({ pack: ['sack', n], tingi: true })
const bag1 = (): Pick<CatalogRow, 'pack'> => ({ pack: ['bag', 1] })
const hog = (stage: FeedStage, form: ProductForm, n = 50): Extra => ({ ...sack(n), species: ['hog'], stage, form })
const gamefowl = (o: Extra): Extra => ({ species: ['gamefowl'], vatExempt: false, ...o })
const vet = (o: Extra): Extra => ({ rxClass: 'rx', ...o })

export const CATALOG: CatalogRow[] = [
  // 1. Hog feeds
  row(1, 'Premium Piglet Booster pellet', 'B-MEG', 'feed', { ...bag1(), species: ['hog'], stage: 'booster', form: 'pellet' }),
  row(2, 'Premium Hog Pre-Starter crumble', 'B-MEG', 'feed', hog('preStarter', 'crumble', 25)),
  row(3, 'Premium Hog Pre-Starter crumble 1 kg', 'B-MEG', 'feed', { ...bag1(), species: ['hog'], stage: 'preStarter', form: 'crumble' }),
  row(4, 'Expert Hog Pre-Starter mash', 'B-MEG', 'feed', hog('preStarter', 'mash', 25)),
  row(5, 'Expert Hog Grower mash', 'B-MEG', 'feed', hog('grower', 'mash')),
  row(6, 'Expert Hog Starter mash', 'B-MEG', 'feed', hog('starter', 'mash')),
  row(7, 'Expert Hog Finisher mash', 'B-MEG', 'feed', hog('finisher', 'mash')),
  row(8, 'Premium Hog Grower pellet', 'B-MEG', 'feed', hog('grower', 'pellet')),
  row(9, 'Premium Hog Finisher pellet', 'B-MEG', 'feed', hog('finisher', 'pellet')),
  row(10, 'Premium Hog Gestating pellet', 'B-MEG', 'feed', hog('gestating', 'pellet')),
  row(11, 'Hog Lactating pellet', 'B-MEG', 'feed', hog('lactating', 'pellet')),
  row(12, 'Expert Hog Brood Sow pellet', 'B-MEG', 'feed', hog('gestating', 'pellet')),
  row(13, 'Early Wean Super Start micropellet', 'Pigrolac (UNAHCO)', 'feed', hog('preStarter', 'pellet', 25)),
  row(14, 'Early Wean Immunobooster', 'Pigrolac (UNAHCO)', 'feed', hog('preStarter', 'pellet', 25)),
  row(15, 'Premium Hog Pre-Starter', 'Pigrolac (UNAHCO)', 'feed', hog('preStarter', 'pellet')),
  row(16, 'Premium Hog Starter pellet', 'Pigrolac (UNAHCO)', 'feed', hog('starter', 'pellet')),
  row(17, 'Premium Hog Grower pellet', 'Pigrolac (UNAHCO)', 'feed', hog('grower', 'pellet')),
  row(18, 'Premium Hog Finisher pellet', 'Pigrolac (UNAHCO)', 'feed', hog('finisher', 'pellet')),
  row(19, 'Vital Hog Grower', 'Pigrolac (UNAHCO)', 'feed', hog('grower', 'mash')),
  row(20, 'Mama Pro Premium Milkmaker', 'Pigrolac (UNAHCO)', 'feed', hog('lactating', 'pellet')),
  row(21, 'Elite XP hog line (per stage)', 'Pilmico', 'feed', { ...sack(50), species: ['hog'] }),
  row(22, 'Classic hog grow-finish (per stage)', 'Pilmico', 'feed', { ...sack(50), species: ['hog'] }),
  row(23, 'Lakas Tandem breeder', 'Pilmico', 'feed', hog('breeder', 'pellet')),
  row(24, 'Professional Hog Creep Pellet', 'Vitarich', 'feed', { ...bag1(), species: ['hog'], stage: 'booster', form: 'pellet' }),
  row(25, 'Premium Plus Hog Starter / Grower / Finisher pellet', 'Vitarich', 'feed', { ...sack(50), species: ['hog'], form: 'pellet' }),
  row(26, 'Premium Hog Concentrate mash', 'Vitarich', 'feedIngredient', { ...sack(25), species: ['hog'], form: 'mash' }),
  // Broiler, layer, duck, quail
  row(27, 'Chick Booster Crumble (broiler)', 'Sarimanok (UNAHCO)', 'feed', { ...sack(50), species: ['broiler'], stage: 'booster', form: 'crumble' }),
  row(28, 'Broiler Starter Crumble', 'Sarimanok (UNAHCO)', 'feed', { ...sack(50), species: ['broiler'], stage: 'starter', form: 'crumble' }),
  row(29, 'Broiler Finisher Pellet', 'Sarimanok (UNAHCO)', 'feed', { ...sack(50), species: ['broiler'], stage: 'finisher', form: 'pellet' }),
  row(30, 'Broiler Finisher Crumble', 'Sarimanok (UNAHCO)', 'feed', { ...sack(50), species: ['broiler'], stage: 'finisher', form: 'crumble' }),
  row(31, 'Chick Booster (layer, wk 0 to 2)', 'Sarimanok (UNAHCO)', 'feed', { ...sack(50), species: ['layer'], stage: 'chick', form: 'crumble' }),
  row(32, 'Chick Starter (wk 3 to 8)', 'Sarimanok (UNAHCO)', 'feed', { ...sack(50), species: ['layer'], stage: 'chick', form: 'crumble' }),
  row(33, 'Chicken Grower crumble (wk 9 to 16)', 'Sarimanok (UNAHCO)', 'feed', { ...sack(50), species: ['layer'], stage: 'grower', form: 'crumble' }),
  row(34, 'Pre-lay Crumble (wk 17 to 18)', 'Sarimanok (UNAHCO)', 'feed', { ...sack(50), species: ['layer'], stage: 'developer', form: 'crumble' }),
  row(35, 'Chicken Layer 1 crumble (wk 19 to 45)', 'Sarimanok (UNAHCO)', 'feed', { ...sack(50), species: ['layer'], stage: 'layer1', form: 'crumble' }),
  row(36, 'Chicken Layer 2 crumble (wk 46 up)', 'Sarimanok (UNAHCO)', 'feed', { ...sack(50), species: ['layer'], stage: 'layer2', form: 'crumble' }),
  row(37, 'Duck Layer', 'Sarimanok (UNAHCO)', 'feed', { ...sack(50), species: ['duck'], form: 'pellet' }),
  row(38, 'Broiler Starter Crumble', 'B-MEG', 'feed', { ...sack(50), species: ['broiler'], stage: 'starter', form: 'crumble' }),
  row(39, 'Broiler Finisher Crumble', 'B-MEG', 'feed', { ...sack(50), species: ['broiler'], stage: 'finisher', form: 'crumble' }),
  row(40, 'Layer Mash', 'B-MEG', 'feed', { ...sack(50), species: ['layer'], form: 'mash' }),
  row(41, 'Duck Layer Pellet', 'B-MEG', 'feed', { ...sack(50), species: ['duck'], form: 'pellet' }),
  row(42, 'Premium Chick Booster Crumble', 'Vitarich', 'feed', { ...sack(50), species: ['broiler'], stage: 'booster', form: 'crumble' }),
  row(43, 'Premium Chicken Layer', 'Vitarich', 'feed', { ...sack(50), species: ['layer'] }),
  row(44, 'Premium Quail Layer Pellet', 'Vitarich', 'feed', { ...sack(50), species: ['quail'], form: 'pellet' }),
  row(45, 'Poultry Express (broiler and layer, per stage)', 'Pilmico', 'feed', { ...sack(50), species: ['broiler', 'layer'] }),
  row(46, 'Avemax Duck layer', 'Pilmico', 'feed', { ...sack(50), species: ['duck'] }),
  // Gamefowl (VATable specialty feeds, RR 16-2005)
  row(47, 'Baby Stag Booster', 'Thunderbird (UNAHCO)', 'feed', gamefowl({ ...sack(25), stage: 'booster', form: 'crumble' })),
  row(48, 'Stag Developer Crumble', 'Thunderbird (UNAHCO)', 'feed', gamefowl({ ...sack(25), stage: 'developer', form: 'crumble' })),
  row(49, 'Enertone maintenance', 'Thunderbird (UNAHCO)', 'feed', gamefowl({ ...sack(25), stage: 'maintenance', form: 'pellet' })),
  row(50, 'Platinum conditioning pellet', 'Thunderbird (UNAHCO)', 'feed', gamefowl({ pack: ['box', 24], tingi: true, stage: 'conditioning', form: 'pellet' })),
  row(51, 'Kidlat Concentrate grains', 'Thunderbird (UNAHCO)', 'feed', gamefowl({ ...sack(25), stage: 'maintenance' })),
  row(52, 'GMP Chick Booster / Stag Grower / Maintenance / Breeder', 'Thunderbird GMP (UNAHCO)', 'feed', gamefowl(sack(50))),
  row(53, 'Salto gamefowl feed', 'Pilmico', 'feed', gamefowl(bag1())),
  row(54, 'Powermix maintenance', 'Pilmico', 'feed', gamefowl({ ...sack(25), stage: 'maintenance' })),
  // Ruminant and aqua
  row(55, 'Gromax Goat Grower Concentrate pellet', 'Vitarich', 'feed', { ...sack(25), species: ['goat'], stage: 'grower', form: 'pellet' }),
  row(56, 'Cattle Dairy Concentrate pellet', 'Vitarich', 'feed', { ...sack(50), species: ['cattle'], form: 'pellet' }),
  row(57, 'Prize Premium Tilapia Fry Mash 1', 'B-MEG', 'feed', { ...sack(25), species: ['tilapia'], form: 'mash' }),
  row(58, 'Prize Premium Tilapia Grower Pellet', 'B-MEG', 'feed', { ...sack(25), species: ['tilapia'], stage: 'grower', form: 'pellet' }),
  row(59, 'Premium Bangus feed', 'B-MEG', 'feed', { ...sack(25), species: ['bangus'] }),
  // 2. Feed ingredients
  row(60, 'Rice bran D1 (cono)', undefined, 'feedIngredient', sack(50)),
  row(61, 'Rice bran D2 (kiskis)', undefined, 'feedIngredient', sack(50)),
  row(62, 'Yellow corn, whole or cracked', undefined, 'feedIngredient', sack(50)),
  row(63, 'Copra meal', undefined, 'feedIngredient', sack(50)),
  row(64, 'Soybean meal 44 to 46%', undefined, 'feedIngredient', sack(50)),
  row(65, 'Fish meal local 50 to 60%', undefined, 'feedIngredient', sack(50)),
  row(66, 'Molasses', undefined, 'feedIngredient', { unit: 'L', tingi: true, hasExpiry: false }),
  row(67, 'Feed-grade salt', undefined, 'feedIngredient', { ...sack(50), hasExpiry: false }),
  row(68, 'Limestone (calcium carbonate)', undefined, 'feedIngredient', { ...sack(50), hasExpiry: false }),
  row(69, 'Gromax Dairy Mineral Premix', 'Vitarich', 'feedIngredient', { ...sack(25), species: ['cattle'] }),
  // 3. Seeds (sealed bags and packets; certification tag stays with the bag)
  row(70, 'Certified inbred rice seed (NSIC Rc varieties)', undefined, 'seed', { crops: ['rice'] }),
  row(71, 'Registered inbred rice seed', undefined, 'seed', { crops: ['rice'] }),
  row(72, 'SL-8H hybrid rice seed', 'SL Agritech', 'seed', { crops: ['rice'] }),
  row(73, 'P3530PW hybrid corn (PowerCore)', 'Pioneer (Corteva)', 'seed', { crops: ['corn'] }),
  row(74, 'NK 8814 hybrid corn', 'Syngenta', 'seed', { crops: ['corn'] }),
  row(75, 'GSI 40 / TSG 81 hybrid corn', 'AHSTI', 'seed', { crops: ['corn'] }),
  row(76, 'OPV white corn', undefined, 'seed', { crops: ['corn'] }),
  row(77, 'Diamante Max F1 tomato', 'East-West Seed', 'seed', { unit: 'pack', crops: ['tomato'] }),
  row(78, 'Django Dos F1 hot pepper', 'East-West Seed', 'seed', { unit: 'pack', crops: ['hot pepper'] }),
  row(79, 'Ampalaya Mestisa F1', 'East-West Seed', 'seed', { unit: 'pack', crops: ['ampalaya'] }),
  row(80, 'Sweet 18 F1 watermelon', 'East-West Seed', 'seed', { unit: 'pack', crops: ['watermelon'] }),
  row(81, 'Upo Mayumi (OPV)', 'East-West Seed', 'seed', { unit: 'pack', crops: ['upo'] }),
  row(82, 'Carrot New Kuroda', 'Allied Botanical or Ramgo', 'seed', { unit: 'pack', crops: ['carrot'] }),
  row(83, 'Pechay, mustard, kangkong OPV packs', 'Ramgo', 'seed', { unit: 'pack', crops: ['pechay', 'mustard', 'kangkong'] }),
  // 4. Fertilizers (50 kg bags; tingi only with the FPA dealer-repacker LTO)
  row(84, 'Urea 46-0-0 prilled', 'Atlas', 'fertilizer', { regulator: 'fpa' }),
  row(85, 'Urea 46-0-0 granular', 'Atlas', 'fertilizer', { regulator: 'fpa' }),
  row(86, 'Ammonium sulfate 21-0-0', 'Atlas', 'fertilizer', { regulator: 'fpa' }),
  row(87, 'Complete 14-14-14 (Perfect Gro)', 'Atlas', 'fertilizer', { regulator: 'fpa' }),
  row(88, 'Ammophos 16-20-0 (Super Gro)', 'Atlas', 'fertilizer', { regulator: 'fpa' }),
  row(89, 'Muriate of potash 0-0-60', 'Atlas', 'fertilizer', { regulator: 'fpa' }),
  row(90, 'DAP 18-46-0', 'Atlas', 'fertilizer', { regulator: 'fpa' }),
  row(91, '16-16-16 (Grow More water-soluble)', 'Sagrex', 'fertilizer', { unit: 'kg', pack: ['pack', 1], form: 'powder', regulator: 'fpa' }),
  row(92, 'Grow More 20-20-20', 'Sagrex', 'fertilizer', { unit: 'kg', pack: ['pack', 1], form: 'powder', regulator: 'fpa' }),
  row(93, 'Grow More 4-0-48', 'Sagrex', 'fertilizer', { unit: 'kg', pack: ['pack', 1], form: 'powder', regulator: 'fpa' }),
  row(94, 'Liquid Cal-Bo-Zinc', 'Sagrex', 'fertilizer', { unit: 'L', pack: ['bottle', 1], form: 'liquid', regulator: 'fpa' }),
  row(95, 'Humic Acid Granular', 'Sagrex', 'fertilizer', { form: 'granule' }),
  // 5. Pesticides (no repacking; FPA dealer LTO; 12 percent VAT)
  row(96, 'Cymbush (cypermethrin)', 'Syngenta', 'pesticide', { pesticideClass: 'insecticide', activeIngredient: 'cypermethrin' }),
  row(97, 'Karate (lambda-cyhalothrin)', 'Syngenta', 'pesticide', { pesticideClass: 'insecticide', activeIngredient: 'lambda-cyhalothrin' }),
  row(98, 'Brodan (BPMC + chlorpyrifos)', undefined, 'pesticide', { pesticideClass: 'insecticide', activeIngredient: 'BPMC + chlorpyrifos' }),
  row(99, 'Lannate (methomyl)', 'Corteva', 'pesticide', { unit: 'pack', pesticideClass: 'insecticide', activeIngredient: 'methomyl' }),
  row(100, 'Prevathon (chlorantraniliprole)', 'FMC', 'pesticide', { pesticideClass: 'insecticide', activeIngredient: 'chlorantraniliprole' }),
  row(101, 'Exalt 60 SC', 'Corteva', 'pesticide', { pesticideClass: 'insecticide' }),
  row(102, 'Pexalon 106 SC', 'Corteva', 'pesticide', { pesticideClass: 'insecticide' }),
  row(103, 'Round Up / Machete (glyphosate IPA)', 'Bayer / others', 'pesticide', { pesticideClass: 'herbicide', activeIngredient: 'glyphosate IPA' }),
  row(104, '2,4-D ester or amine (2-4D Ester, Hedonal)', undefined, 'pesticide', { pesticideClass: 'herbicide', activeIngredient: '2,4-D' }),
  row(105, 'Nominee (bispyribac sodium)', undefined, 'pesticide', { pesticideClass: 'herbicide', activeIngredient: 'bispyribac sodium' }),
  row(106, 'Dithane M45 (mancozeb)', 'Corteva', 'pesticide', { unit: 'pack', pesticideClass: 'fungicide', activeIngredient: 'mancozeb' }),
  row(107, 'Funguran OH / Kocide (copper hydroxide)', undefined, 'pesticide', { unit: 'sachet', pack: ['box', 10], tingi: true, pesticideClass: 'fungicide', activeIngredient: 'copper hydroxide' }),
  row(108, 'Armure (difenoconazole + propiconazole)', 'Syngenta', 'pesticide', { pesticideClass: 'fungicide', activeIngredient: 'difenoconazole + propiconazole' }),
  row(109, 'Surekill / Snailmate (niclosamide)', undefined, 'pesticide', { unit: 'sachet', pack: ['box', 10], tingi: true, pesticideClass: 'molluscicide', activeIngredient: 'niclosamide' }),
  row(110, 'Racumin (coumatetralyl)', 'Bayer', 'pesticide', { unit: 'sachet', pesticideClass: 'rodenticide', activeIngredient: 'coumatetralyl' }),
  row(111, 'Zinc phosphide', undefined, 'pesticide', { unit: 'sachet', pesticideClass: 'rodenticide', activeIngredient: 'zinc phosphide' }),
  // 6. Tools and equipment
  row(112, 'Matibay Standard knapsack sprayer 16 L', 'Sagrex', 'equipment'),
  row(113, 'Lagadera watering can 1.5 to 8 L', 'Ramgo', 'tool'),
  row(114, 'Seedling tray (class A to premium) and seedling bags (25 or 50 pcs)', 'Ramgo', 'tool'),
  row(115, 'Sowing twine UV 500 g', 'Ramgo', 'tool', { unit: 'roll' }),
  row(116, 'Feeders, drinkers, syringes, boots, tarpaulin, nets, garden tools', undefined, 'tool'),
  // Extension lines (section 12 E1 to E14): seeded but hidden until the outlet licence is held
  ext(1, 'Vetracin Classic', 'Univet (UNAHCO)', 'vetDrug', vet({ unit: 'sachet', pack: ['box', 48], tingi: true, activeIngredient: 'chlortetracycline', form: 'powder', withdrawalDays: { broiler: 1, layer: 1, cattle: 3, hog: 5 } })),
  ext(2, 'Vetracin Gold Capsule', 'Univet (UNAHCO)', 'vetDrug', vet({ unit: 'capsule', pack: ['box', 100], tingi: true, activeIngredient: 'doxycycline + tiamulin', species: ['gamefowl'] })),
  ext(3, 'Apralyte', 'Univet (UNAHCO)', 'vetDrug', vet({ unit: 'sachet', pack: ['box', 48], tingi: true, activeIngredient: 'apramycin sulfate', form: 'powder', species: ['hog'], withdrawalDays: { hog: 14 } })),
  ext(4, 'Sustalin LA', 'Univet (UNAHCO)', 'vetDrug', vet({ unit: 'bottle', activeIngredient: 'oxytetracycline', form: 'injectable', withdrawalDays: { hog: 14, cattle: 28 } })),
  ext(5, 'Genvet Ivermec', 'Univet (UNAHCO)', 'vetDrug', vet({ unit: 'bottle', activeIngredient: 'ivermectin', form: 'injectable', withdrawalDays: { hog: 28, cattle: 21 } })),
  ext(6, 'Strongard tablet', 'Univet (UNAHCO)', 'vetDrug', { unit: 'tablet', rxClass: 'otc', licenceClass: 'baiVetOutletOtc', activeIngredient: 'praziquantel + albendazole', form: 'tablet', species: ['gamefowl'] }),
  ext(7, 'Bexan SP', 'Univet (UNAHCO)', 'vitamin', { unit: 'bottle', rxClass: 'otc', form: 'injectable' }),
  ext(8, 'Electrogen D+', 'Univet (UNAHCO)', 'vitamin', { unit: 'sachet', pack: ['box', 48], tingi: true, rxClass: 'otc', form: 'powder' }),
  ext(9, 'Coglapest hog cholera vaccine', 'Univet (UNAHCO)', 'vaccine', { species: ['hog'] }),
  ext(10, 'Microban GT disinfectant', 'Univet (UNAHCO)', 'disinfectant', { activeIngredient: 'glutaraldehyde + QAC', form: 'liquid' }),
  ext(11, 'Vidalix drying powder', 'Pilmico', 'disinfectant', { unit: 'bag', licenceClass: 'none', form: 'powder' }),
  ext(12, 'Maxime Adult dog food', 'Pilmico', 'pet', { tingi: true, species: ['dog'] }),
  ext(13, 'Tommy cat food', 'Pilmico', 'pet', { tingi: true, species: ['cat'] }),
  ext(14, 'Doggiessentials range', 'UNAHCO', 'pet', { unit: 'piece', licenceClass: 'none', hasExpiry: false, species: ['dog'] }),
]

// Sell units: the pack (when there is one) and, for tingi lines, the base unit.
export function catalogProduct(r: CatalogRow): NewRow<Product> {
  const { id: _id, pack, tingi, unit, ...rest } = r
  const baseUnit = unit ?? CATEGORY_DEFAULTS[r.category].baseUnit
  const sellUnits = []
  if (pack) sellUnits.push({ unit: pack[0], factor: pack[1], price: 0 })
  if (tingi || !pack) sellUnits.push({ unit: baseUnit, factor: 1, price: 0 })
  return withCategoryDefaults({ ...rest, baseUnit, sellUnits })
}

// Idempotent: adds the rows whose id is not in the table yet (edited and deleted rows
// stay as the user left them) and returns how many were added.
export async function seedCatalog(): Promise<number> {
  const present = new Set(await db.products.toCollection().primaryKeys())
  let added = 0
  for (const r of CATALOG) {
    if (present.has(r.id)) continue
    const product = await createProduct(catalogProduct(r))
    await db.products.delete(product.id)
    await db.products.add({ ...product, id: r.id })
    added++
  }
  return added
}
