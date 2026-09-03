import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Card, Empty, inputCls, peso } from '../components/ui'
import { dashboardCharts, priceTrend, productsWithPrices } from '../db/dashboardRepo'
import type { Period } from '../engine/finance'
import type { ISODate } from '../types'

// The five F1 charts (step 8.2) over the series from dashboardRepo; layout only, the arithmetic
// is in src/engine/series.ts. Loaded lazily so the chart bundle is not on the first paint.
const COLOR = { sales: '#16a34a', cogs: '#94a3b8', margin: '#0ea5e9', line: '#16a34a' }
const MONTH = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const monthTick = (m: string) => MONTH[Number(m.slice(5, 7)) - 1]
const short = (n: number) => (Math.abs(n) >= 1000 ? `${Math.round(n / 100) / 10}k` : String(n))
const money = (v: unknown) => peso(Number(v))

export default function DashboardCharts({ period, asOf }: { period: Period; asOf: ISODate }) {
  const charts = useLiveQuery(() => dashboardCharts(period, asOf), [period.from, period.to, asOf])
  const products = useLiveQuery(() => productsWithPrices(), [])
  if (!charts || !products) return null
  const hasMonthly = charts.monthly.some((m) => m.sales > 0 || m.cogs > 0)
  const hasAging = charts.aging.some((a) => a.amount > 0)
  const hasValue = charts.inventoryValue.some((v) => v.value !== 0)

  return (
    <>
      <Card title="Sales, cost and margin by month">
        {!hasMonthly && <Empty>No sales in these months yet.</Empty>}
        {hasMonthly && (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={charts.monthly} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" tickFormatter={monthTick} fontSize={11} />
              <YAxis tickFormatter={short} fontSize={11} width={40} />
              <Tooltip formatter={money} labelFormatter={(m) => String(m)} />
              <Bar dataKey="sales" name="Sales" fill={COLOR.sales} />
              <Bar dataKey="cogs" name="Cost of goods" fill={COLOR.cogs} />
              <Bar dataKey="margin" name="Margin" fill={COLOR.margin} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>
      <Card title="Sales by category">
        {charts.categories.length === 0 && <Empty>No sales this period yet.</Empty>}
        {charts.categories.length > 0 && (
          <ResponsiveContainer width="100%" height={40 + charts.categories.length * 32}>
            <BarChart data={charts.categories} layout="vertical" margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <XAxis type="number" tickFormatter={short} fontSize={11} />
              <YAxis type="category" dataKey="label" width={90} fontSize={11} />
              <Tooltip formatter={money} />
              <Bar dataKey="revenue" name="Sales" fill={COLOR.sales} />
              <Bar dataKey="margin" name="Margin" fill={COLOR.margin} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>
      <Card title="Receivables by age">
        {!hasAging && <Empty>Nothing owed to the store.</Empty>}
        {hasAging && (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={charts.aging} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <XAxis dataKey="label" fontSize={10} interval={0} />
              <YAxis tickFormatter={short} fontSize={11} width={40} />
              <Tooltip formatter={money} />
              <Bar dataKey="amount" name="Owed" fill={COLOR.margin} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>
      <Card title="Stock value by month">
        {!hasValue && <Empty>No stock received yet.</Empty>}
        {hasValue && (
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={charts.inventoryValue} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" tickFormatter={monthTick} fontSize={11} />
              <YAxis tickFormatter={short} fontSize={11} width={40} />
              <Tooltip formatter={money} labelFormatter={(m) => String(m)} />
              <Line type="monotone" dataKey="value" name="At average cost" stroke={COLOR.line} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
        <p className="mt-1 text-xs text-slate-500">Month-end value at the weighted average cost, the way the income statement draws it down.</p>
      </Card>
      <PriceTrend products={products} />
    </>
  )
}

function PriceTrend({ products }: { products: { id: string; name: string; baseUnit: string }[] }) {
  const [productId, setProductId] = useState(products[0]?.id ?? '')
  const points = useLiveQuery(() => (productId ? priceTrend(productId) : Promise.resolve([])), [productId])
  const product = products.find((p) => p.id === productId)
  return (
    <Card
      title="Supplier price trend"
      action={
        <select className={`${inputCls} w-auto py-1.5 text-sm`} value={productId} onChange={(e) => setProductId(e.target.value)}>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      }
    >
      {products.length === 0 && <Empty>No supplier price logged yet: receipts and typed quotes appear here.</Empty>}
      {product && points && points.length === 0 && <Empty>No supplier price logged for {product.name} yet.</Empty>}
      {product && points && points.length > 0 && (
        <>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={points} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" tickFormatter={(d: string) => d.slice(5)} fontSize={11} />
              <YAxis tickFormatter={short} fontSize={11} width={40} domain={['auto', 'auto']} />
              <Tooltip formatter={money} />
              <Line type="monotone" dataKey="value" name={`Per ${product.baseUnit}`} stroke={COLOR.line} />
            </LineChart>
          </ResponsiveContainer>
          <p className="mt-1 text-xs text-slate-500">
            What suppliers charged per {product.baseUnit}: every receipt and every typed quote, {points.length} {points.length === 1 ? 'entry' : 'entries'}.
          </p>
        </>
      )}
    </Card>
  )
}
