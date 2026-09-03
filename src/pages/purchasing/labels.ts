import type { PurchaseStatus } from '../../db/purchaseRepo'
import type { PriceKind, PriceObservation, SupplierTerms } from '../../types'

export const TERMS_LABEL: Record<SupplierTerms, string> = {
  cod: 'COD',
  days7: '7 days',
  days15: '15 days',
  days30: '30 days',
  other: 'Other',
}

export const PRICE_KIND_LABEL: Record<PriceKind, string> = {
  supplierPrice: 'Supplier price',
  competitorPrice: 'Competitor price',
  ownPrice: 'Own price',
}

export const SOURCE_LABEL: Record<PriceObservation['source'], string> = {
  own: 'Paid or set by us',
  heard: 'Heard or quoted',
  published: 'Published list',
}

export const STATUS_LABEL: Record<PurchaseStatus, string> = { ordered: 'ordered', partial: 'part received', received: 'received' }
export const STATUS_TONE: Record<PurchaseStatus, 'slate' | 'amber' | 'green'> = { ordered: 'slate', partial: 'amber', received: 'green' }
