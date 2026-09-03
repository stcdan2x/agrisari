import { useSyncExternalStore } from 'react'
import { db } from '../db/db'
import { now } from '../db/repo'
import { clearToken, defaultDeps, syncNow, TokenExpired, type SyncDeps } from './googleDrive'

// Sync status shared by the banner, the Settings sync card and the scheduler (P10 step 10.3,
// pg-farm's convention). The connection flag and the last sync time live in the device-local
// settings rows (kept out of the snapshot by src/db/backup.ts); the token lives in memory.
export type SyncStatus = 'off' | 'idle' | 'syncing' | 'reconnect' | 'offline' | 'error'

export interface SyncState {
  status: SyncStatus
  connected: boolean
  lastSyncAt: string | null
  lastAttemptAt: number | null // any attempt, tap or scheduled: the scheduler waits a minute after it
  message: string | null
}

let state: SyncState = { status: 'off', connected: false, lastSyncAt: null, lastAttemptAt: null, message: null }
const listeners = new Set<() => void>()

function set(patch: Partial<SyncState>) {
  state = { ...state, ...patch }
  listeners.forEach((l) => l())
}

export const getSyncState = () => state
export const setSyncStatus = (status: SyncStatus, message: string | null = null) => set({ status, message })

export function useSync(): SyncState {
  return useSyncExternalStore((l) => (listeners.add(l), () => listeners.delete(l)), getSyncState)
}

const setting = async <T>(key: string): Promise<T | undefined> => (await db.settings.get(key))?.value as T | undefined
const putSetting = (key: string, value: unknown) => db.settings.put({ key, value, updatedAt: now(), deletedAt: null })

// Reads the device-local settings into the store; keeps a live status as is.
export async function refreshSync(): Promise<void> {
  const connected = (await setting<boolean>('googleConnected')) === true
  const lastSyncAt = (await setting<string>('lastSyncAt')) ?? null
  const keep = state.status === 'syncing' || state.status === 'reconnect' || state.status === 'error' || state.status === 'offline'
  set({ connected, lastSyncAt, status: connected ? (keep ? state.status : 'idle') : 'off' })
}

// Interactive from a tap (Connect, Sync now, Reconnect); non-interactive from the scheduler.
// An expired token turns into the reconnect state, never a prompt. The deps factory takes the
// prompt to use: a device already granted reconnects without the consent screen.
export async function runSync(interactive: boolean, deps: (prompt: 'consent' | '') => SyncDeps = defaultDeps): Promise<boolean> {
  if (state.status === 'syncing') return false
  set({ status: 'syncing', message: null, lastAttemptAt: Date.now() })
  try {
    const result = await syncNow(interactive, deps(state.connected ? '' : 'consent'))
    if (!state.connected) await putSetting('googleConnected', true)
    set({
      connected: true,
      lastSyncAt: result.at,
      status: 'idle',
      message: result.pulled
        ? `Synced with Google Drive: ${result.written} change${result.written === 1 ? '' : 's'} received${result.uploaded ? ', local changes sent' : ''}.`
        : 'First snapshot uploaded to Google Drive.',
    })
    return true
  } catch (err) {
    if (err instanceof TokenExpired) set({ status: 'reconnect', message: err.message })
    else set({ status: state.connected ? 'error' : 'off', message: err instanceof Error ? err.message : 'Sync failed.' })
    return false
  }
}

export async function disconnectSync(): Promise<void> {
  clearToken()
  await db.settings.delete('googleConnected')
  set({ connected: false, status: 'off', message: 'Disconnected. Your records stay on this device.' })
}
