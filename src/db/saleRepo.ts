import { isISODate } from '../engine/dates'
import type { ISODate, PaymentMethod, Product, Sale, SaleLine, Transaction } from '../types'
import { db } from './db'
import { liveAll, liveWhere, newId, now, update } from './repo'
import { consume } from './stockRepo'

// A sale posts its lines through consume (FEFO, one move per lot at the running
// average, refType 'sale' under the sale id), so stock on hand stays a sum of moves
// (P3 design decision 1). Each line freezes unitPrice, unitCost and vatExempt at sale
// time so a later product edit never rewrites history; unitCost is per sell unit, like
// unitPrice, so line COGS is qty x unitCost. One revenue transaction is posted per sale
// for the full total (accrual); what is owed is total - paidAmount and lives on the
// customer ledger (4.2), paid down by receivable payments (4.3).

export interface SaleLineInput {
  productId: string
  qty: number // in the sell unit
  unit: string
  unitPrice?: number // typed price; the sell unit's list price otherwise
}

export interface SaleInput {
  date: ISODate
  customerId?: string
  lines: SaleLineInput[]
  paymentMethod: PaymentMethod
  paidAmount?: number // defaults to the total for cash, gcash and bank; 0 for credit
  delivery?: { address: string; fee: number }
  notes?: string
}

const money = (n: number) => Math.round(n * 100) / 100

async function liveProduct(productId: string): Promise<Product> {
  const p = await db.products.get(productId)
  if (!p || p.deletedAt) throw new Error('Product not found')
  return p
}

export async function createSale(input: SaleInput): Promise<Sale> {
  if (!isISODate(input.date)) throw new Error('Date must be a valid YYYY-MM-DD date')
  if (!input.lines.length) throw new Error('A sale needs at least one line')
  for (const l of input.lines) {
    if (!(Number.isFinite(l.qty) && l.qty > 0)) throw new Error('Quantity must be above 0')
    if (l.unitPrice !== undefined && !(Number.isFinite(l.unitPrice) && l.unitPrice >= 0)) throw new Error('Price must be 0 or more')
  }
  if (input.delivery && !(Number.isFinite(input.delivery.fee) && input.delivery.fee >= 0)) throw new Error('Delivery fee must be 0 or more')
  if (input.delivery && !input.delivery.address.trim()) throw new Error('Delivery needs an address')

  return db.transaction('rw', [db.products, db.stockLots, db.stockMoves, db.sales, db.transactions, db.customers], async () => {
    const saleId = newId()
    const lines: SaleLine[] = []
    for (const l of input.lines) {
      const product = await liveProduct(l.productId)
      const sell = product.sellUnits.find((u) => u.unit === l.unit)
      if (!sell) throw new Error(`${product.name} is not sold by the ${l.unit}`)
      const unitPrice = l.unitPrice ?? sell.price
      if (!(unitPrice > 0)) throw new Error(`${product.name} has no price yet: type one in`)
      const { unitCost } = await consume({ productId: product.id, qty: l.qty * sell.factor, date: input.date, reason: 'sale', refType: 'sale', refId: saleId })
      lines.push({ productId: product.id, qty: l.qty, unit: l.unit, unitPrice, unitCost: money(unitCost * sell.factor), vatExempt: product.vatExempt })
    }
    const goods = lines.reduce((s, l) => s + l.qty * l.unitPrice, 0)
    const total = money(goods + (input.delivery?.fee ?? 0))
    const paidAmount = input.paidAmount ?? (input.paymentMethod === 'credit' ? 0 : total)
    if (!(Number.isFinite(paidAmount) && paidAmount >= 0)) throw new Error('Paid amount must be 0 or more')
    if (paidAmount > total) throw new Error(`Paid amount ${paidAmount} is above the total ${total}`)
    if (paidAmount < total) {
      if (!input.customerId) throw new Error('A sale on credit needs a customer')
      const c = await db.customers.get(input.customerId)
      if (!c || c.deletedAt) throw new Error('Customer not found')
    }
    const ts = now()
    const tx: Transaction = {
      id: newId(),
      updatedAt: ts,
      deletedAt: null,
      date: input.date,
      kind: 'revenue',
      category: 'sales',
      amount: total,
      links: { saleId },
    }
    const sale: Sale = {
      id: saleId,
      updatedAt: ts,
      deletedAt: null,
      date: input.date,
      ...(input.customerId ? { customerId: input.customerId } : {}),
      lines,
      total,
      paymentMethod: input.paymentMethod,
      paidAmount,
      ...(input.delivery ? { delivery: { address: input.delivery.address.trim(), fee: input.delivery.fee, status: 'pending' as const } } : {}),
      transactionId: tx.id,
      ...(input.notes?.trim() ? { notes: input.notes.trim() } : {}),
    }
    await db.transactions.add(tx)
    await db.sales.add(sale)
    return sale
  })
}

export async function getSale(id: string): Promise<Sale | undefined> {
  const s = await db.sales.get(id)
  return s && !s.deletedAt ? s : undefined
}

const newestFirst = (a: Sale, b: Sale) => b.date.localeCompare(a.date) || b.updatedAt.localeCompare(a.updatedAt)

export async function listSales(range: { from?: ISODate; to?: ISODate } = {}): Promise<Sale[]> {
  const all = await liveAll(db.sales)
  return all.filter((s) => (!range.from || s.date >= range.from) && (!range.to || s.date <= range.to)).sort(newestFirst)
}

export async function salesForCustomer(customerId: string): Promise<Sale[]> {
  return (await liveWhere(db.sales, 'customerId', customerId)).sort(newestFirst)
}

// Deliveries are sales with a delivery block; pending ones list oldest first so the
// longest-waiting customer is at the top.
export async function listDeliveries(status: 'pending' | 'delivered' = 'pending'): Promise<Sale[]> {
  const all = await liveAll(db.sales)
  return all.filter((s) => s.delivery?.status === status).sort((a, b) => a.date.localeCompare(b.date) || a.updatedAt.localeCompare(b.updatedAt))
}

export async function markDelivered(saleId: string): Promise<Sale> {
  const sale = await getSale(saleId)
  if (!sale) throw new Error('Sale not found')
  if (!sale.delivery) throw new Error('This sale has no delivery')
  if (sale.delivery.status === 'delivered') throw new Error('Already delivered')
  return update(db.sales, saleId, { delivery: { ...sale.delivery, status: 'delivered' } })
}
