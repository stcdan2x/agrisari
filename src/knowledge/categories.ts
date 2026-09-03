import type { LicenceClass, ProductCategory } from '../types'

// Defaults per category from research/product-catalog-and-categories.md sections 10 and
// 11 (refinements 2, 3, 4, 6 and 10): the licence the store must hold, VAT status under
// NIRC section 109 as of RR 16-2005, whether tingi repacking is allowed, and the lot life
// used for FEFO when the label carries no date. Every default is overridable per SKU.
export interface CategoryDefaults {
  label: string
  baseUnit: string
  vatExempt: boolean
  hasExpiry: boolean
  lotShelfLifeDays?: number
  repackable: boolean
  licenceClass: LicenceClass
  coldChain: boolean
}

export const CATEGORY_DEFAULTS: Record<ProductCategory, CategoryDefaults> = {
  feed: { label: 'Feeds', baseUnit: 'kg', vatExempt: true, hasExpiry: true, lotShelfLifeDays: 40, repackable: true, licenceClass: 'baiFeed', coldChain: false },
  feedIngredient: { label: 'Feed ingredients', baseUnit: 'kg', vatExempt: true, hasExpiry: true, lotShelfLifeDays: 30, repackable: true, licenceClass: 'baiFeed', coldChain: false },
  seed: { label: 'Seeds', baseUnit: 'bag', vatExempt: true, hasExpiry: true, repackable: false, licenceClass: 'seedDealer', coldChain: false },
  // Repacking into 1, 2 and 5 kg needs the FPA dealer-repacker LTO: off by default.
  fertilizer: { label: 'Fertilizers', baseUnit: 'bag', vatExempt: true, hasExpiry: false, repackable: false, licenceClass: 'fpaDealer', coldChain: false },
  pesticide: { label: 'Pesticides', baseUnit: 'bottle', vatExempt: false, hasExpiry: true, repackable: false, licenceClass: 'fpaDealer', coldChain: false },
  tool: { label: 'Tools', baseUnit: 'piece', vatExempt: false, hasExpiry: false, repackable: false, licenceClass: 'none', coldChain: false },
  equipment: { label: 'Equipment', baseUnit: 'piece', vatExempt: false, hasExpiry: false, repackable: false, licenceClass: 'none', coldChain: false },
  vetDrug: { label: 'Veterinary drugs', baseUnit: 'piece', vatExempt: false, hasExpiry: true, repackable: false, licenceClass: 'baiVetOutletRx', coldChain: false },
  vaccine: { label: 'Vaccines', baseUnit: 'vial', vatExempt: false, hasExpiry: true, repackable: false, licenceClass: 'baiBiologic', coldChain: true },
  vitamin: { label: 'Vitamins and supplements', baseUnit: 'piece', vatExempt: false, hasExpiry: true, repackable: false, licenceClass: 'baiVetOutletOtc', coldChain: false },
  disinfectant: { label: 'Disinfectants', baseUnit: 'bottle', vatExempt: false, hasExpiry: true, repackable: false, licenceClass: 'fpaDealer', coldChain: false },
  // Pet food is a VATable specialty feed (RR 16-2005) sold under the BAI feed LTO.
  pet: { label: 'Pet supplies', baseUnit: 'kg', vatExempt: false, hasExpiry: true, repackable: true, licenceClass: 'baiFeed', coldChain: false },
  other: { label: 'Other', baseUnit: 'piece', vatExempt: false, hasExpiry: false, repackable: false, licenceClass: 'none', coldChain: false },
}

// Display and sort order: the launch lines first, the extension lines after.
export const CATEGORY_ORDER = Object.keys(CATEGORY_DEFAULTS) as ProductCategory[]

export const LICENCE_LABELS: Record<LicenceClass, string> = {
  none: 'No licence needed',
  seedDealer: 'Seed dealer registration (RA 7308)',
  fpaDealer: 'FPA dealer LTO',
  fpaDealerRepacker: 'FPA dealer-repacker LTO',
  fpaRestricted: 'FPA restricted-use certificate',
  baiFeed: 'BAI feed establishment LTO',
  baiVetOutletOtc: 'BAI veterinary outlet (OTC)',
  baiVetOutletRx: 'BAI veterinary outlet with prescriber (Rx)',
  baiBiologic: 'BAI biologics licence',
}
