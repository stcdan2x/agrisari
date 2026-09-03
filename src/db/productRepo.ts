import { CATEGORY_DEFAULTS, CATEGORY_ORDER } from '../knowledge/categories'
import type { Product, SellUnit } from '../types'
import { db } from './db'
import { liveAll, newId, now, update, type NewRow } from './repo'

// A product needs its name, category, base unit and sell units; everything the category
// research fixes by default (VAT, lot life, licence, repacking, cold chain) is optional.
export type ProductInput = Pick<Product, 'name' | 'category' | 'baseUnit' | 'sellUnits'> &
  Partial<Omit<NewRow<Product>, 'name' | 'category' | 'baseUnit' | 'sellUnits'>>

const nonNegative = (n: number) => Number.isFinite(n) && n >= 0

function validate(input: Partial<ProductInput>): void {
  if (input.name !== undefined && !input.name.trim()) throw new Error('A product name is required')
  if (input.baseUnit !== undefined && !input.baseUnit.trim()) throw new Error('A base unit is required (kg, bag, bottle, piece, ...)')
  if (input.sellUnits !== undefined) {
    if (input.sellUnits.length === 0) throw new Error('At least one sell unit is required')
    const seen = new Set<string>()
    for (const su of input.sellUnits) {
      if (!su.unit.trim()) throw new Error('Every sell unit needs a unit name')
      if (!(Number.isFinite(su.factor) && su.factor > 0)) throw new Error(`The factor of ${su.unit} must be above 0`)
      if (!nonNegative(su.price)) throw new Error(`The price of ${su.unit} must be 0 or more`)
      if (seen.has(su.unit.trim())) throw new Error(`The sell unit ${su.unit.trim()} is listed twice`)
      seen.add(su.unit.trim())
    }
  }
  if (input.reorderLevel !== undefined && !nonNegative(input.reorderLevel)) throw new Error('Reorder level must be 0 or more')
  if (input.reorderQty !== undefined && !nonNegative(input.reorderQty)) throw new Error('Reorder quantity must be 0 or more')
  if (input.lotShelfLifeDays !== undefined && !(Number.isFinite(input.lotShelfLifeDays) && input.lotShelfLifeDays > 0)) {
    throw new Error('Lot shelf life must be above 0 days')
  }
}

const trimUnits = (units: SellUnit[]): SellUnit[] => units.map((u) => ({ ...u, unit: u.unit.trim() }))

function tidy<T extends Partial<ProductInput>>(input: T): T {
  const out = { ...input }
  if (out.name !== undefined) out.name = out.name.trim()
  if (out.baseUnit !== undefined) out.baseUnit = out.baseUnit.trim()
  if (out.sellUnits !== undefined) out.sellUnits = trimUnits(out.sellUnits)
  if (out.barcode !== undefined) out.barcode = out.barcode.trim() || undefined
  return out
}

// Fills the category defaults under the SKU's own values.
export function withCategoryDefaults(input: ProductInput): NewRow<Product> {
  const d = CATEGORY_DEFAULTS[input.category]
  return {
    vatExempt: d.vatExempt,
    hasExpiry: d.hasExpiry,
    ...(d.lotShelfLifeDays !== undefined ? { lotShelfLifeDays: d.lotShelfLifeDays } : {}),
    repackable: d.repackable,
    licenceClass: d.licenceClass,
    coldChain: d.coldChain,
    reorderLevel: 0,
    reorderQty: 0,
    ...tidy(input),
  }
}

export async function createProduct(input: ProductInput): Promise<Product> {
  validate(input)
  const row: Product = { ...withCategoryDefaults(input), id: newId(), updatedAt: now(), deletedAt: null }
  await db.products.add(row)
  return row
}

export async function updateProduct(id: string, patch: Partial<ProductInput>): Promise<Product> {
  validate(patch)
  return update(db.products, id, tidy(patch))
}

export async function getProduct(id: string): Promise<Product | undefined> {
  return db.products.get(id)
}

export async function findByBarcode(barcode: string): Promise<Product | undefined> {
  const rows = await db.products.where('barcode').equals(barcode.trim()).toArray()
  return rows.find((p) => !p.deletedAt)
}

const rank = (p: Product) => CATEGORY_ORDER.indexOf(p.category)

export async function listProducts(opts: { includeExtension?: boolean } = {}): Promise<Product[]> {
  const rows = await liveAll(db.products)
  return rows
    .filter((p) => opts.includeExtension || !p.extension)
    .sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name))
}
