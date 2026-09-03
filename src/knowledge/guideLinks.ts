import type { BuyingRecommendation } from '../engine/buying'
import type { StockAlert } from '../engine/inventory'
import type { SellingRecommendation } from '../engine/selling'
import type { LicenceClass, ProductCategory } from '../types'
import type { ParameterKey } from './parameters'

// Where each screen links into the Guide (P9 design decision 3): topic ids only, typed
// against the category, licence, alert, rule and parameter unions so tsc proves every key
// has a target, and checked by guideLinks.test.ts against the topics. This module carries
// no content, so the screens that import it stay off the Guide's lazy chunk.
export const GUIDE_LINKS = {
  category: {
    feed: 'feeds',
    feedIngredient: 'feed-ingredients',
    seed: 'seeds',
    fertilizer: 'fertilizer',
    pesticide: 'pesticides',
    tool: 'tools-and-equipment',
    equipment: 'tools-and-equipment',
    vetDrug: 'veterinary-drugs',
    vaccine: 'vaccines',
    vitamin: 'vitamins-and-supplements',
    disinfectant: 'disinfectants',
    pet: 'pet-supplies',
    other: 'other-lines',
  } satisfies Record<ProductCategory, string>,
  licence: {
    none: 'licences-and-lead-times',
    seedDealer: 'seed-dealer-registration',
    fpaDealer: 'fpa-dealer-licence',
    fpaDealerRepacker: 'fertilizer-repacking',
    fpaRestricted: 'banned-and-restricted-pesticides',
    baiFeed: 'bai-feed-licence',
    baiVetOutletOtc: 'vet-line-licences',
    baiVetOutletRx: 'vet-line-licences',
    baiBiologic: 'vet-line-licences',
  } satisfies Record<LicenceClass, string>,
  storage: {
    feed: 'feed-storage',
    feedIngredient: 'feed-storage',
    seed: 'seed-storage',
    fertilizer: 'fertilizer',
    pesticide: 'pesticide-storage',
    tool: 'tools-and-equipment',
    equipment: 'tools-and-equipment',
    vetDrug: 'veterinary-drugs',
    vaccine: 'cold-chain',
    vitamin: 'vitamins-and-supplements',
    disinfectant: 'pesticide-storage',
    pet: 'feed-storage',
    other: 'fefo-and-expiry',
  } satisfies Record<ProductCategory, string>,
  creditSale: 'credit-policy',
  alert: {
    lowStock: 'reorder-point',
    expiring: 'fefo-and-expiry',
    expired: 'fefo-and-expiry',
    deadStock: 'dead-stock',
    negativeStock: 'counts-and-shrinkage',
    countMismatch: 'counts-and-shrinkage',
  } satisfies Record<StockAlert['type'], string>,
  taxCard: 'tax-modes',
  buyingRule: {
    reorder: 'reorder-point',
    forwardBuy: 'price-signals',
    stopBuying: 'dead-stock',
    clearance: 'fefo-and-expiry',
    reprice: 'markup-practice',
  } satisfies Record<BuyingRecommendation['type'], string>,
  sellingRule: {
    bundle: 'bundles-and-starter-kits',
    delivery: 'delivery-economics',
    creditRisk: 'credit-policy',
    topCustomer: 'suki',
    seasonal: 'seasonal-pushes',
  } satisfies Record<SellingRecommendation['type'], string>,
  parameter: {
    targetMarginPct: 'markup-practice',
    carryingCostPctPerYear: 'carrying-cost',
    fundingRatePctPerYear: 'capital-sources',
    forwardBuyRiskMarginPts: 'price-signals',
    serviceLevelZ: 'reorder-point',
    deadStockDays: 'dead-stock',
    expiryWarningDays: 'fefo-and-expiry',
    creditTermsDays: 'credit-policy',
    latePaymentSharePct: 'credit-policy',
    allowancePct: 'receivables-aging',
    deliveryTripCost: 'delivery-economics',
    seasonalIndex: 'seasonal-indices',
  } satisfies Record<ParameterKey, string>,
  parameters: 'store-parameters',
  buyingRules: 'buying-rules',
  sellingRules: 'selling-rules',
  dashboard: 'dashboard-figures',
  backup: 'backup-and-sync',
}
