import { useLiveQuery } from 'dexie-react-hooks'
import { Navigate, useParams, useSearchParams } from 'react-router-dom'
import PageHeader from '../../components/PageHeader'
import GuideLink from '../../components/GuideLink'
import { Badge, Card, inputCls, LinkButton, peso, Row, SubNav } from '../../components/ui'
import { listProducts } from '../../db/productRepo'
import { historyRows, periodRows } from '../../db/reportRepo'
import { stockSnapshots } from '../../db/stockRepo'
import { getStore } from '../../db/storeRepo'
import { CATEGORY_DEFAULTS } from '../../knowledge/categories'
import { monthOf, monthRange, todayISO } from '../../engine/dates'
import { breakEven, cashFlow, incomeStatement, inventoryValuation, marginReport, returns, TAX_RATES, taxEstimate, type CashSection, type TaxEstimate } from '../../engine/finance'
import { GUIDE_LINKS } from '../../knowledge/guideLinks'

const TABS = [
  { key: 'income', label: 'Income' },
  { key: 'cash', label: 'Cash flow' },
  { key: 'margin', label: 'Margin' },
  { key: 'valuation', label: 'Stock value' },
  { key: 'breakeven', label: 'Break-even' },
] as const
type Tab = (typeof TABS)[number]['key']

export default function ReportsPage() {
  const { tab } = useParams<{ tab: string }>()
  const [params, setParams] = useSearchParams()
  const month = params.get('month') || monthOf(todayISO())
  const period = monthRange(month)
  const rows = useLiveQuery(() => periodRows(period), [month])
  const products = useLiveQuery(() => listProducts({ includeExtension: true }), [])
  const snaps = useLiveQuery(() => stockSnapshots(), [])
  const history = useLiveQuery(() => historyRows(period.to), [month])
  const store = useLiveQuery(() => getStore(), [])
  if (!TABS.some((t) => t.key === tab)) return <Navigate to={`/finance/reports/income?month=${month}`} replace />
  if (!rows || !products || !snaps || !history || !store) return null

  return (
    <>
      <PageHeader title="Reports" subtitle={`${period.from} to ${period.to}`} />
      <div className="mx-4 mb-3 flex flex-wrap items-center gap-2">
        <input className={`${inputCls} w-auto`} type="month" value={month} onChange={(e) => setParams(e.target.value ? { month: e.target.value } : {})} />
        <LinkButton to="/finance" secondary>Ledger</LinkButton>
      </div>
      <SubNav items={TABS.map((t) => ({ to: `/finance/reports/${t.key}?month=${month}`, label: t.label }))} />
      {(tab as Tab) === 'income' && (
        <>
          <IncomeView s={incomeStatement(period, rows)} />
          <TaxView t={taxEstimate(store.taxMode, period, { sales: rows.sales, purchases: rows.purchases, products })} />
        </>
      )}
      {(tab as Tab) === 'cash' && <CashView c={cashFlow(period, rows)} />}
      {(tab as Tab) === 'margin' && <MarginView m={marginReport(period, { sales: rows.sales, products })} />}
      {(tab as Tab) === 'valuation' && <ValuationView v={inventoryValuation(snaps)} />}
      {(tab as Tab) === 'breakeven' && <BreakEvenView b={breakEven(incomeStatement(period, rows))} r={returns(period.to, history)} />}
    </>
  )
}

const signed = (n: number) => (n < 0 ? `-${peso(-n)}` : peso(n))

function IncomeView({ s }: { s: ReturnType<typeof incomeStatement> }) {
  return (
    <>
      <Card title="Income statement">
        <p className="mb-2 text-xs text-slate-500">Accrual: sales when made, stock cost when sold. Stock purchases are not an expense here; they become cost of goods sold as the stock sells.</p>
        <Row label="Sales">{peso(s.revenue.sales)}</Row>
        {s.revenue.other > 0 && <Row label="Other revenue">{peso(s.revenue.other)}</Row>}
        <Row label="Revenue">{peso(s.revenue.total)}</Row>
        <Row label="Cost of goods sold">-{peso(s.cogs)}</Row>
        <Row label="Gross profit">
          {signed(s.grossProfit)} <Badge tone={s.grossProfit >= 0 ? 'green' : 'red'}>{s.grossMarginPct}%</Badge>
        </Row>
        {s.writeOffs.total > 0 && (
          <Row label="Write-offs">
            -{peso(s.writeOffs.total)}
            <span className="block text-xs font-normal text-slate-500">expired {peso(s.writeOffs.expired)} · loss {peso(s.writeOffs.loss)}</span>
          </Row>
        )}
        <Row label="Operating expenses">-{peso(s.expenses.total)}</Row>
        <Row label="Net income">
          <span className={s.netIncome >= 0 ? 'text-green-700' : 'text-red-700'}>{signed(s.netIncome)}</span>
        </Row>
      </Card>
      <Card title="Operating expenses by category">
        {s.expenses.rows.length === 0 && <p className="text-sm text-slate-400">No expenses recorded in this month.</p>}
        {s.expenses.rows.map((r) => (
          <Row key={r.category} label={r.category}>{peso(r.amount)}</Row>
        ))}
      </Card>
    </>
  )
}

function CashView({ c }: { c: ReturnType<typeof cashFlow> }) {
  return (
    <>
      <p className="mx-4 mb-3 text-xs text-slate-500">Cash basis: what was paid on the day, at the counter, on the order or as a payment. Expenses count as paid when recorded.</p>
      <Section title="Operating" s={c.operating} />
      <Section title="Owner's capital" s={c.capital} />
      <Section title="Financing" s={c.financing} />
      <Card>
        <Row label="Net cash change">
          <span className={c.net >= 0 ? 'text-green-700' : 'text-red-700'}>{signed(c.net)}</span>
        </Row>
      </Card>
    </>
  )
}

function Section({ title, s }: { title: string; s: CashSection }) {
  return (
    <Card title={title}>
      {s.rows.map((r) => (
        <Row key={r.label} label={r.label}>{signed(r.amount)}</Row>
      ))}
      <Row label={`${title} total`}>
        <span className={s.total >= 0 ? 'text-green-700' : 'text-red-700'}>{signed(s.total)}</span>
      </Row>
    </Card>
  )
}

const catLabel = (c: keyof typeof CATEGORY_DEFAULTS) => CATEGORY_DEFAULTS[c]?.label ?? c

function MarginView({ m }: { m: ReturnType<typeof marginReport> }) {
  const line = (r: { revenue: number; cost: number; margin: number; marginPct: number }) => (
    <>
      {signed(r.margin)} <Badge tone={r.margin >= 0 ? 'green' : 'red'}>{r.marginPct}%</Badge>
      <span className="block text-xs font-normal text-slate-500">
        sold {peso(r.revenue)} · cost {peso(r.cost)}
      </span>
    </>
  )
  return (
    <>
      <p className="mx-4 mb-3 text-xs text-slate-500">From the sale lines of the month at the cost each line carried when sold. Delivery fees are not counted.</p>
      <Card title="All sales">
        <Row label="Gross margin">{line(m.total)}</Row>
      </Card>
      <Card title="By category">
        {m.categories.length === 0 && <p className="text-sm text-slate-400">No sales in this month.</p>}
        {m.categories.map((r) => (
          <Row key={r.key} label={catLabel(r.category)}>{line(r)}</Row>
        ))}
      </Card>
      <Card title="By product">
        {m.products.map((r) => (
          <Row key={r.key} label={r.name}>{line(r)}</Row>
        ))}
      </Card>
    </>
  )
}

function ValuationView({ v }: { v: ReturnType<typeof inventoryValuation> }) {
  return (
    <>
      <p className="mx-4 mb-3 text-xs text-slate-500">Stock on hand right now, valued at what each lot cost, with the weighted average cost beside it. This is today's figure, not the month's.</p>
      <Card title="All stock">
        <Row label="At lot cost">{peso(v.total.atCost)}</Row>
        <Row label="At average cost">{peso(v.total.atAverage)}</Row>
      </Card>
      <Card title="By category">
        {v.categories.length === 0 && <p className="text-sm text-slate-400">No stock on hand.</p>}
        {v.categories.map((c) => (
          <Row key={c.category} label={catLabel(c.category)}>
            {peso(c.atCost)}
            <span className="block text-xs font-normal text-slate-500">average {peso(c.atAverage)}</span>
          </Row>
        ))}
      </Card>
      <Card title="By product">
        {v.rows.map((r) => (
          <Row key={r.productId} label={`${r.name} (${r.onHand} ${r.unit})`}>
            {peso(r.atCost)}
            <span className="block text-xs font-normal text-slate-500">
              average {peso(r.avgCost)} per {r.unit} · {peso(r.atAverage)}
            </span>
          </Row>
        ))}
      </Card>
    </>
  )
}

function BreakEvenView({ b, r }: { b: ReturnType<typeof breakEven>; r: ReturnType<typeof returns> }) {
  const monthsWord = (n: number) => `${n} month${n === 1 ? '' : 's'}`
  return (
    <>
      <Card title="Break-even for the month">
        <p className="mb-2 text-xs text-slate-500">The month's operating expenses are taken as fixed; every peso sold contributes the month's gross margin toward them.</p>
        <Row label="Fixed expenses">{peso(b.fixedExpenses)}</Row>
        <Row label="Gross margin">{b.grossMarginPct}%</Row>
        <Row label="Break-even sales">{b.breakEvenSales === null ? 'needs a month with a positive margin' : peso(b.breakEvenSales)}</Row>
        <Row label="Sales so far">
          {peso(b.sales)} {b.coveragePct !== null && <Badge tone={b.coveragePct >= 100 ? 'green' : 'amber'}>{b.coveragePct}% of break-even</Badge>}
        </Row>
        {b.shortfall !== null && b.shortfall > 0 && <Row label="Still to sell">{peso(b.shortfall)}</Row>}
      </Card>
      <Card title="Return on capital">
        <p className="mb-2 text-xs text-slate-500">Capital entries on the ledger against the net income of every month since the first one, up to the end of the month shown.</p>
        {r.capital === 0 && <p className="text-sm text-slate-400">No capital recorded yet. Add a capital entry on the Finance page when money is put into the store.</p>}
        {r.capital > 0 && (
          <>
            <Row label="Capital in">{peso(r.capital)}</Row>
            <Row label="Net income to date">
              <span className={r.netIncomeToDate >= 0 ? 'text-green-700' : 'text-red-700'}>{signed(r.netIncomeToDate)}</span>
              <span className="block text-xs font-normal text-slate-500">over {monthsWord(r.monthsElapsed)}</span>
            </Row>
            <Row label="ROI">{r.roiPct}%</Row>
            <Row label="Payback">
              {r.paybackMonths !== null
                ? `reached after ${monthsWord(r.paybackMonths)}`
                : r.paybackProjectedMonths !== null
                  ? `about ${monthsWord(r.paybackProjectedMonths)} at the average month so far`
                  : 'not yet: no profit to pay it back from'}
            </Row>
          </>
        )}
      </Card>
      {r.months.length > 0 && (
        <Card title="Month by month">
          {r.months.map((m) => (
            <Row key={m.month} label={m.month}>
              {signed(m.netIncome)}
              <span className="block text-xs font-normal text-slate-500">cumulative {signed(m.cumulative)}</span>
            </Row>
          ))}
        </Card>
      )}
    </>
  )
}

const pctLabel = (rate: number) => `${Math.round(rate * 100)} percent`

function TaxView({ t }: { t: TaxEstimate }) {
  if (t.mode === 'off') return null
  if (t.mode === 'nonVat') {
    return (
      <Card title="Tax estimate (non-VAT)">
        <p className="mb-2 text-xs text-slate-500">
          An estimate for planning, not a return. Percentage tax at {pctLabel(TAX_RATES.percentageTax)} falls on the VATable lines and delivery fees only; feeds, fertilizers and seeds are exempt sales. The {pctLabel(TAX_RATES.eightPercent)} option is on all gross sales above {peso(TAX_RATES.eightPercentExclusion)} a year and replaces both the income tax and the percentage tax; the yearly exclusion is not applied to this month's figure.{' '}
          <GuideLink topic={GUIDE_LINKS.taxCard}>How the tax modes work</GuideLink>
        </p>
        <Row label="Exempt sales">{peso(t.exemptSales)}</Row>
        <Row label="Sales subject to percentage tax">{peso(t.taxableSales)}</Row>
        <Row label={`Percentage tax (${pctLabel(TAX_RATES.percentageTax)})`}>{peso(t.percentageTax)}</Row>
        <Row label={`${pctLabel(TAX_RATES.eightPercent)} option on ${peso(t.grossSales)}`}>{peso(t.eightPercent)}</Row>
      </Card>
    )
  }
  return (
    <Card title="Tax estimate (VAT)">
      <p className="mb-2 text-xs text-slate-500">
        An estimate for planning, not a return. Output VAT is {pctLabel(TAX_RATES.vat)} inside the VATable sales and delivery fees; input VAT is the {pctLabel(TAX_RATES.vat)} inside the VATable purchases of the month. VAT on shared costs such as rent and power is not counted.{' '}
        <GuideLink topic={GUIDE_LINKS.taxCard}>How the tax modes work</GuideLink>
      </p>
      <Row label="Exempt sales">{peso(t.exemptSales)}</Row>
      <Row label="VATable sales">{peso(t.vatableSales)}</Row>
      <Row label="Output VAT">{peso(t.outputVat)}</Row>
      <Row label="VATable purchases">{peso(t.vatablePurchases)}</Row>
      <Row label="Input VAT">{t.inputVat > 0 ? `-${peso(t.inputVat)}` : peso(0)}</Row>
      <Row label={t.vatPayable >= 0 ? 'VAT payable' : 'Excess input VAT'}>{peso(Math.abs(t.vatPayable))}</Row>
    </Card>
  )
}
