import { useLiveQuery } from 'dexie-react-hooks'
import PageHeader from '../../components/PageHeader'
import { Badge, Card, Empty, LinkButton, ListItem, peso } from '../../components/ui'
import { db } from '../../db/db'
import { listSales } from '../../db/saleRepo'
import { PAYMENT_LABEL } from './labels'

export default function SalesPage() {
  const sales = useLiveQuery(() => listSales(), [])
  const customers = useLiveQuery(() => db.customers.toArray(), [])
  if (!sales || !customers) return null
  const name = new Map(customers.map((c) => [c.id, c.name]))

  return (
    <>
      <PageHeader title="Sales" subtitle="Counter sales, credit and deliveries" />
      <div className="mx-4 mb-3 flex flex-wrap gap-2">
        <LinkButton to="/sales/new">New sale</LinkButton>
        <LinkButton to="/sales/customers" secondary>Customers</LinkButton>
        <LinkButton to="/sales/receivables" secondary>Receivables</LinkButton>
        <LinkButton to="/sales/deliveries" secondary>Deliveries</LinkButton>
      </div>
      <Card title={`Sales (${sales.length})`}>
        {sales.length === 0 && <Empty>No sales yet. Tap New sale to ring one up.</Empty>}
        {sales.map((s) => (
          <ListItem
            key={s.id}
            to={`/sales/${s.id}`}
            title={
              <>
                {peso(s.total)} <span className="font-normal text-slate-500">· {s.lines.length} line{s.lines.length === 1 ? '' : 's'}</span>
              </>
            }
            subtitle={[s.date, s.customerId ? name.get(s.customerId) ?? 'customer' : 'walk-in', PAYMENT_LABEL[s.paymentMethod]].join(' · ')}
            right={
              <span className="flex flex-col items-end gap-1">
                {s.paidAmount < s.total && <Badge tone="amber">owes {peso(s.total - s.paidAmount)}</Badge>}
                {s.delivery && <Badge tone={s.delivery.status === 'pending' ? 'brand' : 'green'}>{s.delivery.status === 'pending' ? 'to deliver' : 'delivered'}</Badge>}
              </span>
            }
          />
        ))}
      </Card>
    </>
  )
}
