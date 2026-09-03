import { useLiveQuery } from 'dexie-react-hooks'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../../components/PageHeader'
import { Badge, btnPrimary, btnSecondary, Card, Empty, ErrorText, Field, inputCls, peso } from '../../components/ui'
import { listCustomers } from '../../db/customerRepo'
import { receivablesAging, recordReceivable } from '../../db/paymentRepo'
import { todayISO } from '../../engine/dates'
import type { Payment } from '../../types'
import { PAYMENT_LABEL } from './labels'

const METHODS: Payment['method'][] = ['cash', 'gcash', 'bank']

export default function ReceivablesPage() {
  const today = todayISO()
  const aging = useLiveQuery(() => receivablesAging(today), [today])
  const customers = useLiveQuery(() => listCustomers(), [])
  const [open, setOpen] = useState(false)
  const [customerId, setCustomerId] = useState('')
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState<Payment['method']>('cash')
  const [date, setDate] = useState(today)
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)
  if (!aging || !customers) return null

  const total = aging.reduce((s, a) => s + a.total, 0)
  const overdue = aging.reduce((s, a) => s + a.d31 + a.d61 + a.d90, 0)
  const pay = (id: string) => {
    setCustomerId(id)
    setOpen(true)
    setSaved(null)
  }
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    try {
      const p = await recordReceivable({ customerId, date, amount: Number(amount), method, note })
      setSaved(`${peso(p.amount)} received from ${customers.find((c) => c.id === customerId)?.name ?? 'customer'}`)
      setAmount('')
      setNote('')
      setOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  return (
    <>
      <PageHeader title="Receivables" subtitle={`${peso(total)} on the listahan${overdue > 0 ? `, ${peso(overdue)} over 30 days` : ''}`} />
      <div className="mx-4 mb-3 flex flex-wrap gap-2">
        <button className={`text-sm ${open ? btnPrimary : btnSecondary}`} onClick={() => setOpen((v) => !v)}>Record payment</button>
        <Link to="/sales" className={`text-sm ${btnSecondary}`}>Back to sales</Link>
      </div>
      {saved && <p className="mx-4 mb-3 rounded-xl bg-green-50 px-3 py-2 text-sm text-green-800">{saved}</p>}
      {open && (
        <form onSubmit={submit}>
          <Card title="Record a payment">
            <div className="grid grid-cols-2 gap-2">
              <Field label="Customer">
                <select className={inputCls} value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
                  <option value="">Choose</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </Field>
              <Field label="Amount ₱"><input className={inputCls} value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" autoFocus /></Field>
              <Field label="Method">
                <select className={inputCls} value={method} onChange={(e) => setMethod(e.target.value as Payment['method'])}>
                  {METHODS.map((m) => (
                    <option key={m} value={m}>{PAYMENT_LABEL[m]}</option>
                  ))}
                </select>
              </Field>
              <Field label="Date"><input className={inputCls} type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
            </div>
            <div className="mt-2">
              <Field label="Note" hint="(optional)"><input className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
            </div>
            <div className="mt-3">
              <ErrorText error={error} />
            </div>
            <div className="mt-2 flex gap-2">
              <button type="button" className={`text-sm ${btnSecondary}`} onClick={() => setOpen(false)}>Cancel</button>
              <button type="submit" className={`flex-1 text-sm ${btnPrimary}`} disabled={!customerId}>Save payment</button>
            </div>
          </Card>
        </form>
      )}
      <Card title={`Who owes (${aging.length})`}>
        {aging.length === 0 && <Empty>Nothing owed. Credit sales appear here with their age.</Empty>}
        {aging.map((a) => (
          <div key={a.customerId} className="flex items-center justify-between gap-3 border-b border-slate-100 py-3 last:border-0">
            <div className="min-w-0">
              <div className="truncate font-semibold">{a.name}</div>
              <div className="flex flex-wrap gap-1 text-xs text-slate-500">
                {a.current > 0 && <Badge tone="slate">current {peso(a.current)}</Badge>}
                {a.d31 > 0 && <Badge tone="amber">31-60 d {peso(a.d31)}</Badge>}
                {a.d61 > 0 && <Badge tone="amber">61-90 d {peso(a.d61)}</Badge>}
                {a.d90 > 0 && <Badge tone="red">over 90 d {peso(a.d90)}</Badge>}
                {a.oldest && <span>since {a.oldest}</span>}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className="font-bold">{peso(a.total)}</span>
              <button className={`text-xs ${btnSecondary}`} onClick={() => pay(a.customerId)}>Pay</button>
            </div>
          </div>
        ))}
      </Card>
    </>
  )
}
