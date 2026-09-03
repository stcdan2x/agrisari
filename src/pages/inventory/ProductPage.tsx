import { useLiveQuery } from 'dexie-react-hooks'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import PageHeader from '../../components/PageHeader'
import GuideLink from '../../components/GuideLink'
import { Badge, btnPrimary, btnSecondary, Card, Empty, ErrorText, Field, inputCls, peso, Row } from '../../components/ui'
import { db } from '../../db/db'
import { listProducts } from '../../db/productRepo'
import { adjust, averageCost, lotsOnHand, movesForProduct, receiveLot, recordLoss, repack, stockOnHand, writeOffExpired } from '../../db/stockRepo'
import { todayISO } from '../../engine/dates'
import { packLabel } from '../../engine/inventory'
import { CATEGORY_DEFAULTS, LICENCE_LABELS } from '../../knowledge/categories'
import { GUIDE_LINKS } from '../../knowledge/guideLinks'
import { priceLabel, REASON_LABEL } from './labels'

type Action = 'receive' | 'adjust' | 'loss' | 'repack' | null

export default function ProductPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const product = useLiveQuery(() => db.products.get(id), [id])
  const onHand = useLiveQuery(() => stockOnHand(id), [id])
  const avg = useLiveQuery(() => averageCost(id), [id])
  const lots = useLiveQuery(() => lotsOnHand(id), [id])
  const moves = useLiveQuery(() => movesForProduct(id), [id])
  const [action, setAction] = useState<Action>(null)
  const [error, setError] = useState<string | null>(null)
  if (!product || onHand === undefined || avg === undefined || !lots || !moves) return null
  if (product.deletedAt) return <Empty>This product was removed.</Empty>

  const run = async (fn: () => Promise<unknown>) => {
    setError(null)
    try {
      await fn()
      setAction(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }
  const toggle = (a: Action) => setAction((cur) => (cur === a ? null : a))
  const btn = (a: Action) => `text-sm ${action === a ? btnPrimary : btnSecondary}`

  return (
    <>
      <PageHeader title={product.name} subtitle={[product.brand, CATEGORY_DEFAULTS[product.category].label].filter(Boolean).join(' · ')} />
      <div className="mx-4 mb-3 flex flex-wrap gap-2">
        <button className={btn('receive')} onClick={() => toggle('receive')}>Receive</button>
        <button className={btn('adjust')} onClick={() => toggle('adjust')}>Adjust</button>
        <button className={btn('loss')} onClick={() => toggle('loss')}>Loss</button>
        {product.repackable && <button className={btn('repack')} onClick={() => toggle('repack')}>Repack</button>}
        <Link to={`/inventory/products/${id}/edit`} className={`text-sm ${btnSecondary}`}>Edit</Link>
      </div>
      {action === 'receive' && <ReceiveForm productId={id} baseUnit={product.baseUnit} onSubmit={run} onCancel={() => setAction(null)} />}
      {action === 'adjust' && <AdjustForm productId={id} baseUnit={product.baseUnit} onSubmit={run} onCancel={() => setAction(null)} />}
      {action === 'loss' && <LossForm productId={id} baseUnit={product.baseUnit} onSubmit={run} onCancel={() => setAction(null)} />}
      {action === 'repack' && <RepackForm productId={id} baseUnit={product.baseUnit} onSubmit={run} onCancel={() => setAction(null)} />}
      {error && (
        <div className="mx-4 mb-3">
          <ErrorText error={error} />
        </div>
      )}
      <Card title="Stock">
        <Row label="On hand">
          {packLabel(onHand, product)} {onHand < 0 && <Badge tone="red">negative</Badge>}
        </Row>
        <Row label="Average cost">{avg ? `${peso(avg)} per ${product.baseUnit}` : 'none yet'}</Row>
        <Row label="Value at cost">{peso(onHand * avg)}</Row>
        <Row label="Prices">{priceLabel(product)}</Row>
        <Row label="Reorder">{product.reorderLevel > 0 ? `at ${product.reorderLevel} ${product.baseUnit}, buy ${product.reorderQty || product.reorderLevel}` : 'not set'}</Row>
        <Row label="Rules">
          <span className="flex flex-wrap justify-end gap-1">
            <Badge tone={product.vatExempt ? 'green' : 'slate'}>{product.vatExempt ? 'VAT-exempt' : 'VAT'}</Badge>
            {product.hasExpiry && <Badge tone="amber">expiry{product.lotShelfLifeDays ? ` ${product.lotShelfLifeDays} d` : ''}</Badge>}
            {product.repackable && <Badge tone="brand">tingi</Badge>}
            {product.coldChain && <Badge tone="brand">cold chain</Badge>}
            {product.extension && <Badge tone="amber">extension</Badge>}
            <Badge tone="slate">{LICENCE_LABELS[product.licenceClass]}</Badge>
          </span>
        </Row>
        <Row label="Guide">
          <span className="flex flex-wrap justify-end gap-3">
            <GuideLink topic={GUIDE_LINKS.category[product.category]}>{CATEGORY_DEFAULTS[product.category].label}</GuideLink>
            <GuideLink topic={GUIDE_LINKS.licence[product.licenceClass]}>Licence</GuideLink>
            <GuideLink topic={GUIDE_LINKS.storage[product.category]}>Storage and expiry</GuideLink>
          </span>
        </Row>
      </Card>
      <Card title={`Lots (${lots.length})`}>
        {lots.length === 0 && <Empty>Nothing on hand. Receive stock to open a lot.</Empty>}
        {lots.map((l) => (
          <div key={l.id} className="flex items-center justify-between gap-3 border-b border-slate-100 py-2 last:border-0">
            <div className="min-w-0">
              <div className="font-semibold">
                {packLabel(l.qtyOnHand, product)}
                {l.lotNo && <span className="font-normal text-slate-500"> · lot {l.lotNo}</span>}
              </div>
              <div className="text-xs text-slate-500">
                received {l.receivedDate} at {peso(l.unitCost)} per {product.baseUnit}
                {l.expiryDate && ` · expires ${l.expiryDate}`}
              </div>
            </div>
            {l.expiryDate && (
              <button className={`shrink-0 text-xs ${btnSecondary}`} onClick={() => run(() => writeOffExpired({ lotId: l.id, date: todayISO() }))}>
                Write off
              </button>
            )}
          </div>
        ))}
      </Card>
      <Card title={`Moves (${moves.length})`}>
        {moves.length === 0 && <Empty>No stock moves yet.</Empty>}
        {moves.map((m) => (
          <div key={m.id} className="flex items-center justify-between gap-3 border-b border-slate-100 py-2 last:border-0">
            <div className="min-w-0">
              <div className="font-semibold">
                {REASON_LABEL[m.reason]} <span className={m.qtyDelta < 0 ? 'text-red-600' : 'text-brand-700'}>{m.qtyDelta > 0 ? '+' : ''}{m.qtyDelta} {product.baseUnit}</span>
              </div>
              <div className="truncate text-xs text-slate-500">
                {m.date} · {peso(m.unitCost)} per {product.baseUnit}
                {m.note && ` · ${m.note}`}
              </div>
            </div>
          </div>
        ))}
      </Card>
      <div className="mx-4 mb-6">
        <button className={`text-sm ${btnSecondary}`} onClick={() => navigate('/inventory')}>
          Back to inventory
        </button>
      </div>
    </>
  )
}

type FormProps = { productId: string; baseUnit: string; onSubmit: (fn: () => Promise<unknown>) => Promise<void>; onCancel: () => void }

function Actions({ label, onCancel }: { label: string; onCancel: () => void }) {
  return (
    <div className="flex gap-2">
      <button type="button" className={`text-sm ${btnSecondary}`} onClick={onCancel}>Cancel</button>
      <button type="submit" className={`flex-1 text-sm ${btnPrimary}`}>{label}</button>
    </div>
  )
}

function ReceiveForm({ productId, baseUnit, onSubmit, onCancel }: FormProps) {
  const [qty, setQty] = useState('')
  const [unitCost, setUnitCost] = useState('')
  const [date, setDate] = useState(todayISO())
  const [lotNo, setLotNo] = useState('')
  const [expiryDate, setExpiryDate] = useState('')
  const submit = (e: FormEvent) => {
    e.preventDefault()
    onSubmit(() => receiveLot({ productId, qty: Number(qty), unitCost: Number(unitCost), date, lotNo: lotNo || undefined, expiryDate: expiryDate || undefined }))
  }
  return (
    <form onSubmit={submit}>
      <Card title="Receive stock">
        <div className="grid grid-cols-2 gap-2">
          <Field label={`Quantity (${baseUnit})`}><input className={inputCls} value={qty} onChange={(e) => setQty(e.target.value)} inputMode="decimal" autoFocus /></Field>
          <Field label={`Cost per ${baseUnit} ₱`}><input className={inputCls} value={unitCost} onChange={(e) => setUnitCost(e.target.value)} inputMode="decimal" /></Field>
          <Field label="Date"><input className={inputCls} type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          <Field label="Lot no." hint="(optional)"><input className={inputCls} value={lotNo} onChange={(e) => setLotNo(e.target.value)} /></Field>
          <Field label="Expiry" hint="(label date, else the shelf life applies)"><input className={inputCls} type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} /></Field>
        </div>
        <div className="mt-3"><Actions label="Receive" onCancel={onCancel} /></div>
      </Card>
    </form>
  )
}

function AdjustForm({ productId, baseUnit, onSubmit, onCancel }: FormProps) {
  const [qtyDelta, setQtyDelta] = useState('')
  const [note, setNote] = useState('')
  const [date, setDate] = useState(todayISO())
  const submit = (e: FormEvent) => {
    e.preventDefault()
    onSubmit(() => adjust({ productId, qtyDelta: Number(qtyDelta), date, note }))
  }
  return (
    <form onSubmit={submit}>
      <Card title="Adjust stock">
        <div className="grid grid-cols-2 gap-2">
          <Field label={`Change (${baseUnit})`} hint="+ found, - missing"><input className={inputCls} value={qtyDelta} onChange={(e) => setQtyDelta(e.target.value)} inputMode="decimal" autoFocus /></Field>
          <Field label="Date"><input className={inputCls} type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          <div className="col-span-2"><Field label="Why"><input className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. opening stock, found a sack in the bodega" /></Field></div>
        </div>
        <div className="mt-3"><Actions label="Adjust" onCancel={onCancel} /></div>
      </Card>
    </form>
  )
}

function LossForm({ productId, baseUnit, onSubmit, onCancel }: FormProps) {
  const [qty, setQty] = useState('')
  const [note, setNote] = useState('')
  const [date, setDate] = useState(todayISO())
  const submit = (e: FormEvent) => {
    e.preventDefault()
    onSubmit(() => recordLoss({ productId, qty: Number(qty), date, note }))
  }
  return (
    <form onSubmit={submit}>
      <Card title="Record a loss">
        <div className="grid grid-cols-2 gap-2">
          <Field label={`Quantity lost (${baseUnit})`}><input className={inputCls} value={qty} onChange={(e) => setQty(e.target.value)} inputMode="decimal" autoFocus /></Field>
          <Field label="Date"><input className={inputCls} type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          <div className="col-span-2"><Field label="Note" hint="(optional)"><input className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} placeholder="wet sack, spilled, rats" /></Field></div>
        </div>
        <div className="mt-3"><Actions label="Record loss" onCancel={onCancel} /></div>
      </Card>
    </form>
  )
}

function RepackForm({ productId, baseUnit, onSubmit, onCancel }: FormProps) {
  const targets = useLiveQuery(() => listProducts({ includeExtension: true }), []) ?? []
  const [toProductId, setTo] = useState('')
  const [qtyOut, setQtyOut] = useState('')
  const [qtyIn, setQtyIn] = useState('')
  const [note, setNote] = useState('')
  const [date, setDate] = useState(todayISO())
  const target = targets.find((p) => p.id === toProductId)
  const submit = (e: FormEvent) => {
    e.preventDefault()
    onSubmit(() => repack({ fromProductId: productId, toProductId, qtyOut: Number(qtyOut), qtyIn: Number(qtyIn), date, note: note || undefined }))
  }
  return (
    <form onSubmit={submit}>
      <Card title="Repack into another product">
        <p className="mb-2 text-xs text-slate-500">Tingi needs no repack: stock is kept in {baseUnit} and sold by any unit. Use this to turn bulk stock into a different product, such as labelled packs.</p>
        <div className="grid grid-cols-2 gap-2">
          <div className="col-span-2">
            <Field label="Into">
              <select className={inputCls} value={toProductId} onChange={(e) => setTo(e.target.value)}>
                <option value="">Choose a product</option>
                {targets.filter((p) => p.id !== productId).map((p) => (
                  <option key={p.id} value={p.id}>{p.name}{p.brand ? ` (${p.brand})` : ''}</option>
                ))}
              </select>
            </Field>
          </div>
          <Field label={`Taken (${baseUnit})`}><input className={inputCls} value={qtyOut} onChange={(e) => setQtyOut(e.target.value)} inputMode="decimal" /></Field>
          <Field label={`Made (${target?.baseUnit ?? 'units'})`}><input className={inputCls} value={qtyIn} onChange={(e) => setQtyIn(e.target.value)} inputMode="decimal" /></Field>
          <Field label="Date"><input className={inputCls} type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          <Field label="Note" hint="(optional)"><input className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
        </div>
        <div className="mt-3"><Actions label="Repack" onCancel={onCancel} /></div>
      </Card>
    </form>
  )
}
