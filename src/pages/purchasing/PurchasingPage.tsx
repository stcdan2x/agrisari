import { useLiveQuery } from 'dexie-react-hooks'
import PageHeader from '../../components/PageHeader'
import { Badge, Card, Empty, LinkButton, ListItem, peso } from '../../components/ui'
import { payablesSchedule } from '../../db/paymentRepo'
import { listPurchases, purchaseStatus } from '../../db/purchaseRepo'
import { listSuppliers } from '../../db/supplierRepo'
import { todayISO } from '../../engine/dates'
import type { Purchase } from '../../types'
import { STATUS_LABEL, STATUS_TONE } from './labels'

export default function PurchasingPage() {
  const suppliers = useLiveQuery(() => listSuppliers(), [])
  const purchases = useLiveQuery(() => listPurchases(), [])
  const today = todayISO()
  const payables = useLiveQuery(() => payablesSchedule(today), [today])
  if (!suppliers || !purchases || !payables) return null
  const owed = payables.reduce((s, r) => s + r.open, 0)
  const overdue = payables.filter((r) => r.overdue).length
  const openOf = new Map(payables.map((r) => [r.purchaseId, r.open]))
  const supplierName = new Map(suppliers.map((s) => [s.id, s.name]))
  const open = purchases.filter((p) => purchaseStatus(p) !== 'received')

  return (
    <>
      <PageHeader title="Purchasing" subtitle="Orders, receiving, suppliers and payables" />
      <div className="mx-4 mb-3 flex flex-wrap gap-2">
        <LinkButton to="/purchasing/new">New order</LinkButton>
        <LinkButton to="/purchasing/suppliers" secondary>Suppliers ({suppliers.length})</LinkButton>
        <LinkButton to="/purchasing/payables" secondary>Payables{owed > 0 ? ` (${peso(owed)}${overdue > 0 ? `, ${overdue} overdue` : ''})` : ''}</LinkButton>
      </div>
      {open.length > 0 && (
        <Card title={`To receive (${open.length})`}>
          {open.map((p) => (
            <PurchaseRow key={p.id} p={p} supplier={supplierName.get(p.supplierId)} open={openOf.get(p.id) ?? 0} />
          ))}
        </Card>
      )}
      <Card title={`Orders (${purchases.length})`}>
        {purchases.length === 0 && <Empty>No orders yet. Add a supplier, then order from them.</Empty>}
        {purchases.map((p) => (
          <PurchaseRow key={p.id} p={p} supplier={supplierName.get(p.supplierId)} open={openOf.get(p.id) ?? 0} />
        ))}
      </Card>
    </>
  )
}

function PurchaseRow({ p, supplier, open }: { p: Purchase; supplier?: string; open: number }) {
  const status = purchaseStatus(p)
  return (
    <ListItem
      to={`/purchasing/${p.id}`}
      title={
        <>
          {supplier ?? 'Unknown supplier'} <Badge tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Badge>
        </>
      }
      subtitle={`${p.date} · ${p.lines.length} line${p.lines.length === 1 ? '' : 's'}${p.dueDate ? ` · due ${p.dueDate}` : ''}`}
      right={
        <>
          <div className="font-semibold text-slate-700">{peso(p.total)}</div>
          {open > 0 && <Badge tone="amber">owe {peso(open)}</Badge>}
        </>
      }
    />
  )
}
