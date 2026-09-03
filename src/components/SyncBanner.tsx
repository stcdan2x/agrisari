import { runSync, useSync } from '../sync/store'

// One-tap reconnect when the hourly Google token has expired, and the sync error line
// (P10 step 10.4, layout); nothing while sync is off, idle, offline or running.
export default function SyncBanner() {
  const sync = useSync()
  if (sync.status === 'reconnect') {
    return (
      <div className="mx-4 mt-3 flex items-center justify-between gap-3 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800 ring-1 ring-amber-200">
        <span>Sync paused: the Google sign-in expired. Your changes are kept here.</span>
        <button type="button" className="shrink-0 rounded-lg bg-amber-600 px-3 py-1.5 font-semibold text-white" onClick={() => void runSync(true)}>
          Reconnect
        </button>
      </div>
    )
  }
  if (sync.status === 'error') {
    return <div className="mx-4 mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700 ring-1 ring-red-200">Sync failed: {sync.message}</div>
  }
  return null
}
