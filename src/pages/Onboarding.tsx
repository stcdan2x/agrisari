import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, Field, btnPrimary, btnSecondary, inputCls } from '../components/ui'
import { saveStore } from '../db/storeRepo'
import { restoreFromDrive } from '../sync/restore'
import { seedCatalog } from '../knowledge/catalog'
import type { Store, TaxMode } from '../types'

const today = () => new Date().toISOString().slice(0, 10)

// Decision 7: tax is optional and never blocks entry; the Guide explains the rules (P9).
export const TAX_MODES: { value: TaxMode; label: string; hint: string }[] = [
  { value: 'off', label: 'Off', hint: 'No tax figures anywhere. Start here if you are not registered yet.' },
  { value: 'nonVat', label: 'Non-VAT', hint: 'Estimates the percentage tax or the 8 percent option on the income statement.' },
  { value: 'vat', label: 'VAT', hint: 'Splits VAT-exempt lines (feeds, fertilizers, seeds) from VATable lines and shows output less input VAT.' },
]

export default function Onboarding({ store }: { store: Store | null }) {
  const editMode = store !== null
  const [name, setName] = useState(store?.name ?? '')
  const [location, setLocation] = useState(store?.location ?? '')
  const [startDate, setStartDate] = useState(store?.startDate ?? today())
  const [taxMode, setTaxMode] = useState<TaxMode>(store?.taxMode ?? 'off')
  const [loadCatalog, setLoadCatalog] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [restoring, setRestoring] = useState(false)
  const [restoreMessage, setRestoreMessage] = useState<string | null>(null)
  const navigate = useNavigate()

  async function finish() {
    if (!name.trim()) return setError('Please enter the store name.')
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) return setError('Please pick the start date.')
    setError(null)
    await saveStore({
      name: name.trim(),
      ...(location.trim() ? { location: location.trim() } : {}),
      startDate,
      taxMode,
    })
    if (!editMode && loadCatalog) await seedCatalog()
    // justOnboarded: the live query has not re-emitted yet on this render, so
    // App must not bounce straight back here (same pattern as pg-farm and hf-tracker).
    navigate(editMode ? '/settings' : '/', { replace: true, state: { justOnboarded: true } })
  }

  // P11 step 11.0: a second device pulls the account's records before it has a store row of
  // its own; the Google popup needs the owner's own tap (a user gesture).
  async function restore() {
    setRestoring(true)
    setRestoreMessage(null)
    const result = await restoreFromDrive()
    setRestoring(false)
    if (result.outcome === 'restored') navigate('/', { replace: true, state: { justOnboarded: true } })
    else setRestoreMessage(result.message)
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col px-5 pb-8 pt-8">
      {!editMode && (
        <div className="mb-8 flex flex-col items-center text-center">
          <img src="icon.svg" alt="" className="mb-4 h-20 w-20 rounded-3xl" />
          <h1 className="text-3xl font-bold">AgriSari</h1>
          <p className="mt-2 max-w-xs text-slate-500">
            Run your agri-vet store: sales, stock, money, and which ways of buying and selling pay best.
          </p>
        </div>
      )}
      {!editMode && (
        <div className="mb-6 flex flex-col gap-2 rounded-xl border border-slate-300 bg-white p-4">
          <p className="text-sm font-medium">Already using AgriSari on another phone?</p>
          <p className="text-sm text-slate-500">Bring the records here first, so both phones share one store.</p>
          <button className={`${btnSecondary} disabled:opacity-40`} onClick={restore} disabled={restoring}>
            {restoring ? 'Connecting to Google Drive...' : 'Restore from Google Drive'}
          </button>
          {restoreMessage && <p className="text-sm font-medium text-amber-700">{restoreMessage}</p>}
        </div>
      )}
      <div className="flex flex-col gap-4">
        <h2 className="text-xl font-bold">{editMode ? 'Store profile' : 'Your store'}</h2>
        <Field label="Store name">
          <input className={inputCls} placeholder="e.g. Santos Agrivet Supply" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Location" hint="(optional)">
          <input className={inputCls} placeholder="Barangay, town, province" value={location} onChange={(e) => setLocation(e.target.value)} />
        </Field>
        <Field label="Records start from">
          <input className={inputCls} type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </Field>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-medium">Tax mode</legend>
          {TAX_MODES.map((m) => (
            <label
              key={m.value}
              className={`flex cursor-pointer gap-3 rounded-xl border px-3 py-2.5 ${
                taxMode === m.value ? 'border-brand-500 bg-brand-50' : 'border-slate-300 bg-white'
              }`}
            >
              <input type="radio" name="taxMode" value={m.value} checked={taxMode === m.value} onChange={() => setTaxMode(m.value)} className="mt-1" />
              <span className="flex flex-col text-sm">
                <span className="font-medium">{m.label}</span>
                <span className="text-slate-500">{m.hint}</span>
              </span>
            </label>
          ))}
          <p className="text-xs text-slate-500">Tax figures are estimates only; you can change the mode any time in Settings.</p>
        </fieldset>
        {!editMode && (
          <Check
            label="Load the starter catalog"
            hint="130 common agrivet SKUs (feeds, ingredients, seeds, fertilizers, pesticides, tools) without prices; the vet, vaccine and pet lines stay hidden until you enable them."
            checked={loadCatalog}
            onChange={setLoadCatalog}
          />
        )}
        <p className="text-sm text-slate-500">
          Amounts are in Philippine pesos. Your data stays on this device; back it up or sync it
          through your Google account later from Settings.
        </p>
      </div>
      <div className="mt-auto pt-6">
        {error && <p className="mb-3 text-sm font-medium text-red-600">{error}</p>}
        <div className="flex gap-3">
          {editMode && (
            <button className={btnSecondary} onClick={() => navigate('/settings')}>
              Back
            </button>
          )}
          <button className={`flex-1 ${btnPrimary} py-3.5`} onClick={finish}>
            {editMode ? 'Save changes' : 'Start'}
          </button>
        </div>
      </div>
    </div>
  )
}
