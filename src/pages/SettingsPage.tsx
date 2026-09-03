import { format } from 'date-fns'
import { useLiveQuery } from 'dexie-react-hooks'
import { useState, type ChangeEvent, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import GuideLink from '../components/GuideLink'
import { Badge, btnDanger, btnPrimary, btnSecondary, Card, Check, ErrorText, inputCls, Row } from '../components/ui'
import { exportSnapshot, importSnapshot, pendingChanges, snapshotFilename, type ImportMode } from '../db/backup'
import { loadParameters, resetParameters, saveParameters } from '../db/parameterRepo'
import { expenseCategories, setExpenseCategories } from '../db/transactionRepo'
import { CATEGORY_DEFAULTS, CATEGORY_ORDER } from '../knowledge/categories'
import { MARGIN_BOUNDS, PARAMETER_LABELS, PARAMETER_DEFAULTS, parameterSource, type StoreParameters } from '../knowledge/parameters'
import type { QuarterIndex } from '../knowledge/seasons'
import { GUIDE_LINKS } from '../knowledge/guideLinks'
import { disconnectSync, runSync, useSync } from '../sync/store'
import type { ProductCategory, Store } from '../types'
import { TAX_MODES } from './Onboarding'

export default function SettingsPage({ store }: { store: Store }) {
  const taxLabel = TAX_MODES.find((m) => m.value === store.taxMode)?.label ?? store.taxMode
  const categories = useLiveQuery(() => expenseCategories(), [])
  const [saved, setSaved] = useState(false) // held here: the editor remounts when the live list changes
  const parameters = useLiveQuery(() => loadParameters(), [])
  const [paramsSaved, setParamsSaved] = useState<string | null>(null)
  return (
    <>
      <PageHeader title="Settings" subtitle="Store profile, tax mode, expense categories, backup and sync" />
      <Card title="Store profile">
        <Row label="Store">{store.name}</Row>
        <Row label="Location">{store.location ?? 'not set'}</Row>
        <Row label="Records from">{store.startDate}</Row>
        <Row label="Currency">{store.currency}</Row>
        <Row label="Tax mode">{taxLabel}</Row>
        <Link to="/onboarding" className="mt-3 inline-block font-semibold text-brand-700">
          Edit store profile
        </Link>
      </Card>
      {categories && <CategoryEditor key={categories.join('\n')} initial={categories} saved={saved} onSaved={setSaved} />}
      {parameters && (
        <ParameterEditor
          key={JSON.stringify(parameters.values)}
          initial={parameters.values}
          overridden={parameters.overridden}
          saved={paramsSaved}
          onSaved={setParamsSaved}
        />
      )}
      <GoogleDriveCard />
      <BackupCard />
    </>
  )
}

// The backup path with no Google (P10 step 10.1, design decision 1): download one JSON file
// of every table; restore by merging (newest row wins, the default) or by replacing
// everything on this device behind a confirmation. Layout only; the rules are in
// src/db/backup.ts.
function BackupCard() {
  const [mode, setMode] = useState<ImportMode>('merge')
  const [confirmed, setConfirmed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const download = async () => {
    setError(null)
    const snapshot = await exportSnapshot()
    const rows = Object.values(snapshot.tables).reduce((n, t) => n + t.length, 0)
    const url = URL.createObjectURL(new Blob([JSON.stringify(snapshot)], { type: 'application/json' }))
    const a = document.createElement('a')
    a.href = url
    a.download = snapshotFilename(snapshot.exportedAt)
    a.click()
    URL.revokeObjectURL(url)
    setMessage(`Saved ${a.download} (${rows} rows)`)
  }

  const restore = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      const result = await importSnapshot(await file.text(), mode)
      setMessage(result.mode === 'replace' ? `Replaced everything with ${file.name}: ${result.rows} rows` : `Merged ${file.name}: ${result.rows} ${result.rows === 1 ? 'row was' : 'rows were'} newer or new`)
      setConfirmed(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  const ready = mode === 'merge' || confirmed
  return (
    <Card title="Backup" action={<GuideLink topic={GUIDE_LINKS.backup}>About backup and sync</GuideLink>}>
      <p className="mb-3 text-slate-600">One file with every record on this device, deletions included. Keep a copy off the phone after the weekly close and before changing phones.</p>
      <button type="button" className={btnPrimary} onClick={download}>
        Download backup
      </button>
      <div className="mt-5 border-t border-slate-100 pt-4">
        <div className="mb-2 font-semibold">Restore from a file</div>
        <div className="mb-3 space-y-2">
          <label className="flex items-start gap-3">
            <input type="radio" name="restore-mode" className="mt-1.5" checked={mode === 'merge'} onChange={() => setMode('merge')} />
            <span>
              <span className="font-semibold">Merge into this device</span>
              <span className="block text-sm text-slate-500">Row by row, the newer change wins; nothing here is lost to an older backup.</span>
            </span>
          </label>
          <label className="flex items-start gap-3">
            <input type="radio" name="restore-mode" className="mt-1.5" checked={mode === 'replace'} onChange={() => setMode('replace')} />
            <span>
              <span className="font-semibold">Replace everything on this device</span>
              <span className="block text-sm text-slate-500">Erases every record here first, then loads the file. For a new or wiped device only.</span>
            </span>
          </label>
        </div>
        {mode === 'replace' && <Check label="I understand this erases every record on this device first" checked={confirmed} onChange={setConfirmed} />}
        <label className={`${ready ? btnDanger : btnSecondary} mt-3 inline-block cursor-pointer ${ready && !busy ? '' : 'pointer-events-none opacity-40'}`}>
          {busy ? 'Restoring' : mode === 'replace' ? 'Choose a file and replace' : 'Choose a file and merge'}
          <input type="file" accept=".json,application/json" className="hidden" disabled={!ready || busy} onChange={restore} />
        </label>
      </div>
      {message && <p className="mt-3 text-sm font-semibold text-brand-700">{message}</p>}
      <ErrorText error={error} />
    </Card>
  )
}

function CategoryEditor({ initial, saved, onSaved }: { initial: string[]; saved: boolean; onSaved: (v: boolean) => void }) {
  const [text, setText] = useState(initial.join('\n'))
  const [error, setError] = useState<string | null>(null)
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    onSaved(false)
    try {
      await setExpenseCategories(text.split('\n'))
      onSaved(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }
  return (
    <form onSubmit={submit}>
      <Card title="Expense categories">
        <p className="mb-2 text-xs text-slate-500">One per line. Hand expenses on the Finance page pick from this list; stock purchases stays because purchase orders post to it.</p>
        <textarea className={`${inputCls} min-h-56 font-mono text-sm`} value={text} onChange={(e) => { setText(e.target.value); onSaved(false) }} />
        <div className="mt-2">
          <ErrorText error={error} />
          {saved && <p className="text-sm font-medium text-green-700">Categories saved.</p>}
        </div>
        <button type="submit" className={`mt-2 text-sm ${btnPrimary}`}>Save categories</button>
      </Card>
    </form>
  )
}

type ScalarKey = keyof typeof PARAMETER_LABELS

// The store parameters (P7 design decision 2): research defaults with their source row,
// overridden here. Text state per field so a half-typed number does not snap back.
function ParameterEditor({
  initial,
  overridden,
  saved,
  onSaved,
}: {
  initial: StoreParameters
  overridden: string[]
  saved: string | null
  onSaved: (v: string | null) => void
}) {
  const [scalars, setScalars] = useState<Record<ScalarKey, string>>(
    () => Object.fromEntries((Object.keys(PARAMETER_LABELS) as ScalarKey[]).map((k) => [k, String(initial[k])])) as Record<ScalarKey, string>,
  )
  const [allowance, setAllowance] = useState({
    current: String(initial.allowancePct.current),
    d31: String(initial.allowancePct.d31),
    d61: String(initial.allowancePct.d61),
    d90: String(initial.allowancePct.d90),
  })
  const [margin, setMargin] = useState<Record<ProductCategory, string>>(
    () =>
      Object.fromEntries(CATEGORY_ORDER.map((c) => [c, initial.targetMarginPct[c] === undefined ? '' : String(initial.targetMarginPct[c])])) as Record<
        ProductCategory,
        string
      >,
  )
  const [expiry, setExpiry] = useState<Record<ProductCategory, string>>(
    () => Object.fromEntries(CATEGORY_ORDER.map((c) => [c, String(initial.expiryWarningDays[c])])) as Record<ProductCategory, string>,
  )
  const [season, setSeason] = useState<Record<ProductCategory, string[]>>(
    () => Object.fromEntries(CATEGORY_ORDER.map((c) => [c, initial.seasonalIndex[c].map(String)])) as Record<ProductCategory, string[]>,
  )
  const [error, setError] = useState<string | null>(null)
  const num = (s: string) => (s.trim() === '' ? Number.NaN : Number(s))

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    onSaved(null)
    try {
      const patch: Partial<StoreParameters> = {}
      for (const k of Object.keys(PARAMETER_LABELS) as ScalarKey[]) patch[k] = num(scalars[k])
      patch.allowancePct = { current: num(allowance.current), d31: num(allowance.d31), d61: num(allowance.d61), d90: num(allowance.d90) }
      patch.targetMarginPct = Object.fromEntries(CATEGORY_ORDER.filter((c) => margin[c].trim() !== '').map((c) => [c, num(margin[c])]))
      patch.expiryWarningDays = Object.fromEntries(CATEGORY_ORDER.map((c) => [c, num(expiry[c])])) as Record<ProductCategory, number>
      patch.seasonalIndex = Object.fromEntries(CATEGORY_ORDER.map((c) => [c, season[c].map(num) as QuarterIndex])) as Record<ProductCategory, QuarterIndex>
      // Only the groups that differ from the loaded values go into the row, so a research default a later build adds still shows through.
      const canon = (v: unknown) =>
        JSON.stringify(v, (_k, x: unknown) => (x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.entries(x).sort()) : x))
      const same = (k: keyof StoreParameters) => canon(patch[k]) === canon(initial[k]) && !overridden.includes(k)
      for (const k of Object.keys(patch) as (keyof StoreParameters)[]) if (same(k)) delete patch[k]
      if (Object.keys(patch).length === 0) {
        onSaved('Nothing changed.')
        return
      }
      const result = await saveParameters(patch)
      onSaved(`Parameters saved (${result.overridden.length} of ${Object.keys(result.values).length} groups are the store's own).`)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }
  const reset = async () => {
    setError(null)
    await resetParameters()
    onSaved('Back to the research defaults.')
  }
  const small = `${inputCls} w-24 text-right text-sm`
  const cell = 'px-1 py-0.5'
  return (
    <form onSubmit={submit}>
      <Card title="Store parameters" action={<GuideLink topic={GUIDE_LINKS.parameters}>About these parameters</GuideLink>}>
        <p className="mb-3 text-xs text-slate-500">
          The engine's assumptions, seeded from the research (the row id beside each is its source in research/parameters.md) and yours to override; a blank
          target margin means the research has no figure for that line and the margin rules skip it. Research floor {MARGIN_BOUNDS.floorPct.value}% (fertilizer
          practice), ceiling {MARGIN_BOUNDS.ceilingPct.value}% (sector average).
          {overridden.length > 0 && ` Edited groups: ${overridden.join(', ')}.`}
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {(Object.keys(PARAMETER_LABELS) as ScalarKey[]).map((k) => (
            <label key={k} className="flex items-center justify-between gap-2 text-sm">
              <span>
                {PARAMETER_LABELS[k].label}{' '}
                <span className="text-xs text-slate-500">
                  ({PARAMETER_LABELS[k].unit}; {PARAMETER_DEFAULTS[k].source}) <GuideLink topic={GUIDE_LINKS.parameter[k]}>Guide</GuideLink>
                </span>
              </span>
              <input className={small} inputMode="decimal" value={scalars[k]} onChange={(e) => setScalars({ ...scalars, [k]: e.target.value })} />
            </label>
          ))}
        </div>
        <p className="mt-3 text-sm font-medium">
          Allowance for doubtful accounts by aging bucket{' '}
          <span className="text-xs font-normal text-slate-500">(% of the bucket; {PARAMETER_DEFAULTS.allowancePct.source}) <GuideLink topic={GUIDE_LINKS.parameter.allowancePct}>Guide</GuideLink></span>
        </p>
        <div className="mt-1 flex flex-wrap gap-3 text-sm">
          {(['current', 'd31', 'd61', 'd90'] as const).map((b) => (
            <label key={b} className="flex items-center gap-1">
              {{ current: 'up to 30 days', d31: '31 to 60', d61: '61 to 90', d90: 'over 90' }[b]}{' '}
              <input className={small} inputMode="decimal" value={allowance[b]} onChange={(e) => setAllowance({ ...allowance, [b]: e.target.value })} />
            </label>
          ))}
        </div>
        <p className="mt-3 text-sm font-medium">
          Per category{' '}
          <span className="text-xs font-normal text-slate-500">
            <GuideLink topic={GUIDE_LINKS.parameter.targetMarginPct}>margins</GuideLink>, <GuideLink topic={GUIDE_LINKS.parameter.expiryWarningDays}>expiry windows</GuideLink>,{' '}
            <GuideLink topic={GUIDE_LINKS.parameter.seasonalIndex}>seasonal indices</GuideLink>
          </span>
        </p>
        <div className="overflow-x-auto">
          <table className="mt-1 min-w-[50rem] text-sm">
            <thead className="text-left text-xs text-slate-500">
              <tr>
                <th className={cell}>Category</th>
                <th className={cell}>Target margin %</th>
                <th className={cell}>Expiry warning days</th>
                <th className={cell} colSpan={4}>
                  Seasonal index Q1 to Q4
                </th>
                <th className={cell}>Sources</th>
              </tr>
            </thead>
            <tbody>
              {CATEGORY_ORDER.map((c) => (
                <tr key={c}>
                  <td className={`${cell} whitespace-nowrap`}>{CATEGORY_DEFAULTS[c].label}</td>
                  <td className={cell}>
                    <input
                      className={small}
                      inputMode="decimal"
                      placeholder="not set"
                      value={margin[c]}
                      onChange={(e) => setMargin({ ...margin, [c]: e.target.value })}
                    />
                  </td>
                  <td className={cell}>
                    <input className={small} inputMode="numeric" value={expiry[c]} onChange={(e) => setExpiry({ ...expiry, [c]: e.target.value })} />
                  </td>
                  {[0, 1, 2, 3].map((q) => (
                    <td key={q} className={cell}>
                      <input
                        className={`${inputCls} w-24 text-right text-sm`}
                        inputMode="decimal"
                        value={season[c][q]}
                        onChange={(e) => setSeason({ ...season, [c]: season[c].map((v, i) => (i === q ? e.target.value : v)) })}
                      />
                    </td>
                  ))}
                  <td className={`${cell} whitespace-nowrap text-xs text-slate-500`}>
                    {[
                      parameterSource('targetMarginPct', c)?.source,
                      parameterSource('expiryWarningDays', c)?.source,
                      parameterSource('seasonalIndex', c)?.source,
                    ]
                      .filter(Boolean)
                      .join(', ')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-2">
          <ErrorText error={error} />
          {saved && <p className="text-sm font-medium text-green-700">{saved}</p>}
        </div>
        <div className="mt-2 flex gap-2">
          <button type="submit" className={`text-sm ${btnPrimary}`}>
            Save parameters
          </button>
          <button type="button" className={`text-sm ${btnSecondary}`} onClick={reset}>
            Reset to research defaults
          </button>
        </div>
      </Card>
    </form>
  )
}

const STATUS_LABEL: Record<string, { text: string; tone: 'brand' | 'slate' | 'amber' | 'red' | 'green' }> = {
  idle: { text: 'Connected', tone: 'green' },
  syncing: { text: 'Syncing', tone: 'brand' },
  reconnect: { text: 'Reconnect needed', tone: 'amber' },
  offline: { text: 'Offline', tone: 'slate' },
  error: { text: 'Error', tone: 'red' },
}

// The sync card (P10 step 10.3, layout only): connect with the store's shared Google account,
// then the status, the last sync, the changes waiting, Sync now or Reconnect, and Disconnect.
// The rules are in src/sync/store.ts and src/sync/googleDrive.ts.
function GoogleDriveCard() {
  const sync = useSync()
  const pending = useLiveQuery(() => pendingChanges(sync.lastSyncAt), [sync.lastSyncAt])
  const busy = sync.status === 'syncing'

  if (!sync.connected) {
    return (
      <Card title="Google Drive sync" action={<GuideLink topic={GUIDE_LINKS.backup}>About backup and sync</GuideLink>}>
        <p className="mb-3 text-slate-600">
          Keep every phone and laptop that runs the store in step through a private app space in the store's own Google Drive. No server and no account with
          anyone else: sign in once with the store's shared Google account. The sign-in lasts an hour; after that a one-tap Reconnect appears and your changes
          wait here until then.
        </p>
        <button type="button" className={btnPrimary} disabled={busy} onClick={() => void runSync(true)}>
          {busy ? 'Connecting' : 'Connect Google Drive'}
        </button>
        {sync.message && <p className="mt-3 text-sm font-semibold text-red-700">{sync.message}</p>}
      </Card>
    )
  }

  const label = STATUS_LABEL[sync.status] ?? STATUS_LABEL.idle
  return (
    <Card title="Google Drive sync" action={<Badge tone={label.tone}>{label.text}</Badge>}>
      <Row label="Last synced">{sync.lastSyncAt ? format(new Date(sync.lastSyncAt), 'd MMM yyyy HH:mm') : 'never'}</Row>
      <Row label="Changes waiting">{pending ?? ''}</Row>
      <p className="my-3 text-sm text-slate-500">
        Syncs on open, every five minutes while the app is open, when you come back to it and when the connection returns. Changes made offline go on the next sync.
      </p>
      <div className="flex gap-2">
        <button type="button" className={btnPrimary} disabled={busy} onClick={() => void runSync(sync.status === 'reconnect')}>
          {busy ? 'Syncing' : sync.status === 'reconnect' ? 'Reconnect and sync' : 'Sync now'}
        </button>
        <button type="button" className={btnDanger} disabled={busy} onClick={() => void disconnectSync()}>
          Disconnect
        </button>
      </div>
      {sync.message && <p className="mt-3 text-sm text-slate-600">{sync.message}</p>}
      <div className="mt-3">
        <GuideLink topic={GUIDE_LINKS.backup}>About backup and sync</GuideLink>
      </div>
    </Card>
  )
}
