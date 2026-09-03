import { getStore } from '../db/storeRepo'
import { defaultDeps, type SyncDeps } from './googleDrive'
import { getSyncState, runSync } from './store'

// Onboarding restore (P11 step 11.0): a fresh device offers "Restore from Google Drive"
// before it has a store row, so the pull can only import and a second phone never creates a
// competing profile that could win the merge. The outcome decides what the onboarding does.
export type RestoreOutcome = 'restored' | 'nothing' | 'failed'
export interface RestoreResult {
  outcome: RestoreOutcome
  message: string | null
}

export const NOTHING_FOUND = 'Nothing to restore on this Google account yet. Set up the store below; it is backed up from here on.'
const NOT_CONNECTED = 'Could not connect to Google Drive. Set up the store below, or try again.'

// Pure: restored skips the form; nothing keeps the form with the device connected so the
// first sync after the form uploads the new store; failed keeps the form and the sync message.
export function decideRestore(synced: boolean, storePresent: boolean, message: string | null): RestoreResult {
  if (!synced) return { outcome: 'failed', message: message ?? NOT_CONNECTED }
  if (storePresent) return { outcome: 'restored', message: null }
  return { outcome: 'nothing', message: NOTHING_FOUND }
}

// The interactive sync from the owner's tap (the consent popup needs the gesture), then the decision.
export async function restoreFromDrive(deps: (prompt: 'consent' | '') => SyncDeps = defaultDeps): Promise<RestoreResult> {
  const synced = await runSync(true, deps)
  return decideRestore(synced, (await getStore()) !== undefined, getSyncState().message)
}
