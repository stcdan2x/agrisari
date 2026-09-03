import type { IndexableType } from 'dexie'
import type { BaseRow, ISOTime } from '../types'
import type { SyncTable } from './db'

export type NewRow<T extends BaseRow> = Omit<T, 'id' | 'updatedAt' | 'deletedAt'>

export function newId(): string {
  return crypto.randomUUID()
}

export function now(): ISOTime {
  return new Date().toISOString()
}

// Insert a row with a fresh id and timestamp; the row starts live (no tombstone).
export async function create<T extends BaseRow>(table: SyncTable<T>, data: NewRow<T>): Promise<T> {
  const row = { ...data, id: newId(), updatedAt: now(), deletedAt: null } as T
  await table.add(row)
  return row
}

// Merge a patch into an existing row and bump updatedAt so the change wins a
// newest-wins merge on another device.
export async function update<T extends BaseRow>(
  table: SyncTable<T>,
  id: string,
  patch: Partial<Omit<T, 'id'>>,
): Promise<T> {
  const existing = await table.get(id)
  if (!existing) throw new Error(`${table.name}: no row with id ${id}`)
  const row = { ...existing, ...patch, id, updatedAt: now() } as T
  await table.put(row)
  return row
}

// Deletion is a tombstone, never a physical delete, so sync can propagate it.
// Both stamps come from one timestamp so updatedAt === deletedAt holds exactly
// (pg-farm F4: routing through update() restamped updatedAt a tick later).
export async function softDelete<T extends BaseRow>(table: SyncTable<T>, id: string): Promise<void> {
  const existing = await table.get(id)
  if (!existing) throw new Error(`${table.name}: no row with id ${id}`)
  const ts = now()
  await table.put({ ...existing, updatedAt: ts, deletedAt: ts })
}

const isLive = <T extends BaseRow>(row: T) => !row.deletedAt

export async function liveAll<T extends BaseRow>(table: SyncTable<T>): Promise<T[]> {
  return table.filter(isLive).toArray()
}

export async function liveWhere<T extends BaseRow>(
  table: SyncTable<T>,
  index: string,
  value: IndexableType,
): Promise<T[]> {
  return table.where(index).equals(value).filter(isLive).toArray()
}
