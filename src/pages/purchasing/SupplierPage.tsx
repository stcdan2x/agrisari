import { useLiveQuery } from 'dexie-react-hooks'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import PageHeader from '../../components/PageHeader'
import { Badge, btnPrimary, btnSecondary, Card, Empty, ErrorText, Field, inputCls, LinkButton, ListItem, peso, Row } from '../../components/ui'
import { perBaseUnit, recordPrice, supplierPrices } from '../../db/priceLogRepo'
import { listProducts } from '../../db/productRepo'
import { supplierPayables } from '../../db/paymentRepo'
import { leadTimeFor, listPurchases, purchaseStatus } from '../../db/purchaseRepo'
import { getSupplier } from '../../db/supplierRepo'
import { todayISO } from '../../engine/dates'
import type { PriceObservation } from '../../types'
import { SOURCE_LABEL, STATUS_LABEL, STATUS_TONE, TERMS_LABEL } from './labels'

export default function SupplierPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const supplier = useLiveQuery(() => getSupplier(id), [id])
  const prices = useLiveQuery(() => supplierPrices(id), [id])
  const products = useLiveQuery(() => listProducts(), [])
  const purchases = useLiveQuery(() => listPurchases({ supplierId: id }), [id])
  const payables = useLiveQuery(() => supplierPayables(id), [id])
  const leadTime = useLiveQuery(async () => (supplier ? leadTimeFor(supplier) : null), [supplier])
  const [logging, setLogging] = useState(false)
  if (supplier === undefined || !prices || !products || !purchases || !payables || !leadTime) return null
  const balance = payables.reduce((s, r) => s + r.open, 0)
  const openOf = new Map(payables.map((r) => [r.purchaseId, r.open]))
  if (!supplier) return <Empty>This supplier was removed.</Empty>
  const byId = new Map(products.map((p) => [p.id, p]))

  return (
    <>
      <PageHeader title={supplier.name} subtitle={[TERMS_LABEL[supplier.terms], supplier.contact].filter(Boolean).join(' · ')} />
      <div className="mx-4 mb-3 flex flex-wrap gap-2">
        <LinkButton to="/purchasing/new">New order</LinkButton>
        <button className={`text-sm ${btnSecondary}`} onClick={() => setLogging((v) => !v)}>{logging ? 'Close' : 'Log a price'}</button>
        <Link to={`/purchasing/suppliers/${id}/edit`} className={`text-sm ${btnSecondary}`}>Edit</Link>
        {balance > 0 && <LinkButton to="/purchasing/payables" secondary>Pay</LinkButton>}
        <LinkButton to="/purchasing/suppliers" secondary>All suppliers</LinkButton>
      </div>
      {logging && <PriceForm supplierId={id} onDone={() => setLogging(false)} />}
      <Card title="Terms">
        <Row label="Payment">{TERMS_LABEL[supplier.terms]}</Row>
        <Row label="Owed">{balance > 0 ? <Badge tone="amber">{peso(balance)}</Badge> : 'nothing'}</Row>
        <Row label="Lead time">
          {leadTime.days === undefined ? 'unknown' : `${leadTime.days} day${leadTime.days === 1 ? '' : 's'}`}
          {leadTime.learned ? ` (learned from ${leadTime.samples} receipt${leadTime.samples === 1 ? '' : 's'})` : leadTime.days === undefined ? '' : ' (typed)'}
        </Row>
        {supplier.contact && <Row label="Contact">{supplier.contact}</Row>}
        {supplier.notes && <Row label="Notes">{supplier.notes}</Row>}
      </Card>
      <Card title={`Latest prices (${prices.length})`}>
        {prices.length === 0 && <Empty>No prices yet. Receipts log them automatically; quotes go in by hand.</Empty>}
        {prices.map((o) => {
          const p = byId.get(o.productId)
          return (
            <div key={o.id} className="flex items-center justify-between gap-3 border-b border-slate-100 py-2 last:border-0">
              <div className="min-w-0">
                <div className="font-semibold">{p?.name ?? o.productId}</div>
                <div className="text-xs text-slate-500">
                  {o.date} · {SOURCE_LABEL[o.source]}
                  {o.note ? ` · ${o.note}` : ''}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className="font-medium">{peso(o.value)} per {o.unit}</div>
                {p && o.unit !== p.baseUnit && <Badge tone="slate">{peso(perBaseUnit(o, p))} per {p.baseUnit}</Badge>}
              </div>
            </div>
          )
        })}
      </Card>
      <Card title={`Orders (${purchases.length})`}>
        {purchases.length === 0 && <Empty>No orders yet.</Empty>}
        {purchases.map((p) => {
          const status = purchaseStatus(p)
          return (
            <ListItem
              key={p.id}
              to={`/purchasing/${p.id}`}
              title={
                <>
                  {peso(p.total)} <Badge tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Badge>
                </>
              }
              subtitle={`${p.date} · ${p.lines.map((l) => `${l.qty} ${l.unit} ${byId.get(l.productId)?.name ?? ''}`).join(', ')}`}
              right={openOf.get(p.id) ? <Badge tone="amber">owe {peso(openOf.get(p.id)!)}</Badge> : undefined}
            />
          )
        })}
      </Card>
      <div className="mx-4 mb-4">
        <button className={`text-sm ${btnSecondary}`} onClick={() => navigate('/purchasing/suppliers')}>Back to suppliers</button>
      </div>
    </>
  )
}

function PriceForm({ supplierId, onDone }: { supplierId: string; onDone: () => void }) {
  const products = useLiveQuery(() => listProducts(), [])
  const [productId, setProductId] = useState('')
  const [unit, setUnit] = useState('')
  const [value, setValue] = useState('')
  const [source, setSource] = useState<PriceObservation['source']>('heard')
  const [date, setDate] = useState(todayISO())
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  if (!products) return null
  const product = products.find((p) => p.id === productId)
  const units = product ? [product.baseUnit, ...product.sellUnits.map((u) => u.unit).filter((u) => u !== product.baseUnit)] : []

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    try {
      await recordPrice({ date, productId, kind: 'supplierPrice', value: Number(value), unit: unit || product?.baseUnit || '', source, supplierId, note })
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  return (
    <form onSubmit={submit}>
      <Card title="Log a price">
        <div className="grid gap-3">
          <Field label="Product">
            <select
              className={inputCls}
              value={productId}
              onChange={(e) => {
                setProductId(e.target.value)
                setUnit('')
              }}
            >
              <option value="">Choose a product</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {p.brand ? ` · ${p.brand}` : ''}
                </option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Price ₱"><input className={inputCls} value={value} onChange={(e) => setValue(e.target.value)} inputMode="decimal" /></Field>
            <Field label="Per">
              <select className={inputCls} value={unit || units[0] || ''} onChange={(e) => setUnit(e.target.value)} disabled={!product}>
                {units.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </Field>
            <Field label="Source">
              <select className={inputCls} value={source} onChange={(e) => setSource(e.target.value as PriceObservation['source'])}>
                {(Object.keys(SOURCE_LABEL) as PriceObservation['source'][]).map((s) => (
                  <option key={s} value={s}>{SOURCE_LABEL[s]}</option>
                ))}
              </select>
            </Field>
            <Field label="Date"><input className={inputCls} type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          </div>
          <Field label="Note" hint="(optional)"><input className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
        </div>
        <div className="mt-3">
          <ErrorText error={error} />
        </div>
        <div className="mt-2 flex gap-2">
          <button type="button" className={`text-sm ${btnSecondary}`} onClick={onDone}>Cancel</button>
          <button type="submit" className={`flex-1 text-sm ${btnPrimary}`}>Save price</button>
        </div>
      </Card>
    </form>
  )
}
