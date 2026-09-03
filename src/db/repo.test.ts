import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from './db'
import { create, liveAll, liveWhere, newId, softDelete, update } from './repo'

const supplier = { name: 'Dela Cruz Feeds', terms: 'days15' as const, leadTimeDays: 3 }

describe('repository helpers', () => {
  beforeEach(async () => {
    await db.suppliers.clear()
  })

  it('generates unique ids', () => {
    const a = newId()
    const b = newId()
    expect(a).not.toBe(b)
    expect(a.length).toBeGreaterThan(20)
  })

  it('create stamps id and updatedAt and leaves the row live', async () => {
    const row = await create(db.suppliers, supplier)
    expect(row.id).toBeTruthy()
    expect(row.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    expect(row.deletedAt ?? null).toBeNull()
    const stored = await db.suppliers.get(row.id)
    expect(stored).toEqual(row)
  })

  it('update merges the patch and bumps updatedAt', async () => {
    const row = await create(db.suppliers, supplier)
    await new Promise((r) => setTimeout(r, 2))
    const changed = await update(db.suppliers, row.id, { leadTimeDays: 5 })
    expect(changed.leadTimeDays).toBe(5)
    expect(changed.name).toBe('Dela Cruz Feeds')
    expect(changed.updatedAt > row.updatedAt).toBe(true)
    expect(await db.suppliers.count()).toBe(1)
  })

  it('update rejects an unknown id', async () => {
    await expect(update(db.suppliers, 'missing', { leadTimeDays: 5 })).rejects.toThrow(/missing/)
  })

  it('softDelete keeps the row as a tombstone with deletedAt and a fresh updatedAt', async () => {
    const row = await create(db.suppliers, supplier)
    await new Promise((r) => setTimeout(r, 2))
    await softDelete(db.suppliers, row.id)
    const stored = (await db.suppliers.get(row.id))!
    expect(stored.deletedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    expect(stored.updatedAt).toBe(stored.deletedAt)
    expect(stored.updatedAt > row.updatedAt).toBe(true)
    expect(await db.suppliers.count()).toBe(1)
  })

  it('softDelete rejects an unknown id', async () => {
    await expect(softDelete(db.suppliers, 'missing')).rejects.toThrow(/missing/)
  })

  it('liveAll and liveWhere exclude tombstones', async () => {
    const a = await create(db.suppliers, supplier)
    const b = await create(db.suppliers, { ...supplier, name: 'Sagrex Laguna', terms: 'cod' })
    const c = await create(db.suppliers, { ...supplier, name: 'Reyes Agri Supply' })
    await softDelete(db.suppliers, c.id)

    const all = await liveAll(db.suppliers)
    expect(all.map((s) => s.id).sort()).toEqual([a.id, b.id].sort())

    const byName = await liveWhere(db.suppliers, 'name', 'Dela Cruz Feeds')
    expect(byName.map((s) => s.id)).toEqual([a.id])
    expect(await liveWhere(db.suppliers, 'name', 'Reyes Agri Supply')).toEqual([])
  })
})
