import type { Supplier, SupplierTerms } from '../types'
import { db } from './db'
import { create, liveAll, update, type NewRow } from './repo'

// Suppliers carry the payment terms that set a purchase's due date (5.3) and a typed lead
// time that the learned order-to-receipt days replace once there are receipts (P5 design
// decision 4). What a supplier is owed is derived from purchases and payable payments,
// like the customer listahan, and never stored here.

export const SUPPLIER_TERMS: SupplierTerms[] = ['cod', 'days7', 'days15', 'days30', 'other']

export type SupplierInput = Pick<Supplier, 'name' | 'terms'> & Partial<Omit<Supplier, 'id' | 'updatedAt' | 'deletedAt' | 'name' | 'terms'>>

function validate(input: SupplierInput): NewRow<Supplier> {
  const name = input.name.trim()
  if (!name) throw new Error('Name is required')
  if (!SUPPLIER_TERMS.includes(input.terms)) throw new Error('Terms must be COD, 7, 15 or 30 days, or other')
  if (input.leadTimeDays !== undefined && !(Number.isInteger(input.leadTimeDays) && input.leadTimeDays >= 0)) throw new Error('Lead time must be a whole number of days, 0 or more')
  return {
    ...input,
    name,
    ...(input.contact?.trim() ? { contact: input.contact.trim() } : {}),
    ...(input.notes?.trim() ? { notes: input.notes.trim() } : {}),
  }
}

export async function createSupplier(input: SupplierInput): Promise<Supplier> {
  return create(db.suppliers, validate(input))
}

export async function updateSupplier(id: string, patch: Partial<SupplierInput>): Promise<Supplier> {
  const existing = await getSupplier(id)
  if (!existing) throw new Error('Supplier not found')
  return update(db.suppliers, id, validate({ ...existing, ...patch }))
}

export async function getSupplier(id: string): Promise<Supplier | undefined> {
  const s = await db.suppliers.get(id)
  return s && !s.deletedAt ? s : undefined
}

export async function listSuppliers(): Promise<Supplier[]> {
  return (await liveAll(db.suppliers)).sort((a, b) => a.name.localeCompare(b.name))
}
