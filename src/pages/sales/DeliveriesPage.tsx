import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../../components/PageHeader'
import { btnPrimary, Card, Empty, ErrorText, LinkButton, peso } from '../../components/ui'
import { db } from '../../db/db'
import { listDeliveries, markDelivered } from '../../db/saleRepo'

export default function DeliveriesPage() {
  const pending = useLiveQuery(() => listDeliveries('pending'), [])
  const delivered = useLiveQuery(() => listDeliveries('delivered'), [])
  const customers = useLiveQuery(() => db.customers.toArray(), [])
  const products = useLiveQuery(() => db.products.toArray(), [])
  const [error, setError] = useState<string | null>(null)
  if (!pending || !delivered || !customers || !products) return null
  const who = new Map(customers.map((c) => [c.id, c.name]))
  const name = new Map(products.map((p) => [p.id, p.name]))
  const done = async (id: string) => {
    setError(null)
    try {
      await markDelivered(id)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }
  const row = (s: (typeof pending)[number], action?: boolean) => (
    <div key={s.id} className="flex items-center justify-between gap-3 border-b border-slate-100 py-3 last:border-0">
      <div className="min-w-0">
        <Link to={`/sales/${s.id}`} className="font-semibold">
          {s.customerId ? who.get(s.customerId) ?? 'customer' : 'walk-in'} · {s.delivery!.address}
        </Link>
        <div className="truncate text-xs text-slate-500">
          {s.date} · {s.lines.map((l) => `${l.qty} ${l.unit} ${name.get(l.productId) ?? ''}`).join(', ')} · {peso(s.total)}
          {s.paidAmount < s.total ? ` · collect ${peso(s.total - s.paidAmount)}` : ''}
        </div>
      </div>
      {action && <button className={`shrink-0 text-xs ${btnPrimary}`} onClick={() => done(s.id)}>Delivered</button>}
    </div>
  )

  return (
    <>
      <PageHeader title="Deliveries" subtitle={`${pending.length} to deliver`} />
      <div className="mx-4 mb-3 flex flex-wrap gap-2">
        <LinkButton to="/sales" secondary>Back to sales</LinkButton>
      </div>
      {error && (
        <div className="mx-4 mb-3">
          <ErrorText error={error} />
        </div>
      )}
      <Card title={`To deliver (${pending.length})`}>
        {pending.length === 0 && <Empty>Nothing waiting. A sale with a delivery appears here until it is marked delivered.</Empty>}
        {pending.map((s) => row(s, true))}
      </Card>
      <Card title={`Delivered (${delivered.length})`}>
        {delivered.length === 0 && <Empty>None yet.</Empty>}
        {[...delivered].reverse().slice(0, 30).map((s) => row(s))}
      </Card>
    </>
  )
}
