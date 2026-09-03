import { exportSnapshot, importSnapshot, parseSnapshot, type Snapshot } from '../db/backup'
import { db } from '../db/db'
import { now } from '../db/repo'
import { rebuildLotQuantities } from '../db/stockRepo'
import { newerRowCount } from './merge'

// Google Drive appDataFolder sync (F8; P10 design decision 3), entirely client-side and
// adapted from hf-tracker and pg-farm (conventions copied, never linked): the Google
// Identity Services token flow, one snapshot file in the app-data space of the one account
// the store shares (decision 4). The token lives in memory only and expires after an hour;
// a non-interactive request never opens a Google prompt (the scheduler shows the reconnect
// banner instead), and a 401 from Drive drops the token and becomes the same reconnect.
// The app's own OAuth client (step 0.4, decision 9): a public identifier, not a secret.
export const GOOGLE_CLIENT_ID = '36870848845-nrfcnlulss0eu8hsbvc8acahbclhbrl7.apps.googleusercontent.com'
export const SCOPE = 'https://www.googleapis.com/auth/drive.appdata'
export const FILE_NAME = 'agrisari-snapshot.json'
const GIS_SRC = 'https://accounts.google.com/gsi/client'

export class TokenExpired extends Error {
  constructor() {
    super('Google sign-in has expired. Tap Reconnect to keep syncing; your changes are kept here meanwhile.')
    this.name = 'TokenExpired'
  }
}

// Minimal typings for the GIS token client.
interface TokenResponse {
  access_token?: string
  expires_in?: number
  error?: string
}
interface TokenClient {
  requestAccessToken: (opts?: { prompt?: string }) => void
}
declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string
            scope: string
            callback: (response: TokenResponse) => void
            error_callback?: (error: { type: string; message?: string }) => void
          }) => TokenClient
        }
      }
    }
  }
}

let cachedToken: { token: string; expiresAt: number } | null = null

export function tokenValid(at = Date.now()): boolean {
  return cachedToken !== null && cachedToken.expiresAt > at + 60_000
}

export function clearToken(): void {
  cachedToken = null
}

function loadGis(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) return resolve()
    const script = document.createElement('script')
    script.src = GIS_SRC
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Could not load Google sign-in (are you offline?).'))
    document.head.appendChild(script)
  })
}

// Interactive: from a tap, opens the Google prompt (the consent screen on a fresh Connect,
// only the account pick or nothing on a Reconnect of a device already granted).
// Non-interactive: the cached token or TokenExpired, so a background sync never pops up.
export async function getAccessToken(interactive: boolean, prompt: 'consent' | '' = 'consent'): Promise<string> {
  if (tokenValid()) return cachedToken!.token
  if (!interactive) throw new TokenExpired()
  await loadGis()
  return new Promise((resolve, reject) => {
    const client = window.google!.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: SCOPE,
      callback: (response) => {
        if (response.error || !response.access_token) {
          reject(new Error(response.error ?? 'Google sign-in was cancelled.'))
          return
        }
        cachedToken = { token: response.access_token, expiresAt: Date.now() + (response.expires_in ?? 3600) * 1000 }
        resolve(response.access_token)
      },
      error_callback: (error) => reject(new Error(error.message ?? `Google sign-in failed (${error.type}).`)),
    })
    client.requestAccessToken({ prompt })
  })
}

// The two things the client touches outside the app, injectable so the tests run against a fake.
export interface SyncDeps {
  getToken: (interactive: boolean) => Promise<string>
  fetch: typeof globalThis.fetch
}

export const defaultDeps = (prompt: 'consent' | '' = 'consent'): SyncDeps => ({
  getToken: (interactive) => getAccessToken(interactive, prompt),
  fetch: (...args) => globalThis.fetch(...args),
})

async function driveFetch(deps: SyncDeps, token: string, url: string, init?: RequestInit): Promise<Response> {
  const res = await deps.fetch(url, { ...init, headers: { ...(init?.headers as Record<string, string>), Authorization: `Bearer ${token}` } })
  if (res.status === 401) {
    clearToken()
    throw new TokenExpired()
  }
  if (!res.ok) throw new Error(`Google Drive error ${res.status}: ${await res.text()}`)
  return res
}

async function findFileId(deps: SyncDeps, token: string): Promise<string | null> {
  const q = encodeURIComponent(`name='${FILE_NAME}'`)
  const res = await driveFetch(deps, token, `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&fields=files(id,name)&q=${q}`)
  const data = (await res.json()) as { files: { id: string }[] }
  return data.files[0]?.id ?? null
}

async function download(deps: SyncDeps, token: string, fileId: string): Promise<Snapshot> {
  const res = await driveFetch(deps, token, `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`)
  return parseSnapshot(await res.json())
}

async function upload(deps: SyncDeps, token: string, fileId: string | null, snapshot: Snapshot): Promise<void> {
  const metadata = fileId ? {} : { name: FILE_NAME, parents: ['appDataFolder'] }
  const boundary = 'agrisari-sync'
  const body =
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(snapshot)}\r\n--${boundary}--`
  const url = fileId
    ? `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`
    : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart'
  await driveFetch(deps, token, url, { method: fileId ? 'PATCH' : 'POST', headers: { 'Content-Type': `multipart/related; boundary=${boundary}` }, body })
}

export interface SyncResult {
  pulled: boolean // a remote file existed and was merged in
  written: number // remote rows written locally
  uploaded: boolean // the merged snapshot went up (only when the remote lacked something)
  at: string
}

// One sync cycle: pull the remote snapshot (if any), merge its newer rows in through the
// backup import and rebuild the lot caches from the moves, then upload the local snapshot
// when the remote lacks rows or holds older ones. The first sync of a device with no remote
// file uploads the local snapshot as the new file.
export async function syncNow(interactive: boolean, deps: SyncDeps = defaultDeps()): Promise<SyncResult> {
  const token = await deps.getToken(interactive)
  const fileId = await findFileId(deps, token)
  let pulled = false
  let written = 0
  let remote: Snapshot | null = null
  if (fileId) {
    remote = await download(deps, token, fileId)
    written = (await importSnapshot(remote, 'merge')).rows
    if (written > 0) await rebuildLotQuantities()
    pulled = true
  }
  const local = await exportSnapshot()
  const uploaded = remote === null || newerRowCount(local, remote) > 0
  if (uploaded) await upload(deps, token, fileId, local)
  const at = now()
  await db.settings.put({ key: 'lastSyncAt', value: at, updatedAt: at, deletedAt: null })
  return { pulled, written, uploaded, at }
}
