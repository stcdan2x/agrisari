import { useLiveQuery } from 'dexie-react-hooks'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import PageHeader from '../../components/PageHeader'
import { Badge, btnPrimary, btnSecondary, Card, Empty, ErrorText, Field, inputCls, peso, Row } from '../../components/ui'
import { db } from '../../db/db'
import { supplierPayables } from '../../db/paymentRepo'
import { listProducts } from '../../db/productRepo'
import { getPurchase, purchaseStatus, receiveLine } from '../../db/purchaseRepo'
import { getSupplier } from '../../db/supplierRepo'
import { todayISO } from '../../engine/dates'
import type { PurchaseLine } from '../../types'
import { STATUS_LABEL, STATUS_TONE, TERMS_LABEL } from './labels'

export default function PurchasePage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const purchase = useLiveQuery(() => getPurchase(id), [id])
  const supplier = useLiveQuery(async () => (purchase ? ((await getSupplier(purchase.supplierId)) ?? null) : null), [purchase?.supplierId])
  const products = useLiveQuery(() => listProducts({ includeExtension: true }), [])
  const lots = useLiveQuery(() => db.stockLots.where('purchaseId').equals(id).filter((l) => !l.deletedAt).toArray(), [id])
  const payables = useLiveQuery(async () => (purchase ? supplierPayables(purchase.supplierId, todayISO()) : []), [purchase?.supplierId, purchase?.updatedAt])
  const [receiving, setReceiving] = useState<number | null>(null)
  if (purchase === undefined || supplier === undefined || !products || !lots || !payables) return null
  if (!purchase) return <Empty>This purchase was removed.</Empty>
  const byId = new Map(products.map((p) => [p.id, p]))
  const status = purchaseStatus(purchase)
  const row = payables.find((r) => r.purchaseId === purchase.id)
  const owed = row?.open ?? 0

  return (
    <>
      <PageHeader title={supplier?.name ?? 'Purchase'} subtitle={`Ordered ${purchase.date}${supplier ? ` · ${TERMS_LABEL[supplier.terms]}` : ''}`} />
      <div className="mx-4 mb-3 flex flex-wrap gap-2">
        {supplier && (
          <Link to={`/purchasing/suppliers/${supplier.id}`} className={`text-sm ${btnSecondary}`}>
            Supplier card
          </Link>
        )}
        <button className={`text-sm ${btnSecondary}`} onClick={() => navigate('/purchasing')}>All orders</button>
      </div>
      <Card title="Order">
        <Row label="Status"><Badge tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Badge></Row>
        <Row label="Total">{peso(purchase.total)}</Row>
        <Row label="Paid">{peso(purchase.total - owed)}</Row>
        <Row label="Owed">{owed > 0 ? <Badge tone={row?.overdue ? 'red' : 'amber'}>{peso(owed)}{row?.overdue ? ` · ${row.daysOverdue} d overdue` : ''}</Badge> : 'nothing'}</Row>
        {purchase.dueDate && <Row label="Due">{purchase.dueDate}</Row>}
        {purchase.notes && <Row label="Notes">{purchase.notes}</Row>}
      </Card>
      <Card title={`Lines (${purchase.lines.length})`}>
        {purchase.lines.map((l, i) => {
          const p = byId.get(l.productId)
          const remaining = l.qty - l.receivedQty
          return (
            <div key={i} className="border-b border-slate-100 py-2 last:border-0">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold">{p?.name ?? l.productId}</div>
                  <div className="text-xs text-slate-500">
                    {l.qty} {l.unit} at {peso(l.unitCost)} · received {l.receivedQty} of {l.qty}
                    {l.lotNo ? ` · lot ${l.lotNo}` : ''}
                    {l.expiryDate ? ` · exp ${l.expiryDate}` : ''}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="font-medium">{peso(l.qty * l.unitCost)}</div>
                  {remaining > 0 ? (
                    <button className={`mt-1 text-xs ${btnPrimary} px-3 py-1`} onClick={() => setReceiving(receiving === i ? null : i)}>
                      {receiving === i ? 'Close' : 'Receive'}
                    </button>
                  ) : (
                    <Badge tone="green">received</Badge>
                  )}
                </div>
              </div>
              {receiving === i && <ReceiveForm purchaseId={purchase.id} lineIndex={i} line={l} remaining={remaining} onDone={() => setReceiving(null)} />}
            </div>
          )
        })}
      </Card>
      <Card title={`Lots received (${lots.length})`}>
        {lots.length === 0 && <Empty>Nothing received yet.</Empty>}
        {[...lots]
          .sort((a, b) => a.receivedDate.localeCompare(b.receivedDate))
          .map((lot) => {
            const p = byId.get(lot.productId)
            return (
              <Row key={lot.id} label={`${lot.receivedDate} · ${p?.name ?? lot.productId}`}>
                {lot.qtyOnHand} {p?.baseUnit ?? ''} on hand at {peso(lot.unitCost)}
                {lot.lotNo ? ` · ${lot.lotNo}` : ''}
                {lot.expiryDate ? ` · exp ${lot.expiryDate}` : ''}
              </Row>
            )
          })}
      </Card>
    </>
  )
}

function ReceiveForm({ purchaseId, lineIndex, line, remaining, onDone }: { purchaseId: string; lineIndex: number; line: PurchaseLine; remaining: number; onDone: () => void }) {
  const [qty, setQty] = useState(String(remaining))
  const [date, setDate] = useState(todayISO())
  const [lotNo, setLotNo] = useState(line.lotNo ?? '')
  const [expiryDate, setExpiryDate] = useState(line.expiryDate ?? '')
  const [unitCost, setUnitCost] = useState('')
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    try {
      await receiveLine({
        purchaseId,
        lineIndex,
        qty: Number(qty),
        date,
        lotNo,
        ...(expiryDate ? { expiryDate } : {}),
        ...(unitCost !== '' ? { unitCost: Number(unitCost) } : {}),
      })
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  return (
    <form onSubmit={submit} className="mt-2 rounded-xl bg-slate-50 p-3">
      <div className="grid grid-cols-2 gap-2">
        <Field label={`Received, ${line.unit}`} hint={`(${remaining} left)`}><input className={inputCls} value={qty} onChange={(e) => setQty(e.target.value)} inputMode="decimal" autoFocus /></Field>
        <Field label="Date"><input className={inputCls} type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        <Field label="Lot no." hint="(optional)"><input className={inputCls} value={lotNo} onChange={(e) => setLotNo(e.target.value)} /></Field>
        <Field label="Expiry" hint="(optional)"><input className={inputCls} type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} /></Field>
        <Field label={`Cost ₱ per ${line.unit}`} hint={`(blank = ${peso(line.unitCost)} as ordered)`}><input className={inputCls} value={unitCost} onChange={(e) => setUnitCost(e.target.value)} inputMode="decimal" /></Field>
      </div>
      <div className="mt-2">
        <ErrorText error={error} />
      </div>
      <div className="mt-2 flex gap-2">
        <button type="button" className={`text-sm ${btnSecondary}`} onClick={onDone}>Cancel</button>
        <button type="submit" className={`flex-1 text-sm ${btnPrimary}`}>Receive into stock</button>
      </div>
    </form>
  )
}
