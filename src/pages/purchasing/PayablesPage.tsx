import { useLiveQuery } from 'dexie-react-hooks'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../../components/PageHeader'
import { Badge, btnPrimary, btnSecondary, Card, Empty, ErrorText, Field, inputCls, LinkButton, peso } from '../../components/ui'
import { payablesSchedule, recordPayable } from '../../db/paymentRepo'
import { listSuppliers } from '../../db/supplierRepo'
import { todayISO } from '../../engine/dates'
import type { Payment } from '../../types'
import { PAYMENT_LABEL } from '../sales/labels'

const METHODS: Payment['method'][] = ['cash', 'gcash', 'bank']

export default function PayablesPage() {
  const today = todayISO()
  const rows = useLiveQuery(() => payablesSchedule(today), [today])
  const suppliers = useLiveQuery(() => listSuppliers(), [])
  const [open, setOpen] = useState(false)
  const [supplierId, setSupplierId] = useState('')
  const [refId, setRefId] = useState('')
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState<Payment['method']>('cash')
  const [date, setDate] = useState(today)
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)
  if (!rows || !suppliers) return null

  const total = rows.reduce((s, r) => s + r.open, 0)
  const overdue = rows.filter((r) => r.overdue).reduce((s, r) => s + r.open, 0)
  const pay = (r: { supplierId: string; purchaseId: string; open: number }) => {
    setSupplierId(r.supplierId)
    setRefId(r.purchaseId)
    setAmount(String(r.open))
    setOpen(true)
    setSaved(null)
  }
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    try {
      const p = await recordPayable({ supplierId, date, amount: Number(amount), method, ...(refId ? { refId } : {}), note })
      setSaved(`Paid ${peso(p.amount)} to ${suppliers.find((s) => s.id === supplierId)?.name ?? 'the supplier'}`)
      setOpen(false)
      setAmount('')
      setRefId('')
      setNote('')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  return (
    <>
      <PageHeader title="Payables" subtitle="What suppliers are owed and when it falls due" />
      <div className="mx-4 mb-3 flex flex-wrap gap-2">
        <button className={`text-sm ${btnPrimary}`} onClick={() => { setOpen((v) => !v); setSaved(null) }}>
          {open ? 'Close' : 'Record payment'}
        </button>
        <LinkButton to="/purchasing" secondary>Back to purchasing</LinkButton>
      </div>
      {saved && <p className="mx-4 mb-3 text-sm font-medium text-green-700">{saved}</p>}
      {open && (
        <form onSubmit={submit}>
          <Card title="Record a payment">
            <div className="grid gap-3">
              <Field label="Supplier">
                <select className={inputCls} value={supplierId} onChange={(e) => { setSupplierId(e.target.value); setRefId('') }}>
                  <option value="">Choose a supplier</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Amount ₱"><input className={inputCls} value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" autoFocus /></Field>
                <Field label="Method">
                  <select className={inputCls} value={method} onChange={(e) => setMethod(e.target.value as Payment['method'])}>
                    {METHODS.map((m) => (
                      <option key={m} value={m}>{PAYMENT_LABEL[m]}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Date"><input className={inputCls} type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
                <Field label="Note" hint="(optional)"><input className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
              </div>
              {refId && <p className="text-xs text-slate-500">Against the order of {rows.find((r) => r.purchaseId === refId)?.date ?? ''}; the oldest open orders are settled first either way.</p>}
            </div>
            <div className="mt-3">
              <ErrorText error={error} />
            </div>
            <div className="mt-2 flex gap-2">
              <button type="button" className={`text-sm ${btnSecondary}`} onClick={() => setOpen(false)}>Cancel</button>
              <button type="submit" className={`flex-1 text-sm ${btnPrimary}`}>Save payment</button>
            </div>
          </Card>
        </form>
      )}
      <Card title={`Open (${rows.length})`}>
        <div className="mb-3 flex flex-wrap gap-2">
          <Badge tone="amber">owed {peso(total)}</Badge>
          {overdue > 0 && <Badge tone="red">overdue {peso(overdue)}</Badge>}
        </div>
        {rows.length === 0 && <Empty>Nothing owed to suppliers.</Empty>}
        {rows.map((r) => (
          <div key={r.purchaseId} className="flex items-center justify-between gap-3 border-b border-slate-100 py-2 last:border-0">
            <Link to={`/purchasing/${r.purchaseId}`} className="min-w-0">
              <div className="font-semibold">
                {r.supplierName}{' '}
                {r.overdue ? <Badge tone="red">{r.daysOverdue} d overdue</Badge> : r.dueDate ? <Badge tone="slate">due {r.dueDate}</Badge> : <Badge tone="slate">no due date</Badge>}
              </div>
              <div className="text-xs text-slate-500">
                ordered {r.date} · {peso(r.total)}{r.open < r.total ? ` · ${peso(r.open)} left` : ''}
              </div>
            </Link>
            <div className="flex shrink-0 items-center gap-2">
              <span className="font-medium">{peso(r.open)}</span>
              <button className={`text-xs ${btnSecondary} px-3 py-1`} onClick={() => pay(r)}>Pay</button>
            </div>
          </div>
        ))}
      </Card>
    </>
  )
}
