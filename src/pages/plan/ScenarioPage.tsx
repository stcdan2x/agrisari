import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import PageHeader from '../../components/PageHeader'
import { btnDanger, btnPrimary, btnSecondary, Card, ErrorText, Field, inputCls, peso, Row } from '../../components/ui'
import { loadParameters } from '../../db/parameterRepo'
import { deleteScenario, getScenario, saveScenario, updateScenario } from '../../db/scenarioRepo'
import { monthOf, todayISO } from '../../engine/dates'
import { defaultScenario, project, type ScenarioParams, sensitivity } from '../../engine/projection'
import { CATEGORY_DEFAULTS, CATEGORY_ORDER } from '../../knowledge/categories'
import { SCENARIO_DEFAULTS } from '../../knowledge/parameters'
import { STRATEGIES } from '../../knowledge/strategies'
import type { ProductCategory } from '../../types'
import { Explain } from './Explain'
import { fmtSummary } from './PlanPage'

// A scenario: its params as a form, the projection below it live, the sensitivity set
// beside it; saved to the scenarios table.
export default function ScenarioPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const parameters = useLiveQuery(() => loadParameters(), [])
  const saved = useLiveQuery(() => (id ? getScenario(id) : Promise.resolve(undefined)), [id])
  const [name, setName] = useState('')
  const [strategy, setStrategy] = useState('custom')
  const [params, setParams] = useState<ScenarioParams>(() => defaultScenario(monthOf(todayISO())))
  const [loaded, setLoaded] = useState<string | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  useEffect(() => {
    if (saved && loaded !== saved.id) {
      setName(saved.name)
      setStrategy(saved.strategy)
      setParams(saved.params)
      setLoaded(saved.id)
    }
  }, [saved, loaded])
  if (!parameters || (id && saved === undefined)) return null
  if (id && saved === null) return <Card title="Scenario">Not found.</Card>

  let run: ReturnType<typeof project> | null = null
  let sens: ReturnType<typeof sensitivity> | null = null
  let runError: string | null = null
  try {
    run = project(params, parameters)
    sens = sensitivity(params, parameters)
  } catch (err) {
    runError = err instanceof Error ? err.message : String(err)
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setMessage(null)
    try {
      if (id) {
        await updateScenario(id, { name, strategy, params })
        setMessage('Scenario saved.')
      } else {
        const row = await saveScenario({ name, strategy, params })
        navigate(`/plan/scenarios/${row.id}`, { replace: true })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }
  const remove = async () => {
    if (!id) return
    await deleteScenario(id)
    navigate('/plan/scenarios')
  }
  const set = <K extends keyof ScenarioParams>(key: K, value: ScenarioParams[K]) => setParams({ ...params, [key]: value })
  const num = (v: string) => (v.trim() === '' ? Number.NaN : Number(v))

  return (
    <>
      <PageHeader
        title={id ? name || 'Scenario' : 'New scenario'}
        subtitle="Every figure starts from the research (the row id beside it) and is yours to change; the projection updates as you type"
      />
      <form onSubmit={submit}>
        <Card title="Scenario">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Name">
              <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Feeds only, cash sales" />
            </Field>
            <Field label="Strategy tried" hint="from the catalog, or custom">
              <select className={inputCls} value={strategy} onChange={(e) => setStrategy(e.target.value)}>
                <option value="custom">Custom</option>
                {STRATEGIES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.number}. {s.title}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Start month">
              <input className={inputCls} type="month" value={params.startMonth} onChange={(e) => set('startMonth', e.target.value)} />
            </Field>
            <Field label="Months" hint={`12 to 36 (${SCENARIO_DEFAULTS.months.source})`}>
              <input className={inputCls} inputMode="numeric" value={params.months} onChange={(e) => set('months', num(e.target.value))} />
            </Field>
            <Field label="Sales a month at maturity" hint={`PHP (${SCENARIO_DEFAULTS.steadyStateSales.source}, illustrative)`}>
              <input className={inputCls} inputMode="decimal" value={params.steadyStateSales} onChange={(e) => set('steadyStateSales', num(e.target.value))} />
            </Field>
            <Field label="Ramp" hint="60 to 100 percent over 12 months (FK-113) or 24 (FK-112)">
              <select className={inputCls} value={params.ramp} onChange={(e) => set('ramp', e.target.value as ScenarioParams['ramp'])}>
                <option value="default">First year ramp (12 months)</option>
                <option value="slow">Slow ramp (24 months)</option>
                <option value="none">No ramp</option>
              </select>
            </Field>
            <Field label="Gross margin %" hint={SCENARIO_DEFAULTS.grossMarginPct.source}>
              <input className={inputCls} inputMode="decimal" value={params.grossMarginPct} onChange={(e) => set('grossMarginPct', num(e.target.value))} />
            </Field>
            <Field label="Variable expenses % of sales" hint={SCENARIO_DEFAULTS.variableExpensePct.source}>
              <input
                className={inputCls}
                inputMode="decimal"
                value={params.variableExpensePct}
                onChange={(e) => set('variableExpensePct', num(e.target.value))}
              />
            </Field>
            <Field label="Sales tax % of sales" hint="0 when the tax mode is off (RT-78)">
              <input className={inputCls} inputMode="decimal" value={params.salesTaxPct} onChange={(e) => set('salesTaxPct', num(e.target.value))} />
            </Field>
            <Field label="Credit sales %" hint={SCENARIO_DEFAULTS.creditSalesPct.source}>
              <input className={inputCls} inputMode="decimal" value={params.creditSalesPct} onChange={(e) => set('creditSalesPct', num(e.target.value))} />
            </Field>
            <Field label="Customers pay after (DSO days)" hint={SCENARIO_DEFAULTS.dsoDays.source}>
              <input className={inputCls} inputMode="numeric" value={params.dsoDays} onChange={(e) => set('dsoDays', num(e.target.value))} />
            </Field>
            <Field label="Suppliers paid after (DPO days)" hint={SCENARIO_DEFAULTS.dpoDays.source}>
              <input className={inputCls} inputMode="numeric" value={params.dpoDays} onChange={(e) => set('dpoDays', num(e.target.value))} />
            </Field>
            <Field label="Stock held (DIO days)" hint={SCENARIO_DEFAULTS.dioDays.source}>
              <input className={inputCls} inputMode="numeric" value={params.dioDays} onChange={(e) => set('dioDays', num(e.target.value))} />
            </Field>
            <Field label="Bad debt % of credit sales" hint={SCENARIO_DEFAULTS.badDebtPct.source}>
              <input className={inputCls} inputMode="decimal" value={params.badDebtPct} onChange={(e) => set('badDebtPct', num(e.target.value))} />
            </Field>
            <Field label="Opening capital" hint={`PHP (${SCENARIO_DEFAULTS.openingCapital.source})`}>
              <input className={inputCls} inputMode="decimal" value={params.openingCapital} onChange={(e) => set('openingCapital', num(e.target.value))} />
            </Field>
          </div>
          <MixEditor mix={params.salesMix} onChange={(mix) => set('salesMix', mix)} />
          <ListEditor
            title="Fixed expenses a month"
            rows={params.fixedExpenses}
            columns={[{ key: 'amount', label: 'PHP a month' }]}
            onChange={(rows) => set('fixedExpenses', rows)}
            blank={{ label: '', amount: 0 }}
          />
          <ListEditor
            title="Fixtures and equipment (bought before opening)"
            rows={params.capex}
            columns={[
              { key: 'amount', label: 'PHP' },
              { key: 'lifeYears', label: 'life, years' },
            ]}
            onChange={(rows) => set('capex', rows)}
            blank={{ label: '', amount: 0, lifeYears: 5 }}
          />
          <LoanEditor loan={params.loan} onChange={(loan) => setParams(loan ? { ...params, loan } : (({ loan: _l, ...rest }) => rest)(params))} />
          <div className="mt-3">
            <ErrorText error={error} />
            {message && <p className="text-sm font-medium text-green-700">{message}</p>}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="submit" className={btnPrimary}>
              {id ? 'Save changes' : 'Save scenario'}
            </button>
            <button type="button" className={btnSecondary} onClick={() => navigate('/plan/scenarios')}>
              Back to scenarios
            </button>
            {id && (
              <button type="button" className={btnDanger} onClick={remove}>
                Delete
              </button>
            )}
          </div>
        </Card>
      </form>
      {runError && (
        <Card title="Projection">
          <ErrorText error={runError} />
        </Card>
      )}
      {run && sens && (
        <>
          <Card title="Projection">
            <Row label="Before opening">
              {peso(run.opening.total)}{' '}
              <span className="block text-xs font-normal text-slate-500">
                fixtures {peso(run.opening.capex)} · opening stock {peso(run.opening.openingStock)}
                {run.opening.loan > 0 ? ` · loan ${peso(run.opening.loan)}` : ''}
              </span>
            </Row>
            <Row label="Capital needed at the lowest point">
              {peso(run.summary.capitalPeak)}{' '}
              <span className="block text-xs font-normal text-slate-500">
                {run.summary.capitalPeakMonth === 0 ? 'before opening' : `month ${run.summary.capitalPeakMonth}`}
              </span>
            </Row>
            <Row label="Payback">{fmtSummary(run.summary.paybackMonth, 'month')}</Row>
            <Row label="First break-even month">{fmtSummary(run.summary.breakEvenMonth, 'month')}</Row>
            <Row label="Break-even sales a month">{fmtSummary(run.summary.breakEvenSalesPerMonth, 'peso-inf')}</Row>
            <Row label="Net income over the period">{fmtSummary(run.summary.totalNetIncome, 'peso')}</Row>
            <Row label="Ending cash">{fmtSummary(run.summary.endingCash, 'peso')}</Row>
            <Explain e={run.explanation} />
          </Card>
          <Card title="What if">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="text-left text-xs text-slate-500">
                  <tr>
                    <th className="py-1 pr-3">Case</th>
                    <th className="py-1 pr-3">Capital needed</th>
                    <th className="py-1 pr-3">Payback</th>
                    <th className="py-1 pr-3">Break-even sales</th>
                    <th className="py-1 pr-3">Net income</th>
                  </tr>
                </thead>
                <tbody>
                  {[{ id: 'base', label: 'As entered', summary: run.summary }, ...sens.rows].map((r) => (
                    <tr key={r.id} className="border-t border-slate-100">
                      <td className="py-1 pr-3">{r.label}</td>
                      <td className="py-1 pr-3">{peso(r.summary.capitalPeak)}</td>
                      <td className="py-1 pr-3">{fmtSummary(r.summary.paybackMonth, 'month')}</td>
                      <td className="py-1 pr-3">{fmtSummary(r.summary.breakEvenSalesPerMonth, 'peso-inf')}</td>
                      <td className="py-1 pr-3">{fmtSummary(r.summary.totalNetIncome, 'peso')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Explain e={sens.explanation} />
          </Card>
          <Card title="Month by month">
            <div className="overflow-x-auto">
              <table className="min-w-full whitespace-nowrap text-xs">
                <thead className="text-left text-slate-500">
                  <tr>
                    {['Month', 'Sales', 'Gross profit', 'Expenses', 'Net income', 'Collections', 'Paid to suppliers', 'Net cash', 'Cash', 'Stock'].map((h) => (
                      <th key={h} className="py-1 pr-3">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {run.months.map((m) => (
                    <tr key={m.month} className="border-t border-slate-100">
                      <td className="py-1 pr-3">{m.month}</td>
                      <td className="py-1 pr-3">{peso(m.sales)}</td>
                      <td className="py-1 pr-3">{peso(m.grossProfit)}</td>
                      <td className="py-1 pr-3">{peso(m.variableExpenses + m.fixedExpenses + m.depreciation + m.badDebt + m.tax + m.interest)}</td>
                      <td className={`py-1 pr-3 ${m.netIncome < 0 ? 'text-red-700' : ''}`}>{fmtSummary(m.netIncome, 'peso')}</td>
                      <td className="py-1 pr-3">{peso(m.collections)}</td>
                      <td className="py-1 pr-3">{peso(m.purchasePayments)}</td>
                      <td className={`py-1 pr-3 ${m.netCash < 0 ? 'text-red-700' : ''}`}>{fmtSummary(m.netCash, 'peso')}</td>
                      <td className={`py-1 pr-3 ${m.cash < 0 ? 'text-red-700' : ''}`}>{fmtSummary(m.cash, 'peso')}</td>
                      <td className="py-1 pr-3">{peso(m.inventory)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </>
  )
}

function MixEditor({ mix, onChange }: { mix: ScenarioParams['salesMix']; onChange: (m: ScenarioParams['salesMix']) => void }) {
  const [open, setOpen] = useState(Object.keys(mix).length > 0)
  const total = Object.values(mix).reduce((a, b) => a + (b ?? 0), 0)
  return (
    <div className="mt-3">
      <button type="button" className="text-sm font-semibold text-brand-700" onClick={() => setOpen(!open)}>
        {open ? 'Hide sales mix' : 'Sales mix by category (applies the seasonal calendar)'}
      </button>
      {open && (
        <div className="mt-1 grid gap-1 sm:grid-cols-2">
          {CATEGORY_ORDER.map((c) => (
            <label key={c} className="flex items-center justify-between gap-2 text-sm">
              {CATEGORY_DEFAULTS[c].label}
              <input
                className={`${inputCls} w-24 text-right`}
                inputMode="decimal"
                placeholder="share"
                value={mix[c] ?? ''}
                onChange={(e) => {
                  const v = e.target.value.trim() === '' ? undefined : Number(e.target.value)
                  const next: ScenarioParams['salesMix'] = { ...mix }
                  if (v === undefined) delete next[c as ProductCategory]
                  else next[c as ProductCategory] = v
                  onChange(next)
                }}
              />
            </label>
          ))}
          <p className="text-xs text-slate-500 sm:col-span-2">
            Shares of sales, adding up to at most 1 (for example feed 0.7, fertilizer 0.2, pesticide 0.1). Blank = no seasonality.
          </p>
          {total > 1.0001 && <p className="text-xs text-red-700 sm:col-span-2">The shares add up to {Math.round(total * 100) / 100}.</p>}
        </div>
      )}
    </div>
  )
}

function ListEditor<T extends { label: string }>({
  title,
  rows,
  columns,
  onChange,
  blank,
}: {
  title: string
  rows: T[]
  columns: { key: Exclude<keyof T, 'label'>; label: string }[]
  onChange: (rows: T[]) => void
  blank: T
}) {
  const setRow = (i: number, key: keyof T, value: string | number) => onChange(rows.map((r, j) => (j === i ? { ...r, [key]: value } : r)))
  return (
    <div className="mt-3">
      <p className="text-sm font-medium">{title}</p>
      {rows.map((r, i) => (
        <div key={i} className="mt-1 flex flex-wrap items-center gap-2">
          <div className="w-44">
            <input className={inputCls} placeholder="label" value={r.label} onChange={(e) => setRow(i, 'label', e.target.value)} />
          </div>
          {columns.map((c) => (
            <div key={String(c.key)} className="w-28">
              <input
                className={`${inputCls} text-right`}
                inputMode="decimal"
                placeholder={c.label}
                value={String(r[c.key])}
                onChange={(e) => setRow(i, c.key, e.target.value.trim() === '' ? Number.NaN : Number(e.target.value))}
              />
            </div>
          ))}
          <button type="button" className="text-xs text-red-600" onClick={() => onChange(rows.filter((_, j) => j !== i))}>
            remove
          </button>
        </div>
      ))}
      <button type="button" className="mt-1 text-xs font-semibold text-brand-700" onClick={() => onChange([...rows, { ...blank }])}>
        Add a line
      </button>
    </div>
  )
}

function LoanEditor({ loan, onChange }: { loan: ScenarioParams['loan']; onChange: (loan: ScenarioParams['loan']) => void }) {
  return (
    <div className="mt-3">
      <label className="flex items-center gap-2 text-sm font-medium">
        <input type="checkbox" checked={!!loan} onChange={(e) => onChange(e.target.checked ? { amount: 0, ratePctPerYear: 12, months: 12 } : undefined)} />A
        loan (FK-89: 12 percent a year diminishing is the formal rate; 2 for ANYO, 30 for P3 microfinance)
      </label>
      {loan && (
        <div className="mt-1 grid gap-2 sm:grid-cols-3">
          <Field label="Amount">
            <input className={inputCls} inputMode="decimal" value={loan.amount} onChange={(e) => onChange({ ...loan, amount: Number(e.target.value) })} />
          </Field>
          <Field label="Rate % a year">
            <input
              className={inputCls}
              inputMode="decimal"
              value={loan.ratePctPerYear}
              onChange={(e) => onChange({ ...loan, ratePctPerYear: Number(e.target.value) })}
            />
          </Field>
          <Field label="Term, months">
            <input className={inputCls} inputMode="numeric" value={loan.months} onChange={(e) => onChange({ ...loan, months: Number(e.target.value) })} />
          </Field>
        </div>
      )}
    </div>
  )
}
