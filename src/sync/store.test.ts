import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../db/db'
import { createProduct } from '../db/productRepo'
import { type SyncDeps, TokenExpired } from './googleDrive'
import { disconnectSync, getSyncState, refreshSync, runSync } from './store'

// The sync state shared by the Settings card, the banner and the scheduler (P10 step 10.3):
// a tap or a scheduled attempt runs one sync, an expired token becomes the reconnect state
// with the local data untouched, and any other failure is an error while connected.
const product = { name: 'Grower mash', category: 'feed' as const, baseUnit: 'kg', sellUnits: [{ unit: 'kg', factor: 1, price: 38 }] }
const emptyDrive = async (url: string, init?: RequestInit) => {
  if (url.includes('/drive/v3/files?')) return new Response(JSON.stringify({ files: [] }), { status: 200 })
  if (init?.method === 'POST') return new Response(JSON.stringify({ id: 'f1' }), { status: 200 })
  return new Response('not found', { status: 404 })
}
const ok: SyncDeps = { getToken: async () => 'tok', fetch: emptyDrive as unknown as typeof globalThis.fetch }
const expired: SyncDeps = {
  ...ok,
  getToken: async () => {
    throw new TokenExpired()
  },
}
const failing: SyncDeps = { ...ok, fetch: (async () => new Response('down', { status: 503 })) as unknown as typeof globalThis.fetch }

describe('sync state', () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((t) => t.clear()))
    await disconnectSync()
    await refreshSync()
  })

  it('starts off and not connected', async () => {
    expect(getSyncState()).toMatchObject({ status: 'off', connected: false, lastSyncAt: null })
  })

  it('a successful first sync connects the device, records the sync time in the device-local setting and reports it', async () => {
    await createProduct(product)
    expect(await runSync(true, () => ok)).toBe(true)
    const s = getSyncState()
    expect(s).toMatchObject({ status: 'idle', connected: true })
    expect(s.lastSyncAt).toMatch(/T/)
    expect(s.message).toMatch(/First snapshot uploaded/)
    expect((await db.settings.get('googleConnected'))?.value).toBe(true)
    expect((await db.settings.get('lastSyncAt'))?.value).toBe(s.lastSyncAt)
    await refreshSync()
    expect(getSyncState()).toMatchObject({ status: 'idle', connected: true, lastSyncAt: s.lastSyncAt })
  })

  it('an expired token turns into the reconnect state and keeps the data; a later successful sync clears it', async () => {
    await createProduct(product)
    await runSync(true, () => ok)
    expect(await runSync(false, () => expired)).toBe(false)
    expect(getSyncState()).toMatchObject({ status: 'reconnect', connected: true })
    expect(getSyncState().message).toMatch(/expired/)
    expect(await db.products.count()).toBe(1)
    expect(await runSync(true, () => ok)).toBe(true)
    expect(getSyncState().status).toBe('idle')
  })

  it('any other failure is an error while connected, and off with the message when the first connect fails', async () => {
    expect(await runSync(true, () => failing)).toBe(false)
    expect(getSyncState()).toMatchObject({ status: 'off', connected: false })
    expect(getSyncState().message).toMatch(/503/)
    await runSync(true, () => ok)
    expect(await runSync(false, () => failing)).toBe(false)
    expect(getSyncState()).toMatchObject({ status: 'error', connected: true })
  })

  it('a second attempt while one is running is refused', async () => {
    let release = () => {}
    const slow: SyncDeps = { ...ok, getToken: () => new Promise((r) => (release = () => r('tok'))) }
    const first = runSync(true, () => slow)
    expect(getSyncState().status).toBe('syncing')
    expect(await runSync(true, () => ok)).toBe(false)
    release()
    expect(await first).toBe(true)
  })

  it('disconnecting forgets the connection flag and the token, and keeps the data on the device', async () => {
    await createProduct(product)
    await runSync(true, () => ok)
    await disconnectSync()
    expect(getSyncState()).toMatchObject({ status: 'off', connected: false })
    expect(await db.settings.get('googleConnected')).toBeUndefined()
    expect(await db.products.count()).toBe(1)
  })
})
