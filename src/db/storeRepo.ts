import type { Store } from '../types'
import { db, STORE_ID } from './db'
import { now } from './repo'

export type StoreProfile = Omit<Store, 'id' | 'currency' | 'updatedAt' | 'deletedAt'>

export async function getStore(): Promise<Store | undefined> {
  return db.store.get(STORE_ID)
}

// Single row, fixed id; currency is PHP for every store in v1 (PLAN.md section 5).
// taxMode is part of the profile (decision 7) and defaults to 'off' in the UI.
export async function saveStore(data: StoreProfile): Promise<Store> {
  const store: Store = { ...data, id: STORE_ID, currency: 'PHP', updatedAt: now(), deletedAt: null }
  await db.store.put(store)
  return store
}
