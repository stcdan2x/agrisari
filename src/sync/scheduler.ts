import { tokenValid } from './googleDrive'
import { getSyncState, refreshSync, runSync, setSyncStatus } from './store'

// When a background sync attempt runs (P10 step 10.4, design decision 3, pg-farm's
// convention): on app open, every five minutes while the app is visible, when it comes back
// to the front and when the connection returns. A missing or expired token never opens a
// Google prompt by itself: the decision is `reconnect` and the banner asks for one tap.
export const INTERVAL_MS = 5 * 60_000
export const MIN_GAP_MS = 60_000

export interface SyncInput {
  connected: boolean
  online: boolean
  tokenValid: boolean
  busy: boolean
  lastAttemptAt: number | null
  now: number
}

export type SyncDecision = 'sync' | 'reconnect' | 'skip'

export function decideSync(i: SyncInput): SyncDecision {
  if (!i.connected || !i.online || i.busy) return 'skip'
  if (i.lastAttemptAt !== null && i.now - i.lastAttemptAt < MIN_GAP_MS) return 'skip'
  return i.tokenValid ? 'sync' : 'reconnect'
}

// What the scheduler reads and does, injectable so the tests run it on fake timers.
export interface SchedulerEnv {
  input: () => Omit<SyncInput, 'now'>
  now: () => number
  visible: () => boolean
  sync: () => Promise<unknown>
  reconnect: () => void
  on: (event: 'visible' | 'online' | 'offline', handler: () => void) => () => void
}

export function createScheduler(env: SchedulerEnv) {
  const attempt = async () => {
    const decision = decideSync({ ...env.input(), now: env.now() })
    if (decision === 'sync') await env.sync()
    else if (decision === 'reconnect') env.reconnect()
  }
  const start = () => {
    void attempt()
    const id = setInterval(() => {
      if (env.visible()) void attempt()
    }, INTERVAL_MS)
    const offs = [env.on('visible', () => void attempt()), env.on('online', () => void attempt()), env.on('offline', () => {})]
    return () => {
      clearInterval(id)
      offs.forEach((off) => off())
    }
  }
  return { start, attempt }
}

// Browser wiring (layout, verified in the 10.4 walkthrough). Returns the cleanup.
export function startScheduler(): () => void {
  const onlineNow = () => {
    if (getSyncState().status === 'offline') setSyncStatus('idle')
  }
  const env: SchedulerEnv = {
    input: () => {
      const s = getSyncState()
      return { connected: s.connected, online: navigator.onLine, tokenValid: tokenValid(), busy: s.status === 'syncing', lastAttemptAt: s.lastAttemptAt }
    },
    now: () => Date.now(),
    visible: () => document.visibilityState === 'visible',
    sync: () => runSync(false),
    reconnect: () => setSyncStatus('reconnect'),
    on: (event, handler) => {
      if (event === 'visible') {
        const h = () => {
          if (document.visibilityState === 'visible') handler()
        }
        document.addEventListener('visibilitychange', h)
        return () => document.removeEventListener('visibilitychange', h)
      }
      const h =
        event === 'online'
          ? () => {
              onlineNow()
              handler()
            }
          : () => {
              if (getSyncState().connected) setSyncStatus('offline')
              handler()
            }
      window.addEventListener(event, h)
      return () => window.removeEventListener(event, h)
    },
  }
  let stop = () => {}
  let stopped = false
  void refreshSync().then(() => {
    if (!stopped) stop = createScheduler(env).start()
  })
  return () => {
    stopped = true
    stop()
  }
}
