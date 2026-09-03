import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { db, STORE_ID } from './db'
import { getStore, saveStore } from './storeRepo'

const profile = { name: 'Santos Agrivet', location: 'Nueva Ecija', startDate: '2026-09-01', taxMode: 'off' as const }

describe('store profile', () => {
  beforeEach(async () => {
    await db.store.clear()
  })

  it('is undefined before onboarding', async () => {
    expect(await getStore()).toBeUndefined()
  })

  it('saves and reads back the single store row in PHP with its tax mode', async () => {
    const saved = await saveStore(profile)
    const stored = await getStore()
    expect(stored).toEqual(saved)
    expect(stored!.id).toBe(STORE_ID)
    expect(stored!.currency).toBe('PHP')
    expect(stored!.name).toBe('Santos Agrivet')
    expect(stored!.taxMode).toBe('off')
    expect(stored!.deletedAt).toBeNull()
    expect(stored!.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  it('updates in place, keeping one row, switching the tax mode and bumping updatedAt', async () => {
    const first = await saveStore(profile)
    await new Promise((r) => setTimeout(r, 2))
    const second = await saveStore({ ...profile, taxMode: 'vat', location: 'Tarlac' })
    expect(second.taxMode).toBe('vat')
    expect(second.location).toBe('Tarlac')
    expect(second.updatedAt > first.updatedAt).toBe(true)
    expect(await db.store.count()).toBe(1)
  })
})
