// Row types for the Dexie tables in src/db/db.ts (PLAN.md section 5, reviewed at P2
// against TASK 001 section 7 item r). Every table row extends BaseRow: `updatedAt`
// drives the newest-wins merge and `deletedAt` is the tombstone that lets sync
// propagate deletions (P10). Tombstones are on every table, including the ones the
// first cut left them off (store, stockMoves, priceLog, settings), so the merge
// treats every table alike.

export type ISODate = string // 'YYYY-MM-DD'
export type ISOTime = string // ISO 8601 timestamp, e.g. 2026-09-02T10:15:00.000Z

export interface BaseRow {
  id: string
  updatedAt: ISOTime
  deletedAt?: ISOTime | null
}

// Decision 7: tax is optional. off = nothing tax-related appears; nonVat = the
// percentage-tax or 8 percent estimate; vat = exempt lines split from VATable lines.
export type TaxMode = 'off' | 'nonVat' | 'vat'

export interface Store extends BaseRow {
  name: string
  location?: string
  currency: 'PHP'
  startDate: ISODate
  taxMode: TaxMode
}

export type SupplierTerms = 'cod' | 'days7' | 'days15' | 'days30' | 'other'

export interface Supplier extends BaseRow {
  name: string
  contact?: string
  terms: SupplierTerms
  leadTimeDays?: number
  notes?: string
}

export type CustomerType = 'backyard' | 'commercial' | 'farmer' | 'reseller' | 'pet' | 'other'

export interface Customer extends BaseRow {
  name: string
  contact?: string
  type: CustomerType
  creditLimit?: number
  deliveryAddress?: string
  notes?: string
}

// The category is the licence and tax boundary (PC section 11, refinement 1); species,
// stage, form and class are attributes. tool and equipment stay separate: equipment is
// the depreciated or serialised kind (sprayers, pumps), tool the consumable hand kind
// (refinement 9).
export type ProductCategory =
  | 'feed'
  | 'feedIngredient'
  | 'seed'
  | 'fertilizer'
  | 'pesticide'
  | 'tool'
  | 'equipment'
  | 'vetDrug'
  | 'vaccine'
  | 'vitamin'
  | 'disinfectant'
  | 'pet'
  | 'other'

export type Species =
  | 'hog'
  | 'broiler'
  | 'layer'
  | 'gamefowl'
  | 'duck'
  | 'quail'
  | 'cattle'
  | 'goat'
  | 'tilapia'
  | 'bangus'
  | 'dog'
  | 'cat'
  | 'other'

export type FeedStage =
  | 'booster'
  | 'preStarter'
  | 'starter'
  | 'grower'
  | 'finisher'
  | 'gestating'
  | 'lactating'
  | 'chick'
  | 'developer'
  | 'layer1'
  | 'layer2'
  | 'maintenance'
  | 'conditioning'
  | 'breeder'

export type ProductForm = 'mash' | 'crumble' | 'pellet' | 'granule' | 'liquid' | 'powder' | 'tablet' | 'injectable' | 'other'

// The licence the store must hold to sell the SKU (refinement 3); the store's own
// licences are a settings list, and a SKU whose class the store lacks is blocked.
export type LicenceClass =
  | 'none'
  | 'seedDealer' // seed dealer registration under RA 7308 (catalog section 10)
  | 'fpaDealer'
  | 'fpaDealerRepacker'
  | 'fpaRestricted'
  | 'baiFeed'
  | 'baiVetOutletOtc'
  | 'baiVetOutletRx'
  | 'baiBiologic'

export type ToxicityBand = 'red' | 'yellow' | 'blue' | 'green' // FPA label colour band (refinement 5)
export type PesticideClass = 'insecticide' | 'fungicide' | 'herbicide' | 'molluscicide' | 'rodenticide' | 'other'
export type RxClass = 'rx' | 'otc' // AO 111-B s.1991 (refinement 7)
export type Regulator = 'fpa' | 'bafs' | 'bai' | 'fda' // refinement 8

// A sell unit is `factor` base units sold at `price`: a 50 kg sack is { unit: 'sack',
// factor: 50 }, tingi per kg is { unit: 'kg', factor: 1 }.
export interface SellUnit {
  unit: string
  factor: number
  price: number
}

export interface Product extends BaseRow {
  name: string
  brand?: string
  category: ProductCategory
  species?: Species[]
  crops?: string[]
  stage?: FeedStage
  form?: ProductForm
  baseUnit: string
  sellUnits: SellUnit[]
  repackable: boolean
  repackSizes?: number[] // in base units (refinement 4)
  // Default derived from the category, overridable per SKU: gamefowl and pet feeds are
  // VATable specialty feeds under RR 16-2005 although their category is feed (refinement 2).
  vatExempt: boolean
  licenceClass: LicenceClass
  coldChain: boolean
  hasExpiry: boolean // lots carry expiry dates and FEFO applies (F3 expiry flag)
  lotShelfLifeDays?: number // default lot life from receipt when the label has no date (refinement 10)
  withdrawalDays?: Partial<Record<Species, number>> // vetDrug, per food species (refinement 6)
  rxClass?: RxClass // vetDrug and vitamin
  toxicityBand?: ToxicityBand // pesticide
  pesticideClass?: PesticideClass
  fpaRegNo?: string
  activeIngredient?: string
  regulator?: Regulator // fertilizer: fpa for inorganic, bafs for organic
  barcode?: string
  reorderLevel: number
  reorderQty: number
  targetMarginPct?: number
  // Extension-line SKU (vet drugs, vaccines, pet): seeded but hidden until the outlet
  // licence is in place (TASK 001 section 7 item u).
  extension?: boolean
}

export interface StockLot extends BaseRow {
  productId: string
  lotNo?: string
  expiryDate?: ISODate
  qtyOnHand: number // base units
  unitCost: number // per base unit
  receivedDate: ISODate
  purchaseId?: string
}

export type StockMoveReason = 'purchase' | 'sale' | 'repack' | 'adjustment' | 'loss' | 'expired' | 'return' | 'count'
export type StockMoveRefType = 'purchase' | 'sale' | 'count'

// Append-only: stock on hand is derived from moves, so two devices selling the same
// product offline do not overwrite each other (PLAN.md section 6, F8 known limit).
export interface StockMove extends BaseRow {
  productId: string
  lotId?: string
  date: ISODate
  qtyDelta: number // base units, negative for consumption
  // Cost per base unit at the time of the move: the receipt cost for stock in, the
  // product's weighted average (decision 8) for stock out; P6 reads COGS and write-off
  // values from these snapshots.
  unitCost: number
  reason: StockMoveReason
  refType?: StockMoveRefType
  refId?: string
  note?: string
}

// qty, receivedQty and unitCost are in `unit` (the product's base unit or one of its
// sell units); a receipt converts to base units when it opens the lot (P5 decision 2).
export interface PurchaseLine {
  productId: string
  qty: number
  unit: string
  unitCost: number
  lotNo?: string
  expiryDate?: ISODate
  receivedQty: number
}

export interface Purchase extends BaseRow {
  date: ISODate
  supplierId: string
  lines: PurchaseLine[]
  total: number
  paidAmount: number
  dueDate?: ISODate
  transactionId?: string
  notes?: string
}

export type PaymentMethod = 'cash' | 'gcash' | 'bank' | 'credit' | 'mixed'

export interface SaleLine {
  productId: string
  lotId?: string
  qty: number
  unit: string
  unitPrice: number
  unitCost: number
  vatExempt?: boolean // frozen from the product at sale time so a later edit never rewrites history
}

export interface Delivery {
  address: string
  fee: number
  status: 'pending' | 'delivered'
}

export interface Sale extends BaseRow {
  date: ISODate
  customerId?: string
  lines: SaleLine[]
  total: number
  paymentMethod: PaymentMethod
  paidAmount: number
  delivery?: Delivery
  transactionId?: string
  notes?: string
}

export type PaymentKind = 'receivable' | 'payable'

export interface Payment extends BaseRow {
  date: ISODate
  kind: PaymentKind
  customerId?: string
  supplierId?: string
  refId?: string // the sale or purchase being paid, when known
  amount: number
  method: Exclude<PaymentMethod, 'credit' | 'mixed'>
  transactionId?: string
  note?: string
}

export type TransactionKind = 'expense' | 'revenue' | 'capital' | 'drawing' | 'loan' | 'loanPayment'

export interface Transaction extends BaseRow {
  date: ISODate
  kind: TransactionKind
  category: string
  amount: number
  note?: string
  links: { saleId?: string; purchaseId?: string; paymentId?: string }
}

export type PriceKind = 'supplierPrice' | 'competitorPrice' | 'ownPrice'

export interface PriceObservation extends BaseRow {
  date: ISODate
  productId: string
  kind: PriceKind
  value: number
  unit: string
  source: 'own' | 'heard' | 'published'
  supplierId?: string
  note?: string
}

export interface Scenario extends BaseRow {
  name: string
  strategy: string // catalog id from PLAN.md section 9 (P7)
  params: Record<string, unknown>
  createdAt: ISOTime
}

// Keyed by name rather than id; still stamped so sync can merge it.
export interface Setting {
  key: string
  value: unknown
  updatedAt: ISOTime
  deletedAt?: ISOTime | null
}
