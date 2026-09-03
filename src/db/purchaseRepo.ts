import { daysBetween, isISODate, plusDays } from '../engine/dates'
import { STOCK_PURCHASES } from '../engine/finance'
import type { ISODate, Product, Purchase, PurchaseLine, StockLot, StockMove, Supplier, SupplierTerms, Transaction } from '../types'
import { db } from './db'
import { logReceiptPrice } from './priceLogRepo'
import { liveAll, liveWhere, newId, now, update } from './repo'
import { receiveLot } from './stockRepo'
import { getSupplier } from './supplierRepo'

// A purchase is the order: its lines carry the quantity and cost in the unit they were
// ordered by (base unit or a sell unit). One expense transaction is posted for the total
// (accrual, like the sale revenue; P5 design decision 1) and what is owed is total minus
// paidAmount, paid down by payable payments (5.3). Receiving is per line and partial
// (decision 2): each receipt opens a lot through receiveLot at the cost per base unit,
// logs the price (decision 3) and adds to the line's receivedQty, never above the order.

export interface PurchaseLineInput {
  productId: string
  qty: number // in `unit`
  unit: string
  unitCost: number // per `unit`
  lotNo?: string
  expiryDate?: ISODate
}

export interface PurchaseInput {
  date: ISODate
  supplierId: string
  lines: PurchaseLineInput[]
  paidAmount?: number // defaults to the total on COD terms, 0 otherwise
  notes?: string
}

export type PurchaseStatus = 'ordered' | 'partial' | 'received'

export { STOCK_PURCHASES }

const money = (n: number) => Math.round(n * 100) / 100
const perBase = (n: number) => Math.round(n * 10000) / 10000

const TERMS_DAYS: Record<SupplierTerms, number | undefined> = { cod: 0, days7: 7, days15: 15, days30: 30, other: undefined }

// The due date from the supplier terms: the order date on COD, none on other terms.
export function dueDateFor(date: ISODate, terms: SupplierTerms): ISODate | undefined {
  const days = TERMS_DAYS[terms]
  return days === undefined ? undefined : plusDays(date, days)
}

async function liveProduct(productId: string): Promise<Product> {
  const p = await db.products.get(productId)
  if (!p || p.deletedAt) throw new Error('Product not found')
  return p
}

async function liveSupplier(supplierId: string): Promise<Supplier> {
  const s = await getSupplier(supplierId)
  if (!s) throw new Error('Supplier not found')
  return s
}

// The base units in one purchase unit: 1 for the base unit, the factor of a sell unit.
function unitFactor(product: Product, unit: string): number {
  if (unit === product.baseUnit) return 1
  const sell = product.sellUnits.find((u) => u.unit === unit)
  if (!sell) throw new Error(`${product.name} is not bought by the ${unit}`)
  return sell.factor
}

export async function createPurchase(input: PurchaseInput): Promise<Purchase> {
  if (!isISODate(input.date)) throw new Error('Date must be YYYY-MM-DD')
  if (input.lines.length === 0) throw new Error('A purchase needs at least one line')
  return db.transaction('rw', [db.products, db.suppliers, db.purchases, db.transactions], async () => {
    const supplier = await liveSupplier(input.supplierId)
    const lines: PurchaseLine[] = []
    for (const l of input.lines) {
      const product = await liveProduct(l.productId)
      const unit = l.unit.trim()
      unitFactor(product, unit)
      if (!(Number.isFinite(l.qty) && l.qty > 0)) throw new Error(`${product.name}: the quantity must be above 0`)
      if (!(Number.isFinite(l.unitCost) && l.unitCost >= 0)) throw new Error(`${product.name}: the cost must be 0 or more`)
      if (l.expiryDate !== undefined && !isISODate(l.expiryDate)) throw new Error(`${product.name}: the expiry date must be YYYY-MM-DD`)
      lines.push({
        productId: product.id,
        qty: l.qty,
        unit,
        unitCost: l.unitCost,
        ...(l.lotNo?.trim() ? { lotNo: l.lotNo.trim() } : {}),
        ...(l.expiryDate ? { expiryDate: l.expiryDate } : {}),
        receivedQty: 0,
      })
    }
    const total = money(lines.reduce((s, l) => s + l.qty * l.unitCost, 0))
    const paidAmount = input.paidAmount ?? (supplier.terms === 'cod' ? total : 0)
    if (!(Number.isFinite(paidAmount) && paidAmount >= 0)) throw new Error('Paid amount must be 0 or more')
    if (paidAmount > total) throw new Error(`Paid amount ${paidAmount} is above the total ${total}`)
    const ts = now()
    const purchaseId = newId()
    const dueDate = dueDateFor(input.date, supplier.terms)
    const tx: Transaction | undefined =
      total > 0
        ? { id: newId(), updatedAt: ts, deletedAt: null, date: input.date, kind: 'expense', category: STOCK_PURCHASES, amount: total, links: { purchaseId } }
        : undefined
    const purchase: Purchase = {
      id: purchaseId,
      updatedAt: ts,
      deletedAt: null,
      date: input.date,
      supplierId: supplier.id,
      lines,
      total,
      paidAmount,
      ...(dueDate ? { dueDate } : {}),
      ...(tx ? { transactionId: tx.id } : {}),
      ...(input.notes?.trim() ? { notes: input.notes.trim() } : {}),
    }
    if (tx) await db.transactions.add(tx)
    await db.purchases.add(purchase)
    return purchase
  })
}

export function purchaseStatus(p: Purchase): PurchaseStatus {
  if (p.lines.every((l) => l.receivedQty >= l.qty)) return 'received'
  return p.lines.some((l) => l.receivedQty > 0) ? 'partial' : 'ordered'
}

export interface ReceiveLineInput {
  purchaseId: string
  lineIndex: number
  qty: number // in the line's unit
  date: ISODate
  lotNo?: string // the line's lot number otherwise
  expiryDate?: ISODate // the line's expiry, else the product's shelf life from the receipt date
  unitCost?: number // per the line's unit when the price changed at delivery; the ordered cost otherwise
}

export async function receiveLine(input: ReceiveLineInput): Promise<{ lot: StockLot; move: StockMove; purchase: Purchase }> {
  if (!isISODate(input.date)) throw new Error('Date must be YYYY-MM-DD')
  if (!(Number.isFinite(input.qty) && input.qty > 0)) throw new Error('The quantity must be above 0')
  if (input.unitCost !== undefined && !(Number.isFinite(input.unitCost) && input.unitCost >= 0)) throw new Error('The cost must be 0 or more')
  return db.transaction('rw', [db.products, db.suppliers, db.purchases, db.stockLots, db.stockMoves, db.priceLog], async () => {
    const purchase = await getPurchase(input.purchaseId)
    if (!purchase) throw new Error('Purchase not found')
    const line = purchase.lines[input.lineIndex]
    if (!line) throw new Error(`The purchase has no line ${input.lineIndex + 1}`)
    const product = await liveProduct(line.productId)
    const remaining = line.qty - line.receivedQty
    if (remaining <= 0) throw new Error(`${product.name} is fully received on this purchase`)
    if (input.qty > remaining) throw new Error(`Only ${remaining} ${line.unit} of ${product.name} left to receive`)
    const factor = unitFactor(product, line.unit)
    const unitCost = perBase((input.unitCost ?? line.unitCost) / factor)
    const { lot, move } = await receiveLot({
      productId: product.id,
      qty: input.qty * factor,
      unitCost,
      date: input.date,
      lotNo: input.lotNo ?? line.lotNo,
      expiryDate: input.expiryDate ?? line.expiryDate,
      purchaseId: purchase.id,
    })
    await logReceiptPrice({ date: input.date, productId: product.id, supplierId: purchase.supplierId, unitCost })
    const lines = purchase.lines.map((l, i) => (i === input.lineIndex ? { ...l, receivedQty: l.receivedQty + input.qty } : l))
    const updated = await update(db.purchases, purchase.id, { lines })
    return { lot, move, purchase: updated }
  })
}

export async function getPurchase(id: string): Promise<Purchase | undefined> {
  const p = await db.purchases.get(id)
  return p && !p.deletedAt ? p : undefined
}

const newestFirst = (a: Purchase, b: Purchase) => b.date.localeCompare(a.date) || b.updatedAt.localeCompare(a.updatedAt)

export async function listPurchases(opts: { supplierId?: string } = {}): Promise<Purchase[]> {
  const rows = opts.supplierId ? await liveWhere(db.purchases, 'supplierId', opts.supplierId) : await liveAll(db.purchases)
  return rows.sort(newestFirst)
}

export interface LeadTime {
  days: number | undefined
  learned: boolean // from receipts; false when it is the typed value or unknown
  samples: number
}

const LEAD_TIME_SAMPLES = 5

// The average days from order to first receipt over the supplier's last purchases that
// have a receipt (P5 design decision 4), falling back to the typed leadTimeDays.
export async function leadTimeFor(supplier: Supplier): Promise<LeadTime> {
  const purchases = (await liveWhere(db.purchases, 'supplierId', supplier.id)).sort((a, b) => b.date.localeCompare(a.date))
  const days: number[] = []
  for (const p of purchases) {
    if (days.length === LEAD_TIME_SAMPLES) break
    const lots = (await liveWhere(db.stockLots, 'purchaseId', p.id)).map((l) => l.receivedDate).sort()
    if (lots.length > 0) days.push(daysBetween(p.date, lots[0]))
  }
  if (days.length === 0) return { days: supplier.leadTimeDays, learned: false, samples: 0 }
  return { days: Math.round(days.reduce((s, d) => s + d, 0) / days.length), learned: true, samples: days.length }
}
