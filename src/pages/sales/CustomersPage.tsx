import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import PageHeader from '../../components/PageHeader'
import { Badge, Card, Empty, inputCls, LinkButton, ListItem, peso } from '../../components/ui'
import { customerBalance, listCustomers } from '../../db/customerRepo'
import { CUSTOMER_TYPE_LABEL } from './labels'

export default function CustomersPage() {
  const [query, setQuery] = useState('')
  const rows = useLiveQuery(async () => {
    const customers = await listCustomers()
    return Promise.all(customers.map(async (c) => ({ c, balance: await customerBalance(c.id) })))
  }, [])
  if (!rows) return null
  const q = query.trim().toLowerCase()
  const shown = rows.filter(({ c }) => !q || c.name.toLowerCase().includes(q) || c.contact?.toLowerCase().includes(q))

  return (
    <>
      <PageHeader title="Customers" subtitle="Suki, listahan and delivery addresses" />
      <div className="mx-4 mb-3 flex flex-wrap gap-2">
        <LinkButton to="/sales/customers/new">Add customer</LinkButton>
        <LinkButton to="/sales" secondary>Back to sales</LinkButton>
      </div>
      <div className="mx-4 mb-3">
        <input className={inputCls} placeholder="Search name or contact" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>
      <Card title={`Customers (${shown.length})`}>
        {rows.length === 0 && <Empty>No customers yet. Add the suki who buy on credit or take deliveries.</Empty>}
        {shown.map(({ c, balance }) => (
          <ListItem
            key={c.id}
            to={`/sales/customers/${c.id}`}
            title={c.name}
            subtitle={[CUSTOMER_TYPE_LABEL[c.type], c.contact].filter(Boolean).join(' · ')}
            right={balance > 0 ? <Badge tone="amber">owes {peso(balance)}</Badge> : undefined}
          />
        ))}
      </Card>
    </>
  )
}
