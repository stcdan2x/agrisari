import { daysBetween, isISODate } from '../engine/dates'
import type { ISODate, Payment } from '../types'
import { customerLedger, getCustomer } from './customerRepo'
import { db } from './db'
import { create, liveAll, liveWhere } from './repo'
import { getSupplier } from './supplierRepo'

// A receivable payment pays down the customer's listahan. It posts no transaction: the
// revenue was recognised on the sale (saleRepo), and the P6 cash flow reads payments
// directly. Aging settles the oldest open charges first (FIFO), so a part payment
// always leaves the newest charges open.

export interface ReceivableInput {
  customerId: string
  date: ISODate
  amount: number
  method: Payment['method']
  refId?: string // the sale being paid, when known
  note?: string
}

export async function recordReceivable(input: ReceivableInput): Promise<Payment> {
  if (!(Number.isFinite(input.amount) && input.amount > 0)) throw new Error('Amount must be above 0')
  if (!isISODate(input.date)) throw new Error('Date must be a valid YYYY-MM-DD date')
  if (!(await getCustomer(input.customerId))) throw new Error('Customer not found')
  if (input.refId) {
    const sale = await db.sales.get(input.refId)
    if (!sale || sale.deletedAt || sale.customerId !== input.customerId) throw new Error('Sale not found for this customer')
  }
  return create(db.payments, {
    date: input.date,
    kind: 'receivable',
    customerId: input.customerId,
    ...(input.refId ? { refId: input.refId } : {}),
    amount: input.amount,
    method: input.method,
    ...(input.note?.trim() ? { note: input.note.trim() } : {}),
  })
}

export async function paymentsForCustomer(customerId: string): Promise<Payment[]> {
  return (await liveWhere(db.payments, 'customerId', customerId))
    .filter((p) => p.kind === 'receivable')
    .sort((a, b) => b.date.localeCompare(a.date) || b.updatedAt.localeCompare(a.updatedAt))
}

export interface Aging {
  total: number
  current: number // up to 30 days
  d31: number // 31 to 60
  d61: number // 61 to 90
  d90: number // over 90
  oldest?: ISODate // the oldest charge still open
}

export interface CustomerAging extends Aging {
  customerId: string
  name: string
}

const money = (n: number) => Math.round(n * 100) / 100

export async function customerAging(customerId: string, today: ISODate): Promise<Aging> {
  const ledger = await customerLedger(customerId)
  let credit = ledger.filter((e) => e.kind === 'payment').reduce((s, e) => s + e.amount, 0)
  const aging: Aging = { total: 0, current: 0, d31: 0, d61: 0, d90: 0 }
  for (const charge of ledger.filter((e) => e.kind === 'charge')) {
    const settled = Math.min(charge.amount, credit)
    credit -= settled
    const open = money(charge.amount - settled)
    if (open <= 0) continue
    const days = daysBetween(charge.date, today)
    const bucket: keyof Omit<Aging, 'total' | 'oldest'> = days <= 30 ? 'current' : days <= 60 ? 'd31' : days <= 90 ? 'd61' : 'd90'
    aging[bucket] = money(aging[bucket] + open)
    aging.total = money(aging.total + open)
    if (!aging.oldest) aging.oldest = charge.date
  }
  return aging
}

// Every customer with something open, largest balance first.
export async function receivablesAging(today: ISODate): Promise<CustomerAging[]> {
  const customers = await liveAll(db.customers)
  const rows: CustomerAging[] = []
  for (const c of customers) {
    const aging = await customerAging(c.id, today)
    if (aging.total > 0) rows.push({ customerId: c.id, name: c.name, ...aging })
  }
  return rows.sort((a, b) => b.total - a.total || a.name.localeCompare(b.name))
}

// A payable payment pays down what a supplier is owed. Like the receivable side it posts
// no transaction: the expense was recognised on the purchase (purchaseRepo), and the P6
// cash flow reads payments directly. Settlement is FIFO by purchase date, so a part
// payment always leaves the newest purchases open.

export interface PayableInput {
  supplierId: string
  date: ISODate
  amount: number
  method: Payment['method']
  refId?: string // the purchase being paid, when known
  note?: string
}

export async function recordPayable(input: PayableInput): Promise<Payment> {
  if (!(Number.isFinite(input.amount) && input.amount > 0)) throw new Error('Amount must be above 0')
  if (!isISODate(input.date)) throw new Error('Date must be a valid YYYY-MM-DD date')
  if (!(await getSupplier(input.supplierId))) throw new Error('Supplier not found')
  if (input.refId) {
    const purchase = await db.purchases.get(input.refId)
    if (!purchase || purchase.deletedAt || purchase.supplierId !== input.supplierId) throw new Error('Purchase not found for this supplier')
  }
  return create(db.payments, {
    date: input.date,
    kind: 'payable',
    supplierId: input.supplierId,
    ...(input.refId ? { refId: input.refId } : {}),
    amount: input.amount,
    method: input.method,
    ...(input.note?.trim() ? { note: input.note.trim() } : {}),
  })
}

export async function paymentsForSupplier(supplierId: string): Promise<Payment[]> {
  return (await liveWhere(db.payments, 'supplierId', supplierId))
    .filter((p) => p.kind === 'payable')
    .sort((a, b) => b.date.localeCompare(a.date) || b.updatedAt.localeCompare(a.updatedAt))
}

export interface PayableRow {
  purchaseId: string
  supplierId: string
  supplierName: string
  date: ISODate // ordered
  dueDate?: ISODate
  total: number
  open: number // still owed after FIFO settlement
  overdue: boolean
  daysOverdue: number
}

// The supplier's open purchases after its payable payments are applied oldest first.
async function openPurchases(supplierId: string, supplierName: string, today?: ISODate): Promise<PayableRow[]> {
  const purchases = (await liveWhere(db.purchases, 'supplierId', supplierId)).sort((a, b) => a.date.localeCompare(b.date) || a.updatedAt.localeCompare(b.updatedAt))
  let credit = (await paymentsForSupplier(supplierId)).reduce((s, p) => s + p.amount, 0)
  const rows: PayableRow[] = []
  for (const p of purchases) {
    const owed = money(p.total - p.paidAmount)
    if (owed <= 0) continue
    const settled = Math.min(owed, credit)
    credit -= settled
    const open = money(owed - settled)
    if (open <= 0) continue
    const daysOverdue = p.dueDate && today ? Math.max(0, daysBetween(p.dueDate, today)) : 0
    rows.push({ purchaseId: p.id, supplierId, supplierName, date: p.date, ...(p.dueDate ? { dueDate: p.dueDate } : {}), total: p.total, open, overdue: daysOverdue > 0, daysOverdue })
  }
  return rows
}

// One supplier's open purchases, oldest first.
export async function supplierPayables(supplierId: string, today?: ISODate): Promise<PayableRow[]> {
  const s = await getSupplier(supplierId)
  return s ? openPurchases(supplierId, s.name, today) : []
}

export async function supplierBalance(supplierId: string): Promise<number> {
  return money((await supplierPayables(supplierId)).reduce((sum, r) => sum + r.open, 0))
}

// Every open purchase across suppliers, earliest due first; purchases without a due date last.
export async function payablesSchedule(today: ISODate): Promise<PayableRow[]> {
  const suppliers = await liveAll(db.suppliers)
  const rows: PayableRow[] = []
  for (const s of suppliers) rows.push(...(await openPurchases(s.id, s.name, today)))
  return rows.sort((a, b) => {
    if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate) || a.date.localeCompare(b.date)
    if (a.dueDate || b.dueDate) return a.dueDate ? -1 : 1
    return a.date.localeCompare(b.date)
  })
}
