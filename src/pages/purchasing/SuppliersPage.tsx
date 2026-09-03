import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import PageHeader from '../../components/PageHeader'
import { Card, Empty, inputCls, LinkButton, ListItem } from '../../components/ui'
import { listSuppliers } from '../../db/supplierRepo'
import { TERMS_LABEL } from './labels'

export default function SuppliersPage() {
  const [query, setQuery] = useState('')
  const suppliers = useLiveQuery(() => listSuppliers(), [])
  if (!suppliers) return null
  const q = query.trim().toLowerCase()
  const shown = suppliers.filter((s) => !q || s.name.toLowerCase().includes(q) || s.contact?.toLowerCase().includes(q))

  return (
    <>
      <PageHeader title="Suppliers" subtitle="Dealers, distributors and their terms" />
      <div className="mx-4 mb-3 flex flex-wrap gap-2">
        <LinkButton to="/purchasing/suppliers/new">Add supplier</LinkButton>
        <LinkButton to="/purchasing" secondary>Back to purchasing</LinkButton>
      </div>
      <div className="mx-4 mb-3">
        <input className={inputCls} placeholder="Search name or contact" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>
      <Card title={`Suppliers (${shown.length})`}>
        {suppliers.length === 0 && <Empty>No suppliers yet. Add the dealers and distributors you buy from.</Empty>}
        {shown.map((s) => (
          <ListItem
            key={s.id}
            to={`/purchasing/suppliers/${s.id}`}
            title={s.name}
            subtitle={[TERMS_LABEL[s.terms], s.leadTimeDays !== undefined ? `${s.leadTimeDays} day lead` : undefined, s.contact].filter(Boolean).join(' · ')}
          />
        ))}
      </Card>
    </>
  )
}
