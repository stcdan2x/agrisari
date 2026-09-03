import { incomingWins, stampOf, type Stamped } from '../sync/merge'
import type { ISOTime } from '../types'
import { db } from './db'
import { now } from './repo'

// The backup path that needs no Google (F8; P10 design decision 1): one JSON file holding
// every row of every table, tombstones included, so a restore or a merge on another device
// sees deletions too. Import merges by the sync rule (src/sync/merge.ts) so an old backup
// never clobbers newer rows; replace mode empties the store first and is only for a fresh
// device, behind a confirmation on the Settings card.
export const SNAPSHOT_KIND = 'agrisari-snapshot'
export const SNAPSHOT_SCHEMA = 1 // bumped with the Dexie schema when a table changes shape

export interface Snapshot {
  kind: typeof SNAPSHOT_KIND
  schema: number
  exportedAt: ISOTime
  tables: Record<string, unknown[]>
}

export type ImportMode = 'merge' | 'replace'

export interface ImportResult {
  mode: ImportMode
  rows: number // rows written
  tables: number // tables the snapshot had that the app has too
}

export const snapshotFilename = (exportedAt: ISOTime) => `agrisari-backup-${exportedAt.slice(0, 10)}.json`

// Settings that describe this device, not the store: never exported, never replaced.
export const DEVICE_LOCAL_SETTINGS = ['googleConnected', 'lastSyncAt']
const isDeviceLocal = (table: string, row: unknown) => table === 'settings' && DEVICE_LOCAL_SETTINGS.includes((row as { key: string }).key)

// Every row of every table except the device-local settings.
async function readAll(): Promise<Record<string, Stamped[]>> {
  const tables: Record<string, Stamped[]> = {}
  await db.transaction('r', db.tables, async () => {
    for (const t of db.tables) tables[t.name] = ((await t.toArray()) as Stamped[]).filter((r) => !isDeviceLocal(t.name, r))
  })
  return tables
}

export async function exportSnapshot(): Promise<Snapshot> {
  return { kind: SNAPSHOT_KIND, schema: SNAPSHOT_SCHEMA, exportedAt: now(), tables: await readAll() }
}

// Rows changed since the last sync (every row when never synced), for the sync card.
export async function pendingChanges(lastSyncAt: ISOTime | null): Promise<number> {
  let n = 0
  for (const rows of Object.values(await readAll())) n += lastSyncAt ? rows.filter((r) => stampOf(r) > lastSyncAt).length : rows.length
  return n
}

// The file as text or as parsed JSON; throws a message the Settings card can show as is.
export function parseSnapshot(input: unknown): Snapshot {
  let data = input
  if (typeof input === 'string') {
    try {
      data = JSON.parse(input)
    } catch {
      throw new Error('This is not a JSON file.')
    }
  }
  const bad = 'This file is not an AgriSari backup.'
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error(bad)
  const s = data as Partial<Snapshot>
  if (s.kind !== SNAPSHOT_KIND || typeof s.schema !== 'number' || typeof s.exportedAt !== 'string') throw new Error(bad)
  if (!s.tables || typeof s.tables !== 'object' || Array.isArray(s.tables)) throw new Error(bad)
  if (s.schema > SNAPSHOT_SCHEMA) throw new Error(`This backup was made by a newer version of the app (schema ${s.schema}); update the app first.`)
  for (const [name, rows] of Object.entries(s.tables)) if (!Array.isArray(rows)) throw new Error(`${bad} (table ${name} is not a list)`)
  return s as Snapshot
}

export async function importSnapshot(input: unknown, mode: ImportMode): Promise<ImportResult> {
  const snapshot = parseSnapshot(input)
  const targets = db.tables.filter((t) => t.name in snapshot.tables)
  let rows = 0
  await db.transaction('rw', db.tables, async () => {
    if (mode === 'replace') {
      const keep = await db.settings.bulkGet(DEVICE_LOCAL_SETTINGS)
      for (const t of db.tables) await t.clear()
      await db.settings.bulkPut(keep.filter((r) => r !== undefined))
    }
    for (const t of targets) {
      const incoming = snapshot.tables[t.name] as (Stamped & Record<string, unknown>)[]
      const key = t.schema.primKey.keyPath as string
      let winners = incoming
      if (mode === 'merge') {
        const locals = (await t.bulkGet(incoming.map((r) => r[key] as string))) as (Stamped | undefined)[]
        winners = incoming.filter((r, i) => incomingWins(locals[i], r))
      }
      if (winners.length) await t.bulkPut(winners)
      rows += winners.length
    }
  })
  return { mode, rows, tables: targets.length }
}
