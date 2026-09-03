import { useLiveQuery } from 'dexie-react-hooks'
import { Link, useNavigate, useParams } from 'react-router-dom'
import PageHeader from '../../components/PageHeader'
import { Badge, btnSecondary, Card, Empty, LinkButton, ListItem, peso, Row } from '../../components/ui'
import { customerHistory, customerLedger, getCustomer } from '../../db/customerRepo'
import { customerAging } from '../../db/paymentRepo'
import { salesForCustomer } from '../../db/saleRepo'
import { todayISO } from '../../engine/dates'
import { packLabel } from '../../engine/inventory'
import { db } from '../../db/db'
import { CUSTOMER_TYPE_LABEL, PAYMENT_LABEL } from './labels'

export default function CustomerPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const today = todayISO()
  const customer = useLiveQuery(() => getCustomer(id), [id])
  const ledger = useLiveQuery(() => customerLedger(id), [id])
  const aging = useLiveQuery(() => customerAging(id, today), [id, today])
  const history = useLiveQuery(() => customerHistory(id), [id])
  const sales = useLiveQuery(() => salesForCustomer(id), [id])
  const products = useLiveQuery(() => db.products.toArray(), [])
  if (customer === undefined || !ledger || !aging || !history || !sales || !products) return null
  if (!customer) return <Empty>This customer was removed.</Empty>
  const byId = new Map(products.map((p) => [p.id, p]))

  return (
    <>
      <PageHeader title={customer.name} subtitle={[CUSTOMER_TYPE_LABEL[customer.type], customer.contact].filter(Boolean).join(' · ')} />
      <div className="mx-4 mb-3 flex flex-wrap gap-2">
        <LinkButton to="/sales/new">New sale</LinkButton>
        {aging.total > 0 && <LinkButton to="/sales/receivables" secondary>Record payment</LinkButton>}
        <Link to={`/sales/customers/${id}/edit`} className={`text-sm ${btnSecondary}`}>Edit</Link>
      </div>
      <Card title="Listahan">
        <Row label="Balance">{aging.total > 0 ? <Badge tone="amber">{peso(aging.total)}</Badge> : 'nothing owed'}</Row>
        {aging.total > 0 && (
          <Row label="Age">
            <span className="flex flex-wrap justify-end gap-1">
              {aging.current > 0 && <Badge tone="slate">current {peso(aging.current)}</Badge>}
              {aging.d31 > 0 && <Badge tone="amber">31-60 d {peso(aging.d31)}</Badge>}
              {aging.d61 > 0 && <Badge tone="amber">61-90 d {peso(aging.d61)}</Badge>}
              {aging.d90 > 0 && <Badge tone="red">over 90 d {peso(aging.d90)}</Badge>}
            </span>
          </Row>
        )}
        <Row label="Credit limit">{customer.creditLimit ? peso(customer.creditLimit) : 'none set'}</Row>
        {customer.deliveryAddress && <Row label="Delivers to">{customer.deliveryAddress}</Row>}
        {customer.notes && <Row label="Notes">{customer.notes}</Row>}
      </Card>
      <Card title="History">
        <Row label="Sales">{history.sales}{history.firstVisit ? ` since ${history.firstVisit}` : ''}</Row>
        <Row label="Spent">{peso(history.spend)}</Row>
        <Row label="Last visit">{history.lastVisit ?? 'never'}</Row>
        {history.topProducts.slice(0, 5).map((t) => {
          const p = byId.get(t.productId)
          return (
            <Row key={t.productId} label={t.name}>
              {p ? packLabel(t.qty, p) : `${t.qty} ${t.unit}`} · {t.times}x · {peso(t.spend)}
            </Row>
          )
        })}
      </Card>
      <Card title={`Ledger (${ledger.length})`}>
        {ledger.length === 0 && <Empty>No credit yet.</Empty>}
        {[...ledger].reverse().map((e) => (
          <div key={e.refId} className="flex justify-between gap-3 border-b border-slate-100 py-2 last:border-0">
            <span>
              <span className={`font-semibold ${e.kind === 'payment' ? 'text-green-700' : ''}`}>{e.kind === 'charge' ? 'Charged' : 'Paid'} {peso(e.amount)}</span>
              <span className="block text-xs text-slate-500">{e.date}</span>
            </span>
            <span className="text-right font-medium">{peso(e.balance)}</span>
          </div>
        ))}
      </Card>
      <Card title={`Sales (${sales.length})`}>
        {sales.length === 0 && <Empty>No sales yet.</Empty>}
        {sales.map((s) => (
          <ListItem
            key={s.id}
            to={`/sales/${s.id}`}
            title={peso(s.total)}
            subtitle={[s.date, PAYMENT_LABEL[s.paymentMethod], s.lines.map((l) => `${l.qty} ${l.unit} ${byId.get(l.productId)?.name ?? ''}`).join(', ')].join(' · ')}
            right={s.paidAmount < s.total ? <Badge tone="amber">owes {peso(s.total - s.paidAmount)}</Badge> : undefined}
          />
        ))}
      </Card>
      <div className="mx-4 mb-4">
        <button className={`text-sm ${btnSecondary}`} onClick={() => navigate('/sales/customers')}>Back to customers</button>
      </div>
    </>
  )
}
