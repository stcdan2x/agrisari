import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { defaultScenario } from '../engine/projection'
import type { Customer, Product } from '../types'
import {
  DEVICE_LOCAL_SETTINGS,
  exportSnapshot,
  importSnapshot,
  parseSnapshot,
  pendingChanges,
  SNAPSHOT_KIND,
  SNAPSHOT_SCHEMA,
  snapshotFilename,
  type Snapshot,
} from './backup'
import { createCustomer } from './customerRepo'
import { db } from './db'
import { saveParameters } from './parameterRepo'
import { recordPayable, recordReceivable } from './paymentRepo'
import { recordPrice } from './priceLogRepo'
import { createProduct } from './productRepo'
import { createPurchase, receiveLine } from './purchaseRepo'
import { now, softDelete } from './repo'
import { createSale } from './saleRepo'
import { saveScenario } from './scenarioRepo'
import { stockOnHand } from './stockRepo'
import { saveStore } from './storeRepo'
import { createSupplier } from './supplierRepo'
import { addTransaction } from './transactionRepo'

// The backup path that needs no Google (F8; P10 design decision 1): one JSON snapshot of
// every table, tombstones included, with a schema version and an exported-at stamp. Import
// merges by the same newest-wins rule as sync, so an old backup never clobbers newer rows;
// replace mode empties the store first and is only for a fresh device.
const TABLES = [
  'store',
  'suppliers',
  'customers',
  'products',
  'stockLots',
  'stockMoves',
  'purchases',
  'sales',
  'payments',
  'transactions',
  'priceLog',
  'scenarios',
  'settings',
]

async function clearAll() {
  await Promise.all(db.tables.map((t) => t.clear()))
}

// A small store that touches all thirteen tables and carries one tombstone.
async function seed() {
  await saveStore({ name: 'Santos Agrivet', location: 'Nueva Ecija', startDate: '2026-09-01', taxMode: 'off' })
  const smc = await createSupplier({ name: 'SMC dealer', terms: 'days15', leadTimeDays: 5 })
  const grower = await createProduct({
    name: 'Expert Hog Grower mash',
    category: 'feed',
    baseUnit: 'kg',
    sellUnits: [
      { unit: 'sack', factor: 50, price: 1950 },
      { unit: 'kg', factor: 1, price: 38 },
    ],
  })
  const po = await createPurchase({ date: '2026-09-01', supplierId: smc.id, lines: [{ productId: grower.id, qty: 4, unit: 'sack', unitCost: 1700 }] })
  await receiveLine({ purchaseId: po.id, lineIndex: 0, qty: 4, date: '2026-09-02' })
  const nena = await createCustomer({ name: 'Aling Nena', type: 'backyard', creditLimit: 5000 })
  const gone = await createCustomer({ name: 'Moved away', type: 'other' })
  await softDelete(db.customers, gone.id)
  await createSale({ date: '2026-09-03', customerId: nena.id, lines: [{ productId: grower.id, qty: 1, unit: 'sack' }], paymentMethod: 'credit' })
  await recordReceivable({ customerId: nena.id, date: '2026-09-04', amount: 500, method: 'cash' })
  await recordPayable({ supplierId: smc.id, date: '2026-09-05', amount: 1000, method: 'cash' })
  await addTransaction({ date: '2026-09-01', kind: 'capital', category: '', amount: 50000 })
  await recordPrice({ date: '2026-09-06', productId: grower.id, kind: 'competitorPrice', value: 1990, unit: 'sack', source: 'heard' })
  await saveScenario({ name: 'Feeds only', strategy: 'buy-4-assortment', params: defaultScenario('2027-01') })
  await saveParameters({ deadStockDays: 120 })
  return { grower, nena, gone }
}

const rows = (s: Snapshot, table: string) => s.tables[table] as { id?: string; key?: string }[]

describe('backup export and import', () => {
  beforeEach(clearAll)

  it('round trip: exporting, emptying the store and importing in replace mode reproduces every table, tombstones included', async () => {
    const { grower, gone } = await seed()
    const before = await exportSnapshot()
    expect(before.kind).toBe(SNAPSHOT_KIND)
    expect(before.schema).toBe(SNAPSHOT_SCHEMA)
    expect(before.exportedAt).toMatch(/T/)
    expect(Object.keys(before.tables).sort()).toEqual([...TABLES].sort())
    for (const t of TABLES) expect(rows(before, t).length, t).toBeGreaterThan(0)
    expect(rows(before, 'customers').find((c) => c.id === gone.id)).toMatchObject({ deletedAt: expect.stringMatching(/T/) })

    await clearAll()
    expect(await db.products.count()).toBe(0)
    const result = await importSnapshot(JSON.parse(JSON.stringify(before)), 'replace')
    const after = await exportSnapshot()
    expect(after.tables).toEqual(before.tables)
    expect(result.mode).toBe('replace')
    expect(result.rows).toBe(TABLES.reduce((n, t) => n + rows(before, t).length, 0))
    expect(await stockOnHand(grower.id)).toBe(150)
  })

  it('merge: an older snapshot keeps the newer local edits and the newer local tombstone, adds the rows it alone has, and a newer tombstone in the snapshot deletes locally', async () => {
    const { grower, nena } = await seed()
    const snapshot = await exportSnapshot()
    const t = (offsetMs: number) => new Date(Date.parse(snapshot.exportedAt) + offsetMs).toISOString()

    // Local moves on after the export: the product is renamed and Nena is deleted.
    await db.products.put({ ...(await db.products.get(grower.id))!, name: 'Grower mash (new bag)', updatedAt: t(1000) })
    await db.customers.put({ ...(await db.customers.get(nena.id))!, updatedAt: t(1000), deletedAt: t(1000) })
    // The snapshot alone has a supplier, and it carries a newer tombstone for the sale.
    const extra: Customer = { id: 'from-snapshot', name: 'Only in the backup', type: 'farmer', updatedAt: t(-1000), deletedAt: null }
    ;(snapshot.tables.customers as Customer[]).push(extra)
    const sale = (snapshot.tables.sales as { id: string; updatedAt: string; deletedAt?: string | null }[])[0]
    sale.updatedAt = t(2000)
    sale.deletedAt = t(2000)

    const result = await importSnapshot(snapshot, 'merge')

    expect((await db.products.get(grower.id))!.name).toBe('Grower mash (new bag)')
    expect((await db.customers.get(nena.id))!.deletedAt).toBe(t(1000))
    expect(await db.customers.get('from-snapshot')).toMatchObject({ name: 'Only in the backup', deletedAt: null })
    expect((await db.sales.get(sale.id))!.deletedAt).toBe(t(2000))
    expect(result.mode).toBe('merge')
    expect(result.rows).toBe(2) // the added customer and the tombstoned sale; every other row was older or equal
    expect((await db.settings.get('parameters'))!.value).toMatchObject({ deadStockDays: 120 })
  })

  it('merge: a snapshot row with the same stamp as the local row changes nothing', async () => {
    const { grower } = await seed()
    const snapshot = await exportSnapshot()
    const local = (await db.products.get(grower.id))!
    const result = await importSnapshot(snapshot, 'merge')
    expect(result.rows).toBe(0)
    expect(await db.products.get(grower.id)).toEqual(local)
  })

  it('replace: rows that are not in the snapshot are gone afterwards', async () => {
    await seed()
    const snapshot = await exportSnapshot()
    const stray: Product = { ...(await db.products.toArray())[0], id: 'stray', name: 'Not in the backup', updatedAt: new Date().toISOString(), deletedAt: null }
    await db.products.put(stray)
    await importSnapshot(snapshot, 'replace')
    expect(await db.products.get('stray')).toBeUndefined()
    expect(await db.products.count()).toBe(rows(snapshot, 'products').length)
  })

  it('keeps the device-local settings (the connection flag and the last sync time) out of the snapshot and untouched by a replace', async () => {
    await seed()
    expect(DEVICE_LOCAL_SETTINGS).toEqual(['googleConnected', 'lastSyncAt'])
    await db.settings.put({ key: 'googleConnected', value: true, updatedAt: now(), deletedAt: null })
    await db.settings.put({ key: 'lastSyncAt', value: '2026-09-03T10:00:00.000Z', updatedAt: now(), deletedAt: null })
    const snapshot = await exportSnapshot()
    expect(rows(snapshot, 'settings').map((r) => r.key)).toEqual(['parameters'])
    await importSnapshot(snapshot, 'replace')
    expect((await db.settings.get('googleConnected'))?.value).toBe(true)
    expect((await db.settings.get('lastSyncAt'))?.value).toBe('2026-09-03T10:00:00.000Z')
    expect(await db.settings.count()).toBe(3)
  })

  it('pendingChanges counts every synced row when never synced, only later rows after a sync, deletions included, never the device-local settings', async () => {
    const { gone } = await seed()
    const snapshotSync = await exportSnapshot()
    const total = TABLES.reduce((n, t) => n + rows(snapshotSync, t).length, 0)
    expect(await pendingChanges(null)).toBe(total)
    await new Promise((r) => setTimeout(r, 2))
    const syncedAt = now()
    await db.settings.put({ key: 'lastSyncAt', value: syncedAt, updatedAt: now(), deletedAt: null })
    expect(await pendingChanges(syncedAt)).toBe(0)
    await new Promise((r) => setTimeout(r, 2))
    await db.customers.put({ ...(await db.customers.get(gone.id))!, updatedAt: now(), deletedAt: now() })
    expect(await pendingChanges(syncedAt)).toBe(1)
  })

  it('parseSnapshot checks the shape and the schema version', () => {
    const good = { kind: SNAPSHOT_KIND, schema: SNAPSHOT_SCHEMA, exportedAt: '2026-09-03T10:00:00.000Z', tables: { products: [] } }
    expect(parseSnapshot(JSON.stringify(good))).toEqual(good)
    expect(parseSnapshot(good)).toEqual(good)
    expect(() => parseSnapshot('not json')).toThrow(/not a JSON/)
    expect(() => parseSnapshot('[]')).toThrow(/not an AgriSari backup/)
    expect(() => parseSnapshot({ ...good, kind: 'hf-tracker' })).toThrow(/not an AgriSari backup/)
    expect(() => parseSnapshot({ ...good, schema: SNAPSHOT_SCHEMA + 1 })).toThrow(/newer version of the app/)
    expect(() => parseSnapshot({ ...good, tables: { products: {} } })).toThrow(/table products/)
    expect(() => parseSnapshot({ ...good, tables: null })).toThrow(/not an AgriSari backup/)
  })

  it('import ignores tables the app does not have and names the file by the export date', async () => {
    await seed()
    const snapshot = await exportSnapshot()
    ;(snapshot.tables as Record<string, unknown[]>).somethingElse = [{ id: 'x' }]
    await importSnapshot(snapshot, 'merge')
    expect(db.tables.map((t) => t.name)).not.toContain('somethingElse')
    expect(snapshotFilename('2026-09-03T10:15:00.000Z')).toBe('agrisari-backup-2026-09-03.json')
  })
})
