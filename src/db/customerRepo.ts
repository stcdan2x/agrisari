import type { Customer, ISODate } from '../types'
import { db } from './db'
import { create, liveAll, liveWhere, update, type NewRow } from './repo'

// The customer ledger (listahan) is derived, never stored: a charge for every sale that
// left something owed (total - paidAmount) and a credit for every receivable payment.
// The credit limit is soft (PLAN.md F4): creditCheck reports it, the sale screen warns
// and asks for a note, createSale never refuses on it.

export type CustomerInput = Pick<Customer, 'name' | 'type'> & Partial<Omit<Customer, 'id' | 'updatedAt' | 'deletedAt' | 'name' | 'type'>>

function validate(input: CustomerInput): NewRow<Customer> {
  const name = input.name.trim()
  if (!name) throw new Error('Name is required')
  if (input.creditLimit !== undefined && !(Number.isFinite(input.creditLimit) && input.creditLimit >= 0)) throw new Error('Credit limit must be 0 or more')
  return {
    ...input,
    name,
    ...(input.contact?.trim() ? { contact: input.contact.trim() } : {}),
    ...(input.deliveryAddress?.trim() ? { deliveryAddress: input.deliveryAddress.trim() } : {}),
    ...(input.notes?.trim() ? { notes: input.notes.trim() } : {}),
  }
}

export async function createCustomer(input: CustomerInput): Promise<Customer> {
  return create(db.customers, validate(input))
}

export async function updateCustomer(id: string, patch: Partial<CustomerInput>): Promise<Customer> {
  const existing = await getCustomer(id)
  if (!existing) throw new Error('Customer not found')
  return update(db.customers, id, validate({ ...existing, ...patch }))
}

export async function getCustomer(id: string): Promise<Customer | undefined> {
  const c = await db.customers.get(id)
  return c && !c.deletedAt ? c : undefined
}

export async function listCustomers(): Promise<Customer[]> {
  return (await liveAll(db.customers)).sort((a, b) => a.name.localeCompare(b.name))
}

export interface LedgerEntry {
  date: ISODate
  kind: 'charge' | 'payment'
  amount: number
  balance: number // running, after this entry
  refId: string // the sale or the payment
  updatedAt: string
}

export async function customerLedger(customerId: string): Promise<LedgerEntry[]> {
  const sales = await liveWhere(db.sales, 'customerId', customerId)
  const payments = (await liveWhere(db.payments, 'customerId', customerId)).filter((p) => p.kind === 'receivable')
  const entries: Omit<LedgerEntry, 'balance'>[] = [
    ...sales.filter((s) => s.total > s.paidAmount).map((s) => ({ date: s.date, kind: 'charge' as const, amount: s.total - s.paidAmount, refId: s.id, updatedAt: s.updatedAt })),
    ...payments.map((p) => ({ date: p.date, kind: 'payment' as const, amount: p.amount, refId: p.id, updatedAt: p.updatedAt })),
  ].sort((a, b) => a.date.localeCompare(b.date) || a.updatedAt.localeCompare(b.updatedAt))
  let balance = 0
  return entries.map((e) => {
    balance += e.kind === 'charge' ? e.amount : -e.amount
    return { ...e, balance: Math.round(balance * 100) / 100 }
  })
}

export async function customerBalance(customerId: string): Promise<number> {
  const ledger = await customerLedger(customerId)
  return ledger.length ? ledger[ledger.length - 1].balance : 0
}

export interface CreditCheck {
  limit: number | undefined
  balance: number
  after: number
  over: boolean
}

// What the ledger would hold after `owed` more; over only when a limit is set.
export async function creditCheck(customerId: string, owed: number): Promise<CreditCheck> {
  const c = await getCustomer(customerId)
  const balance = await customerBalance(customerId)
  const after = Math.round((balance + owed) * 100) / 100
  const limit = c?.creditLimit
  return { limit, balance, after, over: limit !== undefined && limit > 0 && after > limit }
}

export interface TopProduct {
  productId: string
  name: string
  qty: number // in the product's base unit
  unit: string
  spend: number
  times: number // sales that carried the product
}

export interface CustomerHistory {
  sales: number
  spend: number
  firstVisit?: ISODate
  lastVisit?: ISODate
  topProducts: TopProduct[] // by base-unit quantity, then spend
}

// What the customer buys, how often and when: the card shows it and the P7 recommender
// reads it (bundles, credit risk, seasonal pushes).
export async function customerHistory(customerId: string): Promise<CustomerHistory> {
  const sales = await liveWhere(db.sales, 'customerId', customerId)
  if (sales.length === 0) return { sales: 0, spend: 0, topProducts: [] }
  const products = new Map((await liveAll(db.products)).map((p) => [p.id, p]))
  const top = new Map<string, TopProduct>()
  for (const s of sales) {
    const seen = new Set<string>()
    for (const l of s.lines) {
      const p = products.get(l.productId)
      const factor = p?.sellUnits.find((u) => u.unit === l.unit)?.factor ?? 1
      const row = top.get(l.productId) ?? { productId: l.productId, name: p?.name ?? l.productId, qty: 0, unit: p?.baseUnit ?? l.unit, spend: 0, times: 0 }
      row.qty += l.qty * factor
      row.spend = Math.round((row.spend + l.qty * l.unitPrice) * 100) / 100
      if (!seen.has(l.productId)) {
        row.times += 1
        seen.add(l.productId)
      }
      top.set(l.productId, row)
    }
  }
  const dates = sales.map((s) => s.date).sort()
  return {
    sales: sales.length,
    spend: Math.round(sales.reduce((s, x) => s + x.total, 0) * 100) / 100,
    firstVisit: dates[0],
    lastVisit: dates[dates.length - 1],
    topProducts: [...top.values()].sort((a, b) => b.qty - a.qty || b.spend - a.spend),
  }
}
