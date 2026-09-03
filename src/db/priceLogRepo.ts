import { isISODate } from '../engine/dates'
import type { ISODate, PriceObservation, Product } from '../types'
import { db } from './db'
import { create, liveWhere, type NewRow } from './repo'
import { getSupplier } from './supplierRepo'

// The price log holds what the store paid, was quoted, heard or charged for a product
// (PLAN.md F5; P7 reads it for the forward-buy signal and the supplier comparison).
// Every receipt joins it automatically through logReceiptPrice (P5 design decision 3);
// the other entries are typed by hand. A value is per `unit`, which is the product's
// base unit or one of its sell units, so perBaseUnit can compare entries.

export type PriceInput = Omit<NewRow<PriceObservation>, 'note'> & { note?: string }

async function validate(input: PriceInput): Promise<NewRow<PriceObservation>> {
  if (!isISODate(input.date)) throw new Error('Date must be YYYY-MM-DD')
  const product = await db.products.get(input.productId)
  if (!product || product.deletedAt) throw new Error('Product not found')
  if (!(Number.isFinite(input.value) && input.value > 0)) throw new Error('Price must be above 0')
  const unit = input.unit.trim()
  if (unit !== product.baseUnit && !product.sellUnits.some((u) => u.unit === unit)) throw new Error(`${product.name} is not priced by the ${unit}`)
  if (input.kind === 'supplierPrice') {
    if (!input.supplierId) throw new Error('A supplier price needs the supplier')
    if (!(await getSupplier(input.supplierId))) throw new Error('Supplier not found')
  }
  return {
    ...input,
    unit,
    ...(input.note?.trim() ? { note: input.note.trim() } : {}),
  }
}

export async function recordPrice(input: PriceInput): Promise<PriceObservation> {
  return create(db.priceLog, await validate(input))
}

// The receipt hook: 5.2 calls it with the received cost per base unit. The lot carries the
// purchase id; the log entry only says it came from a receipt.
export function logReceiptPrice(input: { date: ISODate; productId: string; supplierId: string; unitCost: number }): Promise<PriceObservation> {
  return db.transaction('rw', db.products, db.suppliers, db.priceLog, async () => {
    const product = await db.products.get(input.productId)
    if (!product || product.deletedAt) throw new Error('Product not found')
    return recordPrice({
      date: input.date,
      productId: input.productId,
      kind: 'supplierPrice',
      value: input.unitCost,
      unit: product.baseUnit,
      source: 'own',
      supplierId: input.supplierId,
      note: 'received',
    })
  })
}

// Per base unit, so a sack quote and a per-kg receipt compare (rounded to four decimals).
export function perBaseUnit(o: PriceObservation, product: Product): number {
  const factor = o.unit === product.baseUnit ? 1 : (product.sellUnits.find((u) => u.unit === o.unit)?.factor ?? 1)
  return Math.round((o.value / factor) * 10000) / 10000
}

const newestFirst = (a: PriceObservation, b: PriceObservation) => b.date.localeCompare(a.date) || b.updatedAt.localeCompare(a.updatedAt)

export async function priceHistory(productId: string): Promise<PriceObservation[]> {
  return (await liveWhere(db.priceLog, 'productId', productId)).sort(newestFirst)
}

// The newest entry per kind and supplier: one competitor price, one own price, one per supplier.
export async function latestPrices(productId: string): Promise<PriceObservation[]> {
  const seen = new Set<string>()
  return (await priceHistory(productId)).filter((o) => {
    const key = `${o.kind}:${o.supplierId ?? ''}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

// The supplier's newest price per product, newest first.
export async function supplierPrices(supplierId: string): Promise<PriceObservation[]> {
  const rows = (await liveWhere(db.priceLog, 'kind', 'supplierPrice')).filter((o) => o.supplierId === supplierId).sort(newestFirst)
  const seen = new Set<string>()
  return rows.filter((o) => (seen.has(o.productId) ? false : (seen.add(o.productId), true)))
}
