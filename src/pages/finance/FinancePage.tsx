import { useLiveQuery } from 'dexie-react-hooks'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../../components/PageHeader'
import { Badge, btnPrimary, btnSecondary, Card, Empty, ErrorText, Field, inputCls, LinkButton, peso } from '../../components/ui'
import { monthOf, monthRange, todayISO } from '../../engine/dates'
import { addTransaction, expenseCategories, listTransactions, OTHER_REVENUE, TRANSACTION_KINDS } from '../../db/transactionRepo'
import { STOCK_PURCHASES } from '../../db/purchaseRepo'
import type { Transaction, TransactionKind } from '../../types'
import { KIND_LABEL, KIND_TONE, MONEY_IN } from './labels'

export default function FinancePage() {
  const today = todayISO()
  const [month, setMonth] = useState(monthOf(today))
  const [kind, setKind] = useState<TransactionKind | ''>('')
  const [open, setOpen] = useState(false)
  const [saved, setSaved] = useState<string | null>(null)
  const range = month ? monthRange(month) : {}
  const rows = useLiveQuery(() => listTransactions({ ...range, ...(kind ? { kind } : {}) }), [month, kind])
  const categories = useLiveQuery(() => expenseCategories(), [])
  if (!rows || !categories) return null

  const moneyIn = rows.filter((t) => MONEY_IN.has(t.kind)).reduce((s, t) => s + t.amount, 0)
  const moneyOut = rows.filter((t) => !MONEY_IN.has(t.kind)).reduce((s, t) => s + t.amount, 0)

  return (
    <>
      <PageHeader title="Finance" subtitle="The ledger: every peso in and out" />
      <div className="mx-4 mb-3 flex flex-wrap gap-2">
        <button className={`text-sm ${btnPrimary}`} onClick={() => { setOpen((v) => !v); setSaved(null) }}>
          {open ? 'Close' : 'Add entry'}
        </button>
        <LinkButton to={`/finance/reports/income?month=${month}`} secondary>Reports</LinkButton>
      </div>
      {saved && <p className="mx-4 mb-3 text-sm font-medium text-green-700">{saved}</p>}
      {open && (
        <QuickAdd
          categories={categories.filter((c) => c !== STOCK_PURCHASES)}
          today={today}
          onSaved={(t) => {
            setSaved(`Recorded ${KIND_LABEL[t.kind].toLowerCase()}${t.category.toLowerCase() === KIND_LABEL[t.kind].toLowerCase() ? '' : ` (${t.category})`} ${peso(t.amount)} on ${t.date}`)
            setOpen(false)
            setMonth(monthOf(t.date))
          }}
          onCancel={() => setOpen(false)}
        />
      )}
      <div className="mx-4 mb-3 flex gap-2">
        <input className={`${inputCls} w-auto`} type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
        <select className={inputCls} value={kind} onChange={(e) => setKind(e.target.value as TransactionKind | '')}>
          <option value="">All kinds</option>
          {TRANSACTION_KINDS.map((k) => (
            <option key={k} value={k}>{KIND_LABEL[k]}</option>
          ))}
        </select>
      </div>
      <Card title={`Ledger (${rows.length})`}>
        <div className="mb-3 flex flex-wrap gap-2">
          <Badge tone="green">in {peso(moneyIn)}</Badge>
          <Badge tone="red">out {peso(moneyOut)}</Badge>
          <Badge tone={moneyIn - moneyOut >= 0 ? 'brand' : 'amber'}>net {peso(moneyIn - moneyOut)}</Badge>
        </div>
        {rows.length === 0 && <Empty>{month ? 'Nothing recorded in this month.' : 'Nothing recorded yet.'}</Empty>}
        {rows.map((t) => (
          <LedgerRow key={t.id} t={t} />
        ))}
      </Card>
    </>
  )
}

function LedgerRow({ t }: { t: Transaction }) {
  const to = t.links.saleId ? `/sales/${t.links.saleId}` : t.links.purchaseId ? `/purchasing/${t.links.purchaseId}` : undefined
  const inward = MONEY_IN.has(t.kind)
  const body = (
    <>
      <div className="min-w-0">
        <div className="font-semibold">
          {t.category} <Badge tone={KIND_TONE[t.kind]}>{KIND_LABEL[t.kind]}</Badge>
        </div>
        <div className="truncate text-xs text-slate-500">
          {t.date}
          {t.note ? ` · ${t.note}` : ''}
          {to ? ' · open' : ''}
        </div>
      </div>
      <span className={`shrink-0 font-medium ${inward ? 'text-green-700' : 'text-slate-700'}`}>
        {inward ? '+' : '-'}
        {peso(t.amount)}
      </span>
    </>
  )
  const cls = 'flex items-center justify-between gap-3 border-b border-slate-100 py-2 last:border-0'
  return to ? <Link to={to} className={cls}>{body}</Link> : <div className={cls}>{body}</div>
}

function QuickAdd({ categories, today, onSaved, onCancel }: { categories: string[]; today: string; onSaved: (t: Transaction) => void; onCancel: () => void }) {
  const [kind, setKind] = useState<TransactionKind>('expense')
  const [category, setCategory] = useState(categories[0] ?? '') // expense
  const [source, setSource] = useState('') // other revenue
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(today)
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    try {
      onSaved(await addTransaction({ date, kind, category: kind === 'expense' ? category : source, amount: Number(amount), note }))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  return (
    <form onSubmit={submit}>
      <Card title="Add a ledger entry">
        <p className="mb-3 text-xs text-slate-500">Sales and stock purchases are posted by the Sales and Purchasing pages. Record everything else here.</p>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Kind">
            <select className={inputCls} value={kind} onChange={(e) => setKind(e.target.value as TransactionKind)}>
              {TRANSACTION_KINDS.map((k) => (
                <option key={k} value={k}>{KIND_LABEL[k]}</option>
              ))}
            </select>
          </Field>
          {kind === 'expense' && (
            <Field label="Category">
              <select className={inputCls} value={category} onChange={(e) => setCategory(e.target.value)}>
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </Field>
          )}
          {kind === 'revenue' && (
            <Field label="Source" hint="(optional)">
              <input className={inputCls} placeholder={OTHER_REVENUE} value={source} onChange={(e) => setSource(e.target.value)} />
            </Field>
          )}
          <Field label="Amount ₱"><input className={inputCls} value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" autoFocus /></Field>
          <Field label="Date"><input className={inputCls} type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          <div className="col-span-2">
            <Field label="Note" hint="(optional)"><input className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
          </div>
        </div>
        <div className="mt-3">
          <ErrorText error={error} />
        </div>
        <div className="mt-2 flex gap-2">
          <button type="button" className={`text-sm ${btnSecondary}`} onClick={onCancel}>Cancel</button>
          <button type="submit" className={`flex-1 text-sm ${btnPrimary}`}>Save entry</button>
        </div>
      </Card>
    </form>
  )
}
