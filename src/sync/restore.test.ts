import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { exportSnapshot, type Snapshot } from '../db/backup'
import { db } from '../db/db'
import { createProduct } from '../db/productRepo'
import { getStore, saveStore } from '../db/storeRepo'
import { FILE_NAME, type SyncDeps } from './googleDrive'
import { decideRestore, NOTHING_FOUND, restoreFromDrive } from './restore'
import { disconnectSync, getSyncState, refreshSync } from './store'

// Onboarding restore (P11 step 11.0): a second device pulls the account's snapshot before it
// has a store row of its own, so it never creates a competing profile. What the onboarding
// does next is a pure decision over the sync outcome and whether a store row arrived.
const product = { name: 'Grower mash', category: 'feed' as const, baseUnit: 'kg', sellUnits: [{ unit: 'kg', factor: 1, price: 38 }] }

const drive = (remote: Snapshot | null): SyncDeps => ({
  getToken: async () => 'tok',
  fetch: (async (url: string, init?: RequestInit) => {
    if (url.includes('/drive/v3/files?')) return new Response(JSON.stringify({ files: remote ? [{ id: 'f1', name: FILE_NAME }] : [] }), { status: 200 })
    if (url.includes('alt=media')) return new Response(JSON.stringify(remote), { status: 200 })
    if (init?.method === 'POST' || init?.method === 'PATCH') return new Response(JSON.stringify({ id: 'f1' }), { status: 200 })
    return new Response('not found', { status: 404 })
  }) as unknown as typeof globalThis.fetch,
})
const dismissed: SyncDeps = {
  ...drive(null),
  getToken: async () => {
    throw new Error('Google sign-in was closed before it finished.')
  },
}

async function snapshotOf(seed: () => Promise<void>): Promise<Snapshot> {
  await seed()
  const snap = await exportSnapshot()
  await Promise.all(db.tables.map((t) => t.clear()))
  return snap
}

describe('decideRestore', () => {
  it('a sync that brought a store row is restored and skips the form', () => {
    expect(decideRestore(true, true, 'Synced.')).toEqual({ outcome: 'restored', message: null })
  })
  it('a sync that brought no store row keeps the form with the not-found message', () => {
    expect(decideRestore(true, false, 'First snapshot uploaded to Google Drive.')).toEqual({ outcome: 'nothing', message: NOTHING_FOUND })
  })
  it('a failed connect keeps the form with the sync message', () => {
    expect(decideRestore(false, false, 'Google Drive error 503: down')).toEqual({ outcome: 'failed', message: 'Google Drive error 503: down' })
    expect(decideRestore(false, false, null).message).toMatch(/Could not connect/)
  })
})

describe('restoreFromDrive', () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((t) => t.clear()))
    await disconnectSync()
    await refreshSync()
  })

  it('pulls the account snapshot onto a fresh device: the other device store row and records arrive unchanged, the device is connected', async () => {
    const remote = await snapshotOf(async () => {
      await saveStore({ name: 'Santos Agrivet', startDate: '2026-01-05', taxMode: 'nonVat' })
      await createProduct(product)
    })
    const remoteStore = (remote.tables.store as { name: string; updatedAt: string }[])[0]
    expect(await getStore()).toBeUndefined()
    expect(await restoreFromDrive(() => drive(remote))).toEqual({ outcome: 'restored', message: null })
    const store = await getStore()
    expect(store).toMatchObject({ name: 'Santos Agrivet', taxMode: 'nonVat', updatedAt: remoteStore.updatedAt })
    expect(await db.store.count()).toBe(1)
    expect(await db.products.count()).toBe(1)
    expect(getSyncState()).toMatchObject({ status: 'idle', connected: true })
    expect((await db.settings.get('googleConnected'))?.value).toBe(true)
  })

  it('an account with no snapshot keeps the form, writes no store row and leaves the device connected for the first upload after the form', async () => {
    expect(await restoreFromDrive(() => drive(null))).toEqual({ outcome: 'nothing', message: NOTHING_FOUND })
    expect(await db.store.count()).toBe(0)
    expect(getSyncState()).toMatchObject({ status: 'idle', connected: true })
  })

  it('a snapshot without a store row brings its records but keeps the form', async () => {
    const remote = await snapshotOf(async () => {
      await createProduct(product)
    })
    expect(await restoreFromDrive(() => drive(remote))).toEqual({ outcome: 'nothing', message: NOTHING_FOUND })
    expect(await db.store.count()).toBe(0)
    expect(await db.products.count()).toBe(1)
    expect(getSyncState().connected).toBe(true)
  })

  it('a dismissed or failed connect keeps the form with the message and the device disconnected', async () => {
    expect(await restoreFromDrive(() => dismissed)).toEqual({ outcome: 'failed', message: 'Google sign-in was closed before it finished.' })
    expect(await db.store.count()).toBe(0)
    expect(getSyncState()).toMatchObject({ status: 'off', connected: false })
    expect(await db.settings.get('googleConnected')).toBeUndefined()
  })
})
