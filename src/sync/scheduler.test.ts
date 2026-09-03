import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createScheduler, decideSync, INTERVAL_MS, MIN_GAP_MS, type SchedulerEnv, type SyncInput } from './scheduler'

// When a background sync attempt runs (P10 step 10.4, design decision 3): on open, every five
// minutes while the app is visible, when it comes back to the front and when the connection
// returns. A missing or expired token never opens a Google prompt by itself: the decision is
// `reconnect` and the banner asks for one tap. The browser wiring (startScheduler) is layout.
const base: SyncInput = { connected: true, online: true, tokenValid: true, busy: false, lastAttemptAt: null, now: 1_000_000 }

describe('decideSync', () => {
  it('syncs when connected, online, idle and holding a valid token', () => {
    expect(decideSync(base)).toBe('sync')
  })

  it('skips when not connected, offline or already syncing', () => {
    expect(decideSync({ ...base, connected: false })).toBe('skip')
    expect(decideSync({ ...base, online: false })).toBe('skip')
    expect(decideSync({ ...base, busy: true })).toBe('skip')
  })

  it('skips an attempt made within the last minute, syncs after it', () => {
    expect(decideSync({ ...base, lastAttemptAt: base.now - MIN_GAP_MS + 1 })).toBe('skip')
    expect(decideSync({ ...base, lastAttemptAt: base.now - MIN_GAP_MS })).toBe('sync')
  })

  it('asks for a reconnect instead of opening Google when the token is missing or expired, unless offline or not connected', () => {
    expect(decideSync({ ...base, tokenValid: false })).toBe('reconnect')
    expect(decideSync({ ...base, tokenValid: false, online: false })).toBe('skip')
    expect(decideSync({ ...base, tokenValid: false, connected: false })).toBe('skip')
  })

  it('runs every five minutes with a one-minute gap between attempts', () => {
    expect(INTERVAL_MS).toBe(5 * 60_000)
    expect(MIN_GAP_MS).toBe(60_000)
  })
})

describe('createScheduler with fake timers', () => {
  let now = 1_000_000
  let lastAttemptAt: number | null = null
  let tokenValid = true
  let visible = true
  const handlers: Record<string, () => void> = {}
  const sync = vi.fn(async () => {
    lastAttemptAt = now
  })
  const reconnect = vi.fn()
  const env = (): SchedulerEnv => ({
    input: () => ({ connected: true, online: true, tokenValid, busy: false, lastAttemptAt }),
    now: () => now,
    visible: () => visible,
    sync,
    reconnect,
    on: (event, handler) => {
      handlers[event] = handler
      return () => delete handlers[event]
    },
  })
  const advance = async (ms: number) => {
    now += ms
    await vi.advanceTimersByTimeAsync(ms)
  }

  beforeEach(() => {
    vi.useFakeTimers()
    now = 1_000_000
    lastAttemptAt = null
    tokenValid = true
    visible = true
    sync.mockClear()
    reconnect.mockClear()
  })
  afterEach(() => vi.useRealTimers())

  it('attempts on start, then every five minutes while visible, and not while hidden', async () => {
    const stop = createScheduler(env()).start()
    await vi.advanceTimersByTimeAsync(0)
    expect(sync).toHaveBeenCalledTimes(1)
    await advance(INTERVAL_MS - 1)
    expect(sync).toHaveBeenCalledTimes(1)
    await advance(1)
    expect(sync).toHaveBeenCalledTimes(2)
    visible = false
    await advance(INTERVAL_MS)
    expect(sync).toHaveBeenCalledTimes(2)
    stop()
    visible = true
    await advance(INTERVAL_MS)
    expect(sync).toHaveBeenCalledTimes(2)
  })

  it('attempts when the app comes back to the front and when the connection returns, but not twice within a minute', async () => {
    createScheduler(env()).start()
    await vi.advanceTimersByTimeAsync(0)
    expect(sync).toHaveBeenCalledTimes(1)
    handlers.visible()
    await vi.advanceTimersByTimeAsync(0)
    expect(sync).toHaveBeenCalledTimes(1) // within the minute
    await advance(MIN_GAP_MS)
    handlers.visible()
    await vi.advanceTimersByTimeAsync(0)
    expect(sync).toHaveBeenCalledTimes(2)
    await advance(MIN_GAP_MS)
    handlers.online()
    await vi.advanceTimersByTimeAsync(0)
    expect(sync).toHaveBeenCalledTimes(3)
  })

  it('flips to the reconnect state instead of syncing when the token has expired, and never opens Google', async () => {
    tokenValid = false
    createScheduler(env()).start()
    await vi.advanceTimersByTimeAsync(0)
    expect(sync).not.toHaveBeenCalled()
    expect(reconnect).toHaveBeenCalledTimes(1)
    await advance(INTERVAL_MS)
    expect(reconnect).toHaveBeenCalledTimes(2)
    expect(sync).not.toHaveBeenCalled()
  })

  it('stop removes the listeners and the interval', async () => {
    const stop = createScheduler(env()).start()
    await vi.advanceTimersByTimeAsync(0)
    expect(Object.keys(handlers).sort()).toEqual(['offline', 'online', 'visible'])
    stop()
    expect(Object.keys(handlers)).toEqual([])
  })
})
