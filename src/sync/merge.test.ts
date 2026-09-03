import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { exportSnapshot, importSnapshot, SNAPSHOT_KIND, SNAPSHOT_SCHEMA, type Snapshot } from '../db/backup'
import { createCustomer } from '../db/customerRepo'
import { db } from '../db/db'
import { createProduct } from '../db/productRepo'
import { softDelete, update } from '../db/repo'
import { createSale } from '../db/saleRepo'
import { averageCost, lotsOnHand, rebuildLotQuantities, receiveLot, stockOnHand } from '../db/stockRepo'
import { saveStore } from '../db/storeRepo'
import { DEFAULT_KEYS, mergeSnapshots, newerRowCount, pickNewer } from './merge'

// The sync merge (F8; P10 design decision 2): a pure function over two snapshots, per table
// keyed by the row key, the newer stamp wins whether it is an edit or a tombstone, and a tie
// between different rows is broken the same way on every device so the merge is symmetric.
// Stock is derived from append-only moves, so two sales on two devices both survive.
const T = (n: number) => new Date(Date.UTC(2026, 8, 3, 10, 0, n)).toISOString()
const snap = (tables: Record<string, unknown[]>, exportedAt = T(0)): Snapshot => ({ kind: SNAPSHOT_KIND, schema: SNAPSHOT_SCHEMA, exportedAt, tables })
const row = (id: string, updatedAt: string, extra: Record<string, unknown> = {}, deletedAt: string | null = null) => ({ id, updatedAt, deletedAt, ...extra })

describe('mergeSnapshots', () => {
  it('a row edited on both sides keeps the newer edit; a deletion propagates over an older edit; a newer edit wins over an older deletion', () => {
    const local = snap({
      customers: [row('c1', T(5), { name: 'Nena (local)' }), row('c2', T(3), { name: 'gone locally' }, T(3)), row('c3', T(9), { name: 'revived' })],
    })
    const remote = snap({
      customers: [row('c1', T(7), { name: 'Nena (remote)' }), row('c2', T(1), { name: 'edited earlier on the other device' }), row('c3', T(4), {}, T(4))],
    })
    const merged = mergeSnapshots(local, remote)
    expect(merged.tables.customers).toEqual([
      row('c1', T(7), { name: 'Nena (remote)' }),
      row('c2', T(3), { name: 'gone locally' }, T(3)),
      row('c3', T(9), { name: 'revived' }),
    ])
  })

  it('keeps the rows and the tables only one side has, keys settings by key, sorts by key, and stamps the result with the later export', () => {
    const local = snap(
      { sales: [row('s2', T(1)), row('s1', T(1))], settings: [{ key: 'parameters', value: { a: 1 }, updatedAt: T(2), deletedAt: null }] },
      T(10),
    )
    const remote = snap(
      {
        sales: [row('s3', T(1))],
        settings: [
          { key: 'parameters', value: { a: 2 }, updatedAt: T(3), deletedAt: null },
          { key: 'other', value: 1, updatedAt: T(1), deletedAt: null },
        ],
        scenarios: [row('x', T(1))],
      },
      T(20),
    )
    const merged = mergeSnapshots(local, remote)
    expect(merged).toEqual({
      kind: SNAPSHOT_KIND,
      schema: SNAPSHOT_SCHEMA,
      exportedAt: T(20),
      tables: {
        sales: [row('s1', T(1)), row('s2', T(1)), row('s3', T(1))],
        settings: [
          { key: 'other', value: 1, updatedAt: T(1), deletedAt: null },
          { key: 'parameters', value: { a: 2 }, updatedAt: T(3), deletedAt: null },
        ],
        scenarios: [row('x', T(1))],
      },
    })
  })

  it('breaks a tie between two different rows with the same stamp the same way from either side', () => {
    const a = row('c1', T(1), { name: 'A' })
    const b = row('c1', T(1), { name: 'B' })
    expect(pickNewer(a, b)).toBe(pickNewer(b, a))
    expect(pickNewer(a, { ...a })).toBe(a) // identical content: the first argument
  })

  it('newerRowCount counts the rows of one snapshot that would win over the other, so a device knows whether to upload', () => {
    const a = snap({
      sales: [row('s1', T(5)), row('s2', T(1)), row('s3', T(1))],
      settings: [{ key: 'parameters', value: 1, updatedAt: T(4), deletedAt: null }],
    })
    const b = snap({ sales: [row('s1', T(2)), row('s2', T(1))], settings: [{ key: 'parameters', value: 2, updatedAt: T(4), deletedAt: null }] })
    expect(newerRowCount(a, b)).toBe(2) // s1 newer, s3 missing there; s2 equal; the settings tie goes to canonical order and is not "newer"
    expect(newerRowCount(b, a)).toBe(0)
    expect(newerRowCount(a, a)).toBe(0)
  })

  it('uses the primary key of every Dexie table', async () => {
    await db.open()
    for (const t of db.tables) expect(DEFAULT_KEYS[t.name] ?? 'id', t.name).toBe(t.schema.primKey.keyPath)
  })

  it('is idempotent, symmetric and order-independent, and loses no row (200 random pairs and triples)', () => {
    let seed = 20260903
    const rnd = (n: number) => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff
      return seed % n
    }
    const table = (key: string) => {
      const ids = ['r1', 'r2', 'r3', 'r4', 'r5', 'r6'].filter(() => rnd(2) === 0)
      return ids.map((id) => {
        const stamp = T(rnd(4))
        return { [key]: id, updatedAt: stamp, deletedAt: rnd(3) === 0 ? stamp : null, n: rnd(5) }
      })
    }
    const gen = (): Snapshot => {
      const tables: Record<string, unknown[]> = {}
      if (rnd(4) !== 0) tables.sales = table('id')
      if (rnd(4) !== 0) tables.settings = table('key')
      return snap(tables, T(rnd(4)))
    }
    for (let i = 0; i < 200; i++) {
      const [a, b, c] = [gen(), gen(), gen()]
      const ab = mergeSnapshots(a, b)
      expect(mergeSnapshots(a, ab)).toEqual(ab)
      expect(mergeSnapshots(ab, ab)).toEqual(ab)
      expect(mergeSnapshots(b, a)).toEqual(ab)
      expect(mergeSnapshots(ab, c)).toEqual(mergeSnapshots(a, mergeSnapshots(b, c)))
      for (const s of [a, b]) {
        for (const [name, rows] of Object.entries(s.tables)) {
          const key = DEFAULT_KEYS[name] ?? 'id'
          const keys = new Set((ab.tables[name] as Record<string, unknown>[]).map((r) => r[key]))
          for (const r of rows as Record<string, unknown>[]) expect(keys.has(r[key])).toBe(true)
        }
      }
    }
  })
})

describe('two devices converge', () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((t) => t.clear()))
  })

  it('two concurrent sales both survive with their moves, stock on hand is the union of the moves, and a deletion on one side beats an older edit on the other', async () => {
    await saveStore({ name: 'Santos Agrivet', startDate: '2026-09-01', taxMode: 'off' })
    const grower = await createProduct({
      name: 'Grower mash',
      category: 'feed',
      baseUnit: 'kg',
      sellUnits: [
        { unit: 'sack', factor: 50, price: 1950 },
        { unit: 'kg', factor: 1, price: 38 },
      ],
    })
    await receiveLot({ productId: grower.id, qty: 200, unitCost: 35, date: '2026-09-01', lotNo: 'A' })
    const nena = await createCustomer({ name: 'Aling Nena', type: 'backyard' })
    const base = await exportSnapshot()

    // Device A: one sack, then Nena is deleted.
    const saleA = await createSale({ date: '2026-09-03', lines: [{ productId: grower.id, qty: 1, unit: 'sack' }], paymentMethod: 'cash' })
    await new Promise((r) => setTimeout(r, 2))
    await softDelete(db.customers, nena.id)
    const a = await exportSnapshot()

    // Device B, from the same base: Nena renamed a moment earlier than A's deletion, then 30 kg sold.
    await importSnapshot(base, 'replace')
    await db.customers.put({ ...(await db.customers.get(nena.id))!, name: 'Nena Santos', updatedAt: new Date(Date.parse(a.exportedAt) - 1000).toISOString() })
    const saleB = await createSale({ date: '2026-09-03', lines: [{ productId: grower.id, qty: 30, unit: 'kg' }], paymentMethod: 'cash' })
    const b = await exportSnapshot()
    expect(await stockOnHand(grower.id)).toBe(170)

    const merged = mergeSnapshots(a, b)
    expect(merged).toEqual(mergeSnapshots(b, a))
    await importSnapshot(merged, 'replace')
    await rebuildLotQuantities()

    expect((await db.sales.toArray()).map((s) => s.id).sort()).toEqual([saleA.id, saleB.id].sort())
    expect((await db.stockMoves.toArray()).filter((m) => m.reason === 'sale')).toHaveLength(2)
    expect(await stockOnHand(grower.id)).toBe(120)
    expect((await lotsOnHand(grower.id)).map((l) => [l.lotNo, l.qtyOnHand])).toEqual([['A', 120]])
    expect(await averageCost(grower.id)).toBe(35)
    expect((await db.customers.get(nena.id))!.deletedAt).not.toBeNull()
    expect((await db.transactions.toArray()).filter((t) => t.kind === 'revenue')).toHaveLength(2)
  })

  it('the merge of a device with itself changes nothing', async () => {
    await saveStore({ name: 'Santos Agrivet', startDate: '2026-09-01', taxMode: 'off' })
    const grower = await createProduct({ name: 'Grower mash', category: 'feed', baseUnit: 'kg', sellUnits: [{ unit: 'kg', factor: 1, price: 38 }] })
    await update(db.products, grower.id, { name: 'Grower mash 50 kg' })
    const a = await exportSnapshot()
    const same = mergeSnapshots(a, a)
    expect(same.tables).toEqual(Object.fromEntries(Object.entries(a.tables).map(([k, v]) => [k, v])))
    expect((await importSnapshot(same, 'merge')).rows).toBe(0)
  })
})
