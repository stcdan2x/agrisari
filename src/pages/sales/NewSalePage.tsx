import { useLiveQuery } from 'dexie-react-hooks'
import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import BarcodeScanner, { canScan } from '../../components/BarcodeScanner'
import PageHeader from '../../components/PageHeader'
import GuideLink from '../../components/GuideLink'
import { Badge, btnPrimary, btnSecondary, Card, Check, Empty, ErrorText, Field, inputCls, peso } from '../../components/ui'
import { createCustomer, creditCheck } from '../../db/customerRepo'
import { db } from '../../db/db'
import { createSale, listSales } from '../../db/saleRepo'
import { stockSnapshots } from '../../db/stockRepo'
import { todayISO } from '../../engine/dates'
import { packLabel } from '../../engine/inventory'
import type { CustomerType, PaymentMethod, Product } from '../../types'
import { CUSTOMER_TYPE_LABEL, PAYMENT_LABEL } from './labels'

interface Line {
  product: Product
  qty: string
  unit: string
  price: string
}

const METHODS: PaymentMethod[] = ['cash', 'gcash', 'bank', 'credit', 'mixed']
const CUSTOMER_TYPES = Object.keys(CUSTOMER_TYPE_LABEL) as CustomerType[]
const NEW_CUSTOMER = '__new'

// The picker: search by name, brand or barcode; with an empty search it offers the
// products of the last sales (recent) and the most often sold (favourites).
export default function NewSalePage() {
  const navigate = useNavigate()
  const snaps = useLiveQuery(() => stockSnapshots(), [])
  const sales = useLiveQuery(() => listSales(), [])
  const customers = useLiveQuery(() => db.customers.filter((c) => !c.deletedAt).toArray(), [])
  const [query, setQuery] = useState('')
  const [lines, setLines] = useState<Line[]>([])
  const [date, setDate] = useState(todayISO())
  const [method, setMethod] = useState<PaymentMethod>('cash')
  const [customerId, setCustomerId] = useState('')
  const [addingCustomer, setAddingCustomer] = useState(false)
  const [paid, setPaid] = useState('')
  const [withDelivery, setWithDelivery] = useState(false)
  const [address, setAddress] = useState('')
  const [fee, setFee] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [overLimit, setOverLimit] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [scanNote, setScanNote] = useState<string | null>(null)
  if (!snaps || !sales || !customers) return null

  const live = snaps.filter((s) => !s.product.extension)
  const onHand = new Map(live.map((s) => [s.product.id, s.onHand]))
  const byId = new Map(live.map((s) => [s.product.id, s.product]))
  const q = query.trim().toLowerCase()
  const matches = q
    ? live.filter(({ product: p }) => p.name.toLowerCase().includes(q) || p.brand?.toLowerCase().includes(q) || p.barcode === q).map((s) => s.product)
    : []
  const recent: Product[] = []
  const counts = new Map<string, number>()
  for (const s of sales) {
    for (const l of s.lines) {
      counts.set(l.productId, (counts.get(l.productId) ?? 0) + 1)
      const p = byId.get(l.productId)
      if (p && recent.length < 6 && !recent.includes(p)) recent.push(p)
    }
  }
  const favourites = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => byId.get(id))
    .filter((p): p is Product => !!p)
    .slice(0, 6)

  const add = (p: Product) => {
    const unit = p.sellUnits.find((u) => u.price > 0) ?? p.sellUnits[0]
    setLines((ls) => [...ls, { product: p, qty: '1', unit: unit.unit, price: unit.price ? String(unit.price) : '' }])
    setQuery('')
  }
  const patch = (i: number, change: Partial<Line>) =>
    setLines((ls) =>
      ls.map((l, j) => {
        if (j !== i) return l
        const next = { ...l, ...change }
        if (change.unit) next.price = String(l.product.sellUnits.find((u) => u.unit === change.unit)?.price || '')
        return next
      }),
    )
  const remove = (i: number) => setLines((ls) => ls.filter((_, j) => j !== i))
  const scanned = (code: string) => {
    setScanning(false)
    const p = live.find((s) => s.product.barcode === code)?.product
    if (p) {
      add(p)
      setScanNote(`Scanned ${p.name}`)
    } else {
      setQuery(code)
      setScanNote(`No product carries the barcode ${code}; add it on the product form`)
    }
  }
  const goods = lines.reduce((s, l) => s + (Number(l.qty) || 0) * (Number(l.price) || 0), 0)
  const total = goods + (withDelivery ? Number(fee) || 0 : 0)
  const needsPaid = method === 'mixed'
  const owed = method === 'credit' ? total : needsPaid ? Math.max(total - (Number(paid) || 0), 0) : 0

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    try {
      if (overLimit && !notes.trim()) throw new Error('Over the credit limit: add a note to allow it')
      const sale = await createSale({
        date,
        customerId: customerId || undefined,
        lines: lines.map((l) => ({ productId: l.product.id, qty: Number(l.qty), unit: l.unit, unitPrice: l.price === '' ? undefined : Number(l.price) })),
        paymentMethod: method,
        paidAmount: needsPaid ? Number(paid) : undefined,
        delivery: withDelivery ? { address, fee: Number(fee) || 0 } : undefined,
        notes,
      })
      navigate(`/sales/${sale.id}`, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  const pick = (title: string, items: Product[]) =>
    items.length > 0 && (
      <div className="mb-2">
        <div className="mb-1 text-xs font-semibold uppercase text-slate-400">{title}</div>
        <div className="flex flex-wrap gap-1">
          {items.map((p) => (
            <button key={p.id} type="button" className="rounded-full bg-slate-100 px-3 py-1 text-sm" onClick={() => add(p)}>
              {p.name}
            </button>
          ))}
        </div>
      </div>
    )

  return (
    <form onSubmit={submit}>
      <PageHeader title="New sale" subtitle="Pick products, then take the payment" />
      <Card title="Products">
        <div className="flex gap-2">
          <input className={inputCls} placeholder="Search name, brand or barcode" value={query} onChange={(e) => setQuery(e.target.value)} autoFocus />
          <button
            type="button"
            className={`shrink-0 text-sm ${scanning ? btnPrimary : btnSecondary}`}
            onClick={() => {
              setScanNote(canScan() ? null : 'This browser cannot scan; type the code or use a hardware scanner')
              if (canScan()) setScanning((v) => !v)
            }}
          >
            Scan
          </button>
        </div>
        {scanning && <ScannerBox onDetect={scanned} onClose={() => setScanning(false)} />}
        {scanNote && <p className="mt-2 text-xs text-slate-500">{scanNote}</p>}
        {q && matches.length === 0 && <Empty>No product matches "{query}".</Empty>}
        {q && matches.length > 0 && (
          <div className="mt-2">
            {matches.slice(0, 12).map((p) => (
              <button key={p.id} type="button" className="flex w-full items-center justify-between gap-3 border-b border-slate-100 py-2 text-left last:border-0" onClick={() => add(p)}>
                <span>
                  <span className="font-semibold">{p.name}</span>
                  {p.brand && <span className="text-slate-500"> · {p.brand}</span>}
                  <span className="block text-xs text-slate-500">{p.sellUnits.map((u) => (u.price ? `${peso(u.price)} per ${u.unit}` : `${u.unit}: no price yet`)).join(' · ')}</span>
                </span>
                <span className="shrink-0 text-xs text-slate-500">{packLabel(onHand.get(p.id) ?? 0, p)}</span>
              </button>
            ))}
          </div>
        )}
        {!q && (
          <div className="mt-3">
            {pick('Recent', recent)}
            {pick('Favourites', favourites.filter((p) => !recent.includes(p)))}
            {recent.length === 0 && <p className="text-xs text-slate-400">Recent and favourite products appear here after the first sales.</p>}
          </div>
        )}
      </Card>
      <Card title={`Lines (${lines.length})`}>
        {lines.length === 0 && <Empty>Nothing picked yet.</Empty>}
        {lines.map((l, i) => (
          <div key={i} className="border-b border-slate-100 py-2 last:border-0">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold">{l.product.name}</span>
              <span className="text-xs text-slate-500">{packLabel(onHand.get(l.product.id) ?? 0, l.product)} on hand</span>
            </div>
            <div className="mt-1 grid grid-cols-[1fr_1fr_1fr_auto] items-end gap-2">
              <Field label="Qty"><input className={inputCls} value={l.qty} onChange={(e) => patch(i, { qty: e.target.value })} inputMode="decimal" /></Field>
              <Field label="Unit">
                <select className={inputCls} value={l.unit} onChange={(e) => patch(i, { unit: e.target.value })}>
                  {l.product.sellUnits.map((u) => (
                    <option key={u.unit} value={u.unit}>{u.unit}</option>
                  ))}
                </select>
              </Field>
              <Field label="Price ₱"><input className={inputCls} value={l.price} onChange={(e) => patch(i, { price: e.target.value })} inputMode="decimal" placeholder="type" /></Field>
              <button type="button" className={`text-sm ${btnSecondary}`} onClick={() => remove(i)}>Remove</button>
            </div>
            <div className="mt-1 text-right text-sm font-medium">{peso((Number(l.qty) || 0) * (Number(l.price) || 0))}</div>
          </div>
        ))}
      </Card>
      <Card title="Payment">
        <div className="grid grid-cols-2 gap-2">
          <Field label="Date"><input className={inputCls} type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          <Field label="Method">
            <select className={inputCls} value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
              {METHODS.map((m) => (
                <option key={m} value={m}>{PAYMENT_LABEL[m]}</option>
              ))}
            </select>
          </Field>
          <Field label="Customer" hint={method === 'credit' || needsPaid ? '(needed for credit)' : '(optional)'}>
            <select
              className={inputCls}
              value={addingCustomer ? NEW_CUSTOMER : customerId}
              onChange={(e) => {
                setAddingCustomer(e.target.value === NEW_CUSTOMER)
                setCustomerId(e.target.value === NEW_CUSTOMER ? '' : e.target.value)
              }}
            >
              <option value="">Walk-in</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
              <option value={NEW_CUSTOMER}>Add new customer...</option>
            </select>
          </Field>
          {needsPaid && (
            <Field label="Paid now ₱"><input className={inputCls} value={paid} onChange={(e) => setPaid(e.target.value)} inputMode="decimal" /></Field>
          )}
        </div>
        {addingCustomer && (
          <QuickCustomer
            onAdded={(id) => {
              setCustomerId(id)
              setAddingCustomer(false)
            }}
            onCancel={() => setAddingCustomer(false)}
          />
        )}
        <div className="mt-3">
          <Check label="Deliver this sale" hint="The fee is added to the total; the delivery stays pending until marked delivered." checked={withDelivery} onChange={setWithDelivery} />
        </div>
        {withDelivery && (
          <div className="mt-2 grid grid-cols-[2fr_1fr] gap-2">
            <Field label="Address"><input className={inputCls} value={address} onChange={(e) => setAddress(e.target.value)} /></Field>
            <Field label="Fee ₱"><input className={inputCls} value={fee} onChange={(e) => setFee(e.target.value)} inputMode="decimal" /></Field>
          </div>
        )}
        <div className="mt-2">
          <Field label="Notes" hint="(optional)"><input className={inputCls} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
        </div>
        {customerId && owed > 0 && <CreditWarning customerId={customerId} owed={owed} onOver={setOverLimit} />}
        <div className="mt-3 flex items-center justify-between text-base">
          <span className="text-slate-500">Total</span>
          <span className="font-bold">
            {peso(total)} {owed > 0 && <Badge tone="amber">owes {peso(owed)}</Badge>}
          </span>
        </div>
        <div className="mt-3">
          <ErrorText error={error} />
        </div>
        <div className="mt-2 flex gap-2">
          <button type="button" className={`text-sm ${btnSecondary}`} onClick={() => navigate('/sales')}>Cancel</button>
          <button type="submit" className={`flex-1 text-sm ${btnPrimary}`} disabled={lines.length === 0}>Post sale</button>
        </div>
      </Card>
    </form>
  )
}

// A customer created without leaving the sale (TASK 002): the row is saved on Add and
// selected for the sale in hand. Enter inside the form adds the customer, never posts the sale.
function QuickCustomer({ onAdded, onCancel }: { onAdded: (id: string) => void; onCancel: () => void }) {
  const [name, setName] = useState('')
  const [type, setType] = useState<CustomerType>('backyard')
  const [contact, setContact] = useState('')
  const [creditLimit, setCreditLimit] = useState('')
  const [error, setError] = useState<string | null>(null)
  const add = async () => {
    setError(null)
    try {
      const row = await createCustomer({ name, type, contact, creditLimit: creditLimit === '' ? undefined : Number(creditLimit) })
      onAdded(row.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }
  return (
    <div
      className="mt-2 rounded-xl bg-slate-50 p-3"
      onKeyDown={(e) => {
        if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'BUTTON') {
          e.preventDefault()
          void add()
        }
      }}
    >
      <div className="mb-2 text-xs font-semibold uppercase text-slate-400">New customer</div>
      <div className="grid gap-2">
        <Field label="Name"><input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} autoFocus /></Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Type">
            <select className={inputCls} value={type} onChange={(e) => setType(e.target.value as CustomerType)}>
              {CUSTOMER_TYPES.map((t) => (
                <option key={t} value={t}>{CUSTOMER_TYPE_LABEL[t]}</option>
              ))}
            </select>
          </Field>
          <Field label="Contact" hint="(optional)"><input className={inputCls} value={contact} onChange={(e) => setContact(e.target.value)} /></Field>
          <Field label="Credit limit ₱" hint="(blank = no limit)"><input className={inputCls} value={creditLimit} onChange={(e) => setCreditLimit(e.target.value)} inputMode="decimal" /></Field>
        </div>
      </div>
      <div className="mt-2">
        <ErrorText error={error} />
      </div>
      <div className="mt-2 flex gap-2">
        <button type="button" className={`text-sm ${btnSecondary}`} onClick={onCancel}>Cancel</button>
        <button type="button" className={`flex-1 text-sm ${btnPrimary}`} onClick={add}>Add customer</button>
      </div>
    </div>
  )
}

// Soft credit limit (PLAN.md F4): warn, then allow with a note.
function CreditWarning({ customerId, owed, onOver }: { customerId: string; owed: number; onOver: (over: boolean) => void }) {
  const check = useLiveQuery(() => creditCheck(customerId, owed), [customerId, owed])
  useEffect(() => onOver(check?.over ?? false), [check?.over, onOver])
  if (!check) return null
  return (
    <p className={`mt-3 rounded-xl px-3 py-2 text-sm ${check.over ? 'bg-amber-50 text-amber-800' : 'bg-slate-50 text-slate-600'}`}>
      Listahan balance {peso(check.balance)}, {peso(check.after)} after this sale
      {check.limit ? ` (limit ${peso(check.limit)})` : ''}.{check.over && ' Over the limit: add a note to allow it.'}{' '}
      <GuideLink topic="credit-policy">Credit policy</GuideLink>
    </p>
  )
}

function ScannerBox({ onDetect, onClose }: { onDetect: (code: string) => void; onClose: () => void }) {
  const detect = useCallback(onDetect, []) // eslint-disable-line react-hooks/exhaustive-deps -- one scanner session per mount
  return <BarcodeScanner onDetect={detect} onClose={onClose} />
}
