import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import PageHeader from '../../components/PageHeader'
import GuideLink from '../../components/GuideLink'
import { Card, Empty, LinkButton, peso, SubNav } from '../../components/ui'
import { buyingInputs, sellingInputs } from '../../db/planRepo'
import { loadParameters } from '../../db/parameterRepo'
import { listScenarios, type SavedScenario } from '../../db/scenarioRepo'
import { type BuyingRecommendation, buyingRecommendations } from '../../engine/buying'
import { todayISO } from '../../engine/dates'
import { project, type Summary } from '../../engine/projection'
import { type SellingRecommendation, sellingRecommendations } from '../../engine/selling'
import { strategyById } from '../../knowledge/strategies'
import { GUIDE_LINKS } from '../../knowledge/guideLinks'
import { Explain, Notes, PriorityBadge } from './Explain'

const TABS = [
  { key: 'buying', label: 'Buying' },
  { key: 'selling', label: 'Selling' },
  { key: 'scenarios', label: 'Scenarios' },
] as const
type Tab = (typeof TABS)[number]['key']

export default function PlanPage() {
  const { tab } = useParams<{ tab: string }>()
  if (!TABS.some((t) => t.key === tab)) return <Navigate to="/plan/buying" replace />
  return (
    <>
      <PageHeader title="Plan" subtitle="What to buy, what to sell and how the store could run, with the reasons and their sources" />
      <SubNav items={TABS.map((t) => ({ to: `/plan/${t.key}`, label: t.label }))} />
      {(tab as Tab) === 'buying' && <BuyingView />}
      {(tab as Tab) === 'selling' && <SellingView />}
      {(tab as Tab) === 'scenarios' && <ScenariosView />}
    </>
  )
}

const BUYING_LABELS: Record<BuyingRecommendation['type'], string> = {
  reorder: 'Reorder now',
  forwardBuy: 'Buy ahead of a price rise',
  stopBuying: 'Stop buying',
  clearance: 'Clear before expiry',
  reprice: 'Reprice below target margin',
}
const SELLING_LABELS: Record<SellingRecommendation['type'], string> = {
  bundle: 'Bundles and starter kits',
  delivery: 'Delivery threshold',
  creditRisk: 'Credit risk',
  topCustomer: 'Top customers to retain',
  seasonal: 'Seasonal push and stock-up',
}

function headline(r: BuyingRecommendation | SellingRecommendation): string {
  switch (r.type) {
    case 'reorder':
      return `${r.productName}: order ${r.packs} (${r.suggestedQty}); ${r.onHand} on hand${r.daysOfCover !== null ? `, ${r.daysOfCover} days of cover` : ''}`
    case 'forwardBuy':
      return `${r.productName}: ${r.packs} extra, price up ${r.monthlyRisePct}% a month, about ${peso(r.estimatedGain)} gained`
    case 'stopBuying':
      return `${r.productName}: ${r.onHand} worth ${peso(r.value)}, idle ${r.daysSinceSale ?? r.daysSinceReceipt} days`
    case 'clearance':
      return `${r.productName}: ${r.excess} to clear at ${peso(r.suggestedPrice)} before ${r.expiryDate}`
    case 'reprice':
      return `${r.productName} per ${r.unit}: ${peso(r.currentPrice)} to ${peso(r.suggestedPrice)} (${r.marginPct}% against ${r.targetPct}%)`
    case 'bundle':
      return r.kind === 'coPurchase' ? `${r.title}: bought together ${r.timesTogether} times` : `${r.title}: programme pack`
    case 'delivery':
      return `Free delivery from ${peso(r.threshold)}; charge ${peso(r.suggestedFee)} below it`
    case 'creditRisk':
      return `${r.customerName}: ${[r.overdue > 0 ? `${peso(r.overdue)} past terms` : '', r.overLimit > 0 ? `${peso(r.overLimit)} over the limit` : ''].filter(Boolean).join(', ')}`
    case 'topCustomer':
      return `#${r.rank} ${r.customerName}: ${peso(r.revenue)} (${r.sharePct}%), last bought ${r.daysSinceLast === 0 ? 'today' : `${r.daysSinceLast} days ago`}`
    case 'seasonal':
      return `${r.name}: ${r.products.length > 0 ? r.products.map((p) => p.name).join(', ') : `${r.unstocked.length} catalog lines, none stocked`}`
  }
}

function RecList<T extends BuyingRecommendation | SellingRecommendation>({
  recs,
  labels,
  links,
}: {
  recs: T[]
  labels: Record<T['type'], string>
  links: Record<T['type'], string>
}) {
  const groups = new Map<T['type'], T[]>()
  for (const r of recs) groups.set(r.type, [...(groups.get(r.type) ?? []), r])
  if (recs.length === 0) return <Empty>Nothing to recommend yet: the rules need sales, purchases and stock to read.</Empty>
  return (
    <>
      {[...groups.entries()].map(([type, rs]) => (
        <Card key={type} title={labels[type]} action={<GuideLink topic={links[type]}>Why</GuideLink>}>
          <ul className="divide-y divide-slate-100">
            {rs.map((r, i) => (
              <li key={i} className="py-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium">{headline(r)}</p>
                  <PriorityBadge p={r.priority} />
                </div>
                <Explain e={r.explanation} />
              </li>
            ))}
          </ul>
        </Card>
      ))}
    </>
  )
}

function BuyingView() {
  const today = todayISO()
  const input = useLiveQuery(() => buyingInputs(today), [today])
  if (!input) return null
  const report = buyingRecommendations(input)
  return (
    <>
      <RecList recs={report.recommendations} labels={BUYING_LABELS} links={GUIDE_LINKS.buyingRule} />
      <Notes notes={report.notes} />
    </>
  )
}

function SellingView() {
  const today = todayISO()
  const input = useLiveQuery(() => sellingInputs(today), [today])
  if (!input) return null
  const report = sellingRecommendations(input)
  return (
    <>
      <RecList recs={report.recommendations} labels={SELLING_LABELS} links={GUIDE_LINKS.sellingRule} />
      <Notes notes={report.notes} />
    </>
  )
}

const SUMMARY_ROWS: { key: keyof Summary; label: string; kind: 'peso' | 'month' | 'peso-inf' }[] = [
  { key: 'capitalPeak', label: 'Capital needed at the lowest point', kind: 'peso' },
  { key: 'paybackMonth', label: 'Payback month', kind: 'month' },
  { key: 'breakEvenMonth', label: 'First break-even month', kind: 'month' },
  { key: 'breakEvenSalesPerMonth', label: 'Break-even sales a month', kind: 'peso-inf' },
  { key: 'totalSales', label: 'Sales over the period', kind: 'peso' },
  { key: 'totalNetIncome', label: 'Net income over the period', kind: 'peso' },
  { key: 'endingCash', label: 'Ending cash', kind: 'peso' },
  { key: 'endingInventory', label: 'Ending stock at cost', kind: 'peso' },
]

export function fmtSummary(v: number | null, kind: 'peso' | 'month' | 'peso-inf'): string {
  if (v === null) return 'not within the period'
  if (kind === 'month') return `month ${v}`
  if (!Number.isFinite(v)) return 'beyond the margin'
  return v < 0 ? `-${peso(-v)}` : peso(v)
}

function ScenariosView() {
  const scenarios = useLiveQuery(() => listScenarios(), [])
  const parameters = useLiveQuery(() => loadParameters(), [])
  const [picked, setPicked] = useState<string[]>([])
  if (!scenarios || !parameters) return null
  const runs = new Map<string, Summary>()
  for (const s of scenarios) {
    try {
      runs.set(s.id, project(s.params, parameters).summary)
    } catch {
      // a scenario saved by an older build that no longer validates shows without figures
    }
  }
  const compared = scenarios.filter((s) => picked.includes(s.id) && runs.has(s.id))
  const toggle = (id: string) => setPicked(picked.includes(id) ? picked.filter((p) => p !== id) : [...picked.slice(-2), id])
  return (
    <>
      <Card title="Saved scenarios" action={<LinkButton to="/plan/scenarios/new">New scenario</LinkButton>}>
        {scenarios.length === 0 && <p className="text-sm text-slate-400">No scenario yet. Start one from the research defaults and change what you know.</p>}
        <ul className="divide-y divide-slate-100">
          {scenarios.map((s) => (
            <ScenarioRow key={s.id} s={s} summary={runs.get(s.id)} picked={picked.includes(s.id)} onPick={() => toggle(s.id)} />
          ))}
        </ul>
        {scenarios.length > 1 && <p className="mt-2 text-xs text-slate-500">Tick two or three scenarios to compare them side by side.</p>}
      </Card>
      {compared.length > 1 && (
        <Card title="Side by side">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-xs text-slate-500">
                <tr>
                  <th className="py-1 pr-3"></th>
                  {compared.map((s) => (
                    <th key={s.id} className="py-1 pr-3">
                      {s.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {SUMMARY_ROWS.map((row) => (
                  <tr key={row.key} className="border-t border-slate-100">
                    <td className="py-1 pr-3 text-slate-500">{row.label}</td>
                    {compared.map((s) => (
                      <td key={s.id} className="py-1 pr-3 font-medium">
                        {fmtSummary(runs.get(s.id)![row.key], row.kind)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </>
  )
}

function ScenarioRow({ s, summary, picked, onPick }: { s: SavedScenario; summary?: Summary; picked: boolean; onPick: () => void }) {
  const strategy = strategyById(s.strategy)
  return (
    <li className="flex items-center gap-3 py-2">
      <input type="checkbox" checked={picked} onChange={onPick} aria-label={`Compare ${s.name}`} />
      <div className="min-w-0 flex-1">
        <Link to={`/plan/scenarios/${s.id}`} className="font-medium text-brand-700">
          {s.name}
        </Link>
        <p className="text-xs text-slate-500">
          {strategy ? strategy.title : 'Custom'} · {s.params.months} months from {s.params.startMonth} · {peso(s.params.steadyStateSales)} a month at{' '}
          {s.params.grossMarginPct}%
        </p>
        {summary && (
          <p className="text-xs text-slate-500">
            capital {peso(summary.capitalPeak)} · payback {summary.paybackMonth === null ? 'not within the period' : `month ${summary.paybackMonth}`} · net
            income {fmtSummary(summary.totalNetIncome, 'peso')}
          </p>
        )}
      </div>
    </li>
  )
}
