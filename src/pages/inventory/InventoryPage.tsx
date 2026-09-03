import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../../components/PageHeader'
import GuideLink from '../../components/GuideLink'
import { Badge, btnSecondary, Card, Empty, inputCls, LinkButton, ListItem, peso } from '../../components/ui'
import { stockSnapshots, type StockSnapshot } from '../../db/stockRepo'
import { todayISO } from '../../engine/dates'
import { packLabel, stockAlerts, type StockAlert } from '../../engine/inventory'
import { CATEGORY_DEFAULTS, CATEGORY_ORDER } from '../../knowledge/categories'
import { seedCatalog } from '../../knowledge/catalog'
import { GUIDE_LINKS } from '../../knowledge/guideLinks'
import type { ProductCategory } from '../../types'
import { priceLabel } from './labels'

export default function InventoryPage() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<ProductCategory | ''>('')
  const [showExtension, setShowExtension] = useState(false)
  const snaps = useLiveQuery(() => stockSnapshots(), [])
  if (!snaps) return null

  const q = query.trim().toLowerCase()
  const visible = snaps.filter((s) => showExtension || !s.product.extension)
  const shown = visible.filter(
    ({ product: p }) => (!category || p.category === category) && (!q || p.name.toLowerCase().includes(q) || p.brand?.toLowerCase().includes(q) || p.barcode === q),
  )
  const byCategory = new Map<ProductCategory, StockSnapshot[]>()
  for (const s of shown) byCategory.set(s.product.category, [...(byCategory.get(s.product.category) ?? []), s])
  const alerts = stockAlerts(visible, todayISO())
  const byId = new Map(snaps.map((s) => [s.product.id, s]))

  return (
    <>
      <PageHeader title="Inventory" subtitle="Products, stock and lots" />
      <div className="mx-4 mb-3 flex flex-wrap gap-2">
        <LinkButton to="/inventory/products/new">Add product</LinkButton>
        <LinkButton to="/inventory/count" secondary>Cycle count</LinkButton>
        <button className={`text-sm ${btnSecondary}`} onClick={() => setShowExtension((v) => !v)}>
          {showExtension ? 'Hide extension lines' : 'Show extension lines'}
        </button>
      </div>
      <div className="mx-4 mb-3 flex gap-2">
        <input className={inputCls} placeholder="Search name, brand or barcode" value={query} onChange={(e) => setQuery(e.target.value)} />
        <select className={`${inputCls} w-auto`} value={category} onChange={(e) => setCategory(e.target.value as ProductCategory | '')}>
          <option value="">All</option>
          {CATEGORY_ORDER.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_DEFAULTS[c].label}
            </option>
          ))}
        </select>
      </div>
      {alerts.length > 0 && (
        <Card title={`Alerts (${alerts.length})`}>
          {alerts.map((a, i) => (
            <AlertRow key={i} alert={a} snap={byId.get(a.productId)!} />
          ))}
        </Card>
      )}
      {snaps.length === 0 && (
        <Card>
          <Empty>No products yet.</Empty>
          <div className="flex justify-center">
            <button className={btnSecondary} onClick={() => seedCatalog()}>
              Load the starter catalog (130 SKUs)
            </button>
          </div>
        </Card>
      )}
      {CATEGORY_ORDER.filter((c) => byCategory.has(c)).map((c) => (
        <Card key={c} title={`${CATEGORY_DEFAULTS[c].label} (${byCategory.get(c)!.length})`}>
          {byCategory.get(c)!.map(({ product: p, onHand }) => (
            <ListItem
              key={p.id}
              to={`/inventory/products/${p.id}`}
              title={
                <>
                  {p.name}
                  {p.brand && <span className="font-normal text-slate-500"> · {p.brand}</span>}{' '}
                  {p.extension && <Badge tone="amber">extension</Badge>}
                  {!p.vatExempt && CATEGORY_DEFAULTS[p.category].vatExempt && <Badge tone="slate">VAT</Badge>}
                  {p.reorderLevel > 0 && onHand <= p.reorderLevel && <Badge tone="red">{onHand <= 0 ? 'out' : 'low'}</Badge>}
                </>
              }
              subtitle={priceLabel(p)}
              right={<span className="text-sm font-semibold text-slate-700">{packLabel(onHand, p)}</span>}
            />
          ))}
        </Card>
      ))}
    </>
  )
}

function alertText(a: StockAlert, s: StockSnapshot): string {
  const p = s.product
  switch (a.type) {
    case 'lowStock':
      return a.onHand <= 0 ? `Out of stock: buy ${a.suggestQty} ${p.baseUnit}` : `Low: ${packLabel(a.onHand, p)} left, reorder at ${a.reorderLevel}, buy ${a.suggestQty} ${p.baseUnit}`
    case 'expiring':
      return `Expires in ${a.daysToExpiry} day${a.daysToExpiry === 1 ? '' : 's'} (${a.expiryDate}): ${packLabel(a.qty, p)}`
    case 'expired':
      return `Expired ${a.expiryDate}: ${packLabel(a.qty, p)} still on hand, write it off`
    case 'deadStock':
      return `Dead stock: ${packLabel(a.onHand, p)} worth ${peso(a.value)}, ${a.daysSinceSale === null ? 'never sold' : `no sale for ${a.daysSinceSale} days`}`
    case 'negativeStock':
      return `Negative stock (${a.onHand} ${p.baseUnit}): count it`
    case 'countMismatch':
      return `Count on ${a.date} found ${a.delta > 0 ? '+' : ''}${a.delta} ${p.baseUnit}`
  }
}

const TONE: Record<StockAlert['type'], 'red' | 'amber' | 'slate'> = { lowStock: 'red', expired: 'red', negativeStock: 'red', expiring: 'amber', deadStock: 'slate', countMismatch: 'amber' }

function AlertRow({ alert, snap }: { alert: StockAlert; snap: StockSnapshot }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 py-2 last:border-0">
      <Link to={`/inventory/products/${snap.product.id}`} className="min-w-0 flex-1">
        <div className="font-semibold">{snap.product.name}</div>
        <div className="text-xs text-slate-500">{alertText(alert, snap)}</div>
      </Link>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <Badge tone={TONE[alert.type]}>{alert.type === 'lowStock' ? 'reorder' : alert.type === 'countMismatch' ? 'count' : alert.type.replace('Stock', '')}</Badge>
        <GuideLink topic={GUIDE_LINKS.alert[alert.type]}>Why</GuideLink>
      </div>
    </div>
  )
}
