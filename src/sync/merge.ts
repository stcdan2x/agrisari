import type { Snapshot } from '../db/backup'
import type { ISOTime } from '../types'

// The newest-wins merge shared by backup import (P10 step 10.1) and sync (10.2): every row
// carries updatedAt, and a deletion is a tombstone whose deletedAt equals its updatedAt
// (src/db/repo.ts softDelete), so the newer stamp wins whether it is an edit or a deletion.
// Two different rows with the same stamp (two devices in the same millisecond) are ordered by
// their canonical JSON so every device picks the same one and the merge stays symmetric.
// Stock is never merged as a number: it is the sum of the stock moves, which only ever get
// added, so two sales on two devices both survive (F8); the lot caches are rebuilt after
// a merge by stockRepo.rebuildLotQuantities.
export interface Stamped {
  updatedAt: ISOTime
  deletedAt?: ISOTime | null
}

type Row = Stamped & Record<string, unknown>

// Every table is keyed by id except settings, keyed by name (src/db/db.ts).
export const DEFAULT_KEYS: Record<string, string> = { settings: 'key' }

// The row's effective stamp: a tombstone stamped later than its last edit still counts as
// the deletion time, so a deletion wins over an older edit even if the two stamps differ.
export const stampOf = (row: Stamped): ISOTime => (row.deletedAt && row.deletedAt > row.updatedAt ? row.deletedAt : row.updatedAt)

const canonical = (row: object) => JSON.stringify(row, Object.keys(row).sort())

// The winner of two versions of one row; identical content returns the first argument.
export function pickNewer<T extends Stamped>(a: T, b: T): T {
  const sa = stampOf(a)
  const sb = stampOf(b)
  if (sa !== sb) return sa > sb ? a : b
  const ca = canonical(a)
  const cb = canonical(b)
  return cb < ca ? b : a
}

// True when the incoming row should replace the local one.
export function incomingWins(local: Stamped | undefined, incoming: Stamped): boolean {
  return !local || pickNewer(local, incoming) === incoming
}

export function mergeRows<T extends Row>(a: T[], b: T[], key: string): T[] {
  const byKey = new Map<string, T>()
  for (const r of a) byKey.set(String(r[key]), r)
  for (const r of b) {
    const k = String(r[key])
    const have = byKey.get(k)
    byKey.set(k, have ? pickNewer(have, r) : r)
  }
  return [...byKey.entries()].sort(([x], [y]) => (x < y ? -1 : x > y ? 1 : 0)).map(([, r]) => r)
}

// Pure: the union of both snapshots' tables, each merged row by row; the later export stamp.
export function mergeSnapshots(local: Snapshot, remote: Snapshot, keys: Record<string, string> = DEFAULT_KEYS): Snapshot {
  const tables: Record<string, unknown[]> = {}
  for (const name of new Set([...Object.keys(local.tables), ...Object.keys(remote.tables)])) {
    tables[name] = mergeRows((local.tables[name] ?? []) as Row[], (remote.tables[name] ?? []) as Row[], keys[name] ?? 'id')
  }
  return {
    kind: local.kind,
    schema: Math.max(local.schema, remote.schema),
    exportedAt: local.exportedAt > remote.exportedAt ? local.exportedAt : remote.exportedAt,
    tables,
  }
}

// How many rows of `from` would win over `to`: a device uploads only when this is above zero.
export function newerRowCount(from: Snapshot, to: Snapshot, keys: Record<string, string> = DEFAULT_KEYS): number {
  let n = 0
  for (const [name, rows] of Object.entries(from.tables)) {
    const key = keys[name] ?? 'id'
    const there = new Map(((to.tables[name] ?? []) as Row[]).map((r) => [String(r[key]), r]))
    for (const r of rows as Row[]) {
      const other = there.get(String(r[key]))
      if (!other || stampOf(r) > stampOf(other)) n++
    }
  }
  return n
}
