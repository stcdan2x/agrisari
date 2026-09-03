import { useLiveQuery } from 'dexie-react-hooks'
import { lazy, Suspense, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import { btnSecondary, Card, Empty, inputCls, peso } from '../components/ui'
import { dashboardFigures, type DashboardFigures } from '../db/dashboardRepo'
import { monthOf, todayISO } from '../engine/dates'
import type { StockAlert } from '../engine/inventory'
import { PERIOD_KINDS, periodLabel, periodParams, resolvePeriod, shiftAnchor, type ResolvedPeriod } from '../engine/periods'

const Charts = lazy(() => import('./DashboardCharts'))

const signed = (n: number) => (n < 0 ? `-${peso(-n)}` : peso(n))
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

export default function DashboardPage() {
  const today = todayISO()
  const [params] = useSearchParams()
  const resolved = resolvePeriod(params, today)
  const { period } = resolved
  const month = monthOf(period.to) // the report pages take a month
  const label = periodLabel(resolved.kind, period)
  const f = useLiveQuery(() => dashboardFigures(period, today), [period.from, period.to, today])
  if (!f) return null

  return (
    <>
      <PageHeader title="Dashboard" subtitle={`${label.long}, as of ${today}`} />
      <PeriodSwitcher resolved={resolved} today={today} />
      <Banners f={f} />
      <div className="mx-4 mb-4 grid grid-cols-2 gap-3 md:grid-cols-3">
        <Tile to="/sales" label="Sales today" value={peso(f.sales.today)} />
        <Tile to="/sales" label={`Sales ${label.short}`} value={peso(f.sales.period)} note={plural(f.sales.count, 'sale')} />
        <Tile
          to={`/finance/reports/income?month=${month}`}
          label={`Gross margin ${label.short}`}
          value={signed(f.margin.grossProfit)}
          note={`${f.margin.grossMarginPct}% of sales`}
          tone={f.margin.grossProfit < 0 ? 'red' : undefined}
        />
        <Tile
          to={`/finance/reports/cash?month=${month}`}
          label="Cash on hand"
          value={signed(f.cash.onHand)}
          note={`${f.cash.periodNet < 0 ? '' : '+'}${signed(f.cash.periodNet)} in ${label.short}`}
          tone={f.cash.onHand < 0 ? 'red' : undefined}
        />
        <Tile
          to="/sales/receivables"
          label="Receivables"
          value={peso(f.receivables.outstanding)}
          note={f.receivables.overdue > 0 ? `${peso(f.receivables.overdue)} past 30 days` : 'nothing past 30 days'}
          tone={f.receivables.overdue > 0 ? 'red' : undefined}
        />
        <Tile
          to="/purchasing/payables"
          label="Payables due this week"
          value={peso(f.payables.dueThisWeek)}
          note={f.payables.overdue > 0 ? `${peso(f.payables.overdue)} overdue` : `${peso(f.payables.open)} open`}
          tone={f.payables.overdue > 0 ? 'red' : undefined}
        />
        <Tile to="/sales/deliveries" label="Deliveries pending" value={String(f.deliveries.pending)} tone={f.deliveries.pending > 0 ? 'amber' : undefined} />
        <Tile
          to="/inventory"
          label="Low stock"
          value={String(f.stock.lowStock)}
          note={plural(f.stock.lowStock, 'product')}
          tone={f.stock.lowStock > 0 ? 'amber' : undefined}
        />
        <Tile
          to="/inventory"
          label="Expiring within 30 days"
          value={String(f.stock.expiring30)}
          note={f.stock.expired > 0 ? `${plural(f.stock.expired, 'lot')} expired` : plural(f.stock.expiring30, 'lot')}
          tone={f.stock.expired > 0 ? 'red' : f.stock.expiring30 > 0 ? 'amber' : undefined}
        />
        <Tile to="/inventory" label="Dead stock value" value={peso(f.stock.deadStockValue)} tone={f.stock.deadStockValue > 0 ? 'amber' : undefined} />
        <Tile to={`/finance/reports/valuation?month=${month}`} label="Stock value at cost" value={peso(f.stock.valueAtCost)} />
      </div>
      <Card
        title={`Top sellers ${label.short}`}
        action={
          <Link className="text-sm font-medium text-brand-600" to={`/finance/reports/margin?month=${month}`}>
            Margin report
          </Link>
        }
      >
        {f.topSellers.length === 0 && <Empty>No sales in this period yet.</Empty>}
        {f.topSellers.map((p, i) => (
          <Link
            key={p.productId}
            to={`/inventory/products/${p.productId}`}
            className="flex items-center justify-between gap-3 border-b border-slate-100 py-2 last:border-0"
          >
            <span className="min-w-0 truncate font-medium">
              <span className="mr-2 text-slate-400">{i + 1}</span>
              {p.name}
            </span>
            <span className="shrink-0 text-right">
              <span className="font-semibold">{peso(p.revenue)}</span>
              <span className="ml-2 text-xs text-slate-500">{signed(p.margin)} margin</span>
            </span>
          </Link>
        ))}
      </Card>
      <Suspense fallback={null}>
        <Charts period={period} asOf={today} />
      </Suspense>
    </>
  )
}

// The period switcher (P8 design decision 3): the kind, the anchor or the custom bounds live in
// the query so the tiles and the charts read one period and a link reproduces it.
function PeriodSwitcher({ resolved, today }: { resolved: ResolvedPeriod; today: string }) {
  const [, setParams] = useSearchParams()
  const { kind, anchor, period } = resolved
  const go = (q: string) => setParams(new URLSearchParams(q))
  const arrow = 'rounded-lg px-2 py-1 text-sm font-semibold text-slate-600 ring-1 ring-slate-300'
  return (
    <div className="mx-4 mb-3">
      <nav className="mb-2 flex gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1">
        {PERIOD_KINDS.map((k) => (
          <button
            key={k.kind}
            className={`flex-1 whitespace-nowrap rounded-lg px-1 py-1.5 text-xs font-medium sm:px-3 sm:text-sm ${k.kind === kind ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500'}`}
            onClick={() => go(k.kind === 'custom' ? periodParams('custom', today, period) : periodParams(k.kind, k.kind === kind ? anchor : today))}
          >
            {k.label}
          </button>
        ))}
      </nav>
      {kind !== 'custom' && (
        <div className="flex items-center gap-2">
          <button className={arrow} aria-label="Previous period" onClick={() => go(periodParams(kind, shiftAnchor(kind, anchor, -1)))}>
            &lsaquo;
          </button>
          <button className={arrow} aria-label="Next period" onClick={() => go(periodParams(kind, shiftAnchor(kind, anchor, 1)))}>
            &rsaquo;
          </button>
          <span className="text-sm text-slate-600">
            {period.from} to {period.to}
          </span>
          {!(period.from <= today && today <= period.to) && (
            <button className={`ml-auto text-xs ${btnSecondary} px-3 py-1`} onClick={() => go(periodParams(kind, today))}>
              Today
            </button>
          )}
        </div>
      )}
      {kind === 'custom' && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <input
            className={`${inputCls} w-auto py-1.5`}
            type="date"
            value={period.from}
            onChange={(e) => e.target.value && go(periodParams('custom', today, { from: e.target.value, to: period.to }))}
          />
          <span className="text-slate-500">to</span>
          <input
            className={`${inputCls} w-auto py-1.5`}
            type="date"
            value={period.to}
            onChange={(e) => e.target.value && go(periodParams('custom', today, { from: period.from, to: e.target.value }))}
          />
        </div>
      )}
    </div>
  )
}

type TileTone = 'red' | 'amber'
const TILE_TONE: Record<TileTone, string> = { red: 'ring-red-200 bg-red-50', amber: 'ring-amber-200 bg-amber-50' }

// A tile is a link to the page that explains its figure (P8 design decision 2).
function Tile({ to, label, value, note, tone }: { to: string; label: string; value: string; note?: string; tone?: TileTone }) {
  return (
    <Link to={to} className={`block min-w-0 rounded-xl p-3 shadow-sm ring-1 ${tone ? TILE_TONE[tone] : 'bg-white ring-slate-200'}`}>
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className="mt-1 truncate text-lg font-bold">{value}</div>
      {note && <div className="truncate text-xs text-slate-500">{note}</div>}
    </Link>
  )
}

const ALERT_LABEL: Record<StockAlert['type'], string> = {
  lowStock: 'low stock',
  expiring: 'expiring',
  expired: 'expired',
  deadStock: 'dead stock',
  negativeStock: 'negative stock',
  countMismatch: 'count mismatch',
}

// The two banners: the P3 stock alerts and the receivables past 30 days, each linking to its page.
function Banners({ f }: { f: DashboardFigures }) {
  const byType = new Map<StockAlert['type'], number>()
  for (const a of f.alerts) byType.set(a.type, (byType.get(a.type) ?? 0) + 1)
  const stockNote = [...byType].map(([type, n]) => `${n} ${ALERT_LABEL[type]}`).join(', ')
  return (
    <>
      {f.alerts.length > 0 && (
        <Banner to="/inventory" tone={byType.has('expired') || byType.has('negativeStock') ? 'red' : 'amber'}>
          <b>{plural(f.alerts.length, 'stock alert')}</b>: {stockNote}
        </Banner>
      )}
      {f.receivables.overdue > 0 && (
        <Banner to="/sales/receivables" tone="red">
          <b>{peso(f.receivables.overdue)} past 30 days</b> from {plural(f.receivables.customersOverdue, 'customer')}
        </Banner>
      )}
    </>
  )
}

function Banner({ to, tone, children }: { to: string; tone: TileTone; children: ReactNode }) {
  return (
    <Link to={to} className={`mx-4 mb-3 block rounded-xl px-4 py-2.5 text-sm ring-1 ${TILE_TONE[tone]}`}>
      {children}
    </Link>
  )
}
