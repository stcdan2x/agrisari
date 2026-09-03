import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate, useParams } from 'react-router-dom'
import PageHeader from '../../components/PageHeader'
import { Badge, btnSecondary, Card, Empty, peso, Row } from '../../components/ui'
import { db } from '../../db/db'
import { getSale } from '../../db/saleRepo'
import { PAYMENT_LABEL } from './labels'

export default function SalePage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const sale = useLiveQuery(() => getSale(id), [id])
  const customer = useLiveQuery(() => (sale?.customerId ? db.customers.get(sale.customerId) : undefined), [sale?.customerId])
  const products = useLiveQuery(() => db.products.toArray(), [])
  if (sale === undefined || !products) return null
  if (!sale) return <Empty>This sale was not found.</Empty>
  const name = new Map(products.map((p) => [p.id, p.name]))
  const owed = sale.total - sale.paidAmount

  return (
    <>
      <PageHeader title={peso(sale.total)} subtitle={[sale.date, customer?.name ?? 'walk-in', PAYMENT_LABEL[sale.paymentMethod]].join(' · ')} />
      <Card title={`Lines (${sale.lines.length})`}>
        {sale.lines.map((l, i) => (
          <div key={i} className="flex justify-between gap-3 border-b border-slate-100 py-2 last:border-0">
            <div>
              <div className="font-semibold">{name.get(l.productId) ?? l.productId}</div>
              <div className="text-xs text-slate-500">
                {l.qty} {l.unit} at {peso(l.unitPrice)} {l.vatExempt === false && <Badge tone="slate">VAT</Badge>}
              </div>
            </div>
            <div className="text-right font-medium">{peso(l.qty * l.unitPrice)}</div>
          </div>
        ))}
      </Card>
      <Card title="Payment">
        {sale.delivery && <Row label="Delivery fee">{peso(sale.delivery.fee)}</Row>}
        <Row label="Total">{peso(sale.total)}</Row>
        <Row label="Paid">{peso(sale.paidAmount)}</Row>
        {owed > 0 && (
          <Row label="Owed">
            <Badge tone="amber">{peso(owed)}</Badge>
          </Row>
        )}
        {sale.delivery && (
          <Row label="Delivery">
            {sale.delivery.address} <Badge tone={sale.delivery.status === 'pending' ? 'brand' : 'green'}>{sale.delivery.status}</Badge>
          </Row>
        )}
        {sale.notes && <Row label="Notes">{sale.notes}</Row>}
      </Card>
      <div className="mx-4 mb-4">
        <button className={`text-sm ${btnSecondary}`} onClick={() => navigate('/sales')}>Back to sales</button>
      </div>
    </>
  )
}
