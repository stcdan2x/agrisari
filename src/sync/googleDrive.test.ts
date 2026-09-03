import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { exportSnapshot, SNAPSHOT_KIND, type Snapshot } from '../db/backup'
import { db } from '../db/db'
import { createProduct } from '../db/productRepo'
import { create, now } from '../db/repo'
import { lotsOnHand, receiveLot, stockOnHand } from '../db/stockRepo'
import { clearToken, FILE_NAME, getAccessToken, GOOGLE_CLIENT_ID, SCOPE, syncNow, TokenExpired, tokenValid } from './googleDrive'

// The Drive client (P10 step 10.3, design decision 3): the request shapes, the file lookup,
// the create, download and upload calls and the 401 path, all against a fake fetch. The
// Google sign-in itself and the live Drive calls are network integration verified in the
// 10.4 two-profile walkthrough (decision 11 exclusion accepted 2026-09-03).
const clearAll = () => Promise.all(db.tables.map((t) => t.clear()))
const product = { name: 'Grower mash', category: 'feed' as const, baseUnit: 'kg', sellUnits: [{ unit: 'kg', factor: 1, price: 38 }] }

// A fake Drive: answers the list, media and upload calls and records them.
function fakeDrive(remote: Snapshot | null, status = 200) {
  const calls: { method: string; url: string; body?: string; headers: Record<string, string> }[] = []
  const fetch = vi.fn(async (url: string, init?: RequestInit) => {
    const method = init?.method ?? 'GET'
    const headers = init?.headers as Record<string, string>
    calls.push({ method, url, body: typeof init?.body === 'string' ? init.body : undefined, headers })
    if (status !== 200) return new Response('denied', { status })
    if (url.includes('/drive/v3/files?')) return new Response(JSON.stringify({ files: remote ? [{ id: 'f1', name: FILE_NAME }] : [] }), { status: 200 })
    if (url.includes('/drive/v3/files/f1?alt=media')) return new Response(JSON.stringify(remote), { status: 200 })
    if (url.includes('/upload/drive/v3/files')) return new Response(JSON.stringify({ id: 'f1' }), { status: 200 })
    return new Response('not found', { status: 404 })
  })
  const uploads = () => calls.filter((c) => c.url.includes('/upload/'))
  return { fetch: fetch as unknown as typeof globalThis.fetch, calls, uploads }
}
const getToken = async () => 'tok'
const uploadedSnapshot = (body: string): Snapshot => JSON.parse(body.split('\r\n\r\n')[2].split('\r\n--')[0])

describe('Google Drive client', () => {
  beforeEach(async () => {
    await clearAll()
    clearToken()
  })

  it('uses the AgriSari client id, the appdata scope and the snapshot file name of design decision 3', () => {
    expect(GOOGLE_CLIENT_ID).toBe('36870848845-nrfcnlulss0eu8hsbvc8acahbclhbrl7.apps.googleusercontent.com')
    expect(SCOPE).toBe('https://www.googleapis.com/auth/drive.appdata')
    expect(FILE_NAME).toBe('agrisari-snapshot.json')
  })

  it('a non-interactive token request with no valid cached token fails with TokenExpired instead of opening a prompt', async () => {
    expect(tokenValid()).toBe(false)
    await expect(getAccessToken(false)).rejects.toBeInstanceOf(TokenExpired)
  })

  it('first sync of a device with no remote file looks the file up by name in appDataFolder and uploads the local snapshot as a new file', async () => {
    const local = await createProduct(product)
    const drive = fakeDrive(null)
    const result = await syncNow(false, { getToken, fetch: drive.fetch })
    expect(result).toMatchObject({ pulled: false, written: 0, uploaded: true })
    expect(result.at).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    for (const c of drive.calls) expect(c.headers.Authorization).toBe('Bearer tok')
    const list = drive.calls[0]
    expect(list.method).toBe('GET')
    expect(list.url).toContain('https://www.googleapis.com/drive/v3/files?')
    expect(list.url).toContain('spaces=appDataFolder')
    expect(list.url).toContain(`q=name%3D'${FILE_NAME}'`)
    expect(drive.uploads()).toHaveLength(1)
    const up = drive.uploads()[0]
    expect(up.method).toBe('POST')
    expect(up.url).toBe('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart')
    expect(up.headers['Content-Type']).toMatch(/^multipart\/related; boundary=/)
    expect(up.body).toContain(`"name":"${FILE_NAME}"`)
    expect(up.body).toContain('"parents":["appDataFolder"]')
    const snapshot = uploadedSnapshot(up.body!)
    expect(snapshot.kind).toBe(SNAPSHOT_KIND)
    expect((snapshot.tables.products as { id: string }[])[0].id).toBe(local.id)
    expect((await db.settings.get('lastSyncAt'))?.value).toBe(result.at)
  })

  it('pulls the remote file, merges its newer rows in, rebuilds the lot caches, and uploads the merge when the remote lacks local rows', async () => {
    const grower = await createProduct(product)
    const { lot } = await receiveLot({ productId: grower.id, qty: 200, unitCost: 35, date: '2026-09-01', lotNo: 'A' })
    const remote = await exportSnapshot()
    // The other device renamed the product and sold 30 kg from the same lot.
    const later = new Date(Date.now() + 1000).toISOString()
    remote.tables.products = [{ ...(remote.tables.products[0] as typeof grower), name: 'Renamed there', updatedAt: later }]
    remote.tables.stockMoves.push({
      id: 'move-there',
      productId: grower.id,
      lotId: lot.id,
      date: '2026-09-03',
      reason: 'sale',
      qtyDelta: -30,
      unitCost: 35,
      updatedAt: later,
      deletedAt: null,
    })
    const mine = await createProduct({ ...product, name: 'Only here' })
    const drive = fakeDrive(remote)

    const result = await syncNow(false, { getToken, fetch: drive.fetch })
    expect(result).toMatchObject({ pulled: true, written: 2, uploaded: true })
    expect((await db.products.get(grower.id))!.name).toBe('Renamed there')
    expect(await stockOnHand(grower.id)).toBe(170)
    expect((await lotsOnHand(grower.id)).map((l) => l.qtyOnHand)).toEqual([170])
    expect(drive.calls.map((c) => c.method)).toEqual(['GET', 'GET', 'PATCH'])
    const up = drive.uploads()[0]
    expect(up.url).toBe('https://www.googleapis.com/upload/drive/v3/files/f1?uploadType=multipart')
    expect(up.body).toContain('\r\n\r\n{}\r\n') // no metadata on an update
    const ids = (uploadedSnapshot(up.body!).tables.products as { id: string }[]).map((r) => r.id).sort()
    expect(ids).toEqual([grower.id, mine.id].sort())
  })

  it('does not upload when the remote already holds everything local has', async () => {
    await createProduct(product)
    const drive = fakeDrive(await exportSnapshot())
    const result = await syncNow(false, { getToken, fetch: drive.fetch })
    expect(result).toMatchObject({ pulled: true, written: 0, uploaded: false })
    expect(drive.uploads()).toHaveLength(0)
    expect((await db.settings.get('lastSyncAt'))?.value).toBe(result.at)
  })

  it('a 401 from Drive clears the token and becomes TokenExpired, leaving lastSyncAt alone', async () => {
    await createProduct(product)
    const drive = fakeDrive(null, 401)
    await expect(syncNow(false, { getToken, fetch: drive.fetch })).rejects.toBeInstanceOf(TokenExpired)
    expect(tokenValid()).toBe(false)
    expect(await db.settings.get('lastSyncAt')).toBeUndefined()
  })

  it('any other Drive error surfaces with its status and the local data is untouched', async () => {
    const p = await createProduct(product)
    const drive = fakeDrive(null, 503)
    await expect(syncNow(false, { getToken, fetch: drive.fetch })).rejects.toThrow('Google Drive error 503')
    expect(await db.products.get(p.id)).toMatchObject({ name: product.name })
    expect(await db.settings.get('lastSyncAt')).toBeUndefined()
  })

  it('rejects a remote file that is not an AgriSari snapshot before writing anything', async () => {
    const p = await create(db.products, { ...product, updatedAt: now() } as never)
    const drive = fakeDrive({ kind: 'other' } as unknown as Snapshot)
    await expect(syncNow(false, { getToken, fetch: drive.fetch })).rejects.toThrow('not an AgriSari backup')
    expect(await db.products.get(p.id)).toBeDefined()
    expect(drive.uploads()).toHaveLength(0)
  })
})
