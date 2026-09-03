import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PageHeader from '../../components/PageHeader'
import { btnPrimary, btnSecondary, Card, Empty, ErrorText, inputCls } from '../../components/ui'
import { newId } from '../../db/repo'
import { countStock, stockSnapshots } from '../../db/stockRepo'
import { todayISO } from '../../engine/dates'
import { packLabel } from '../../engine/inventory'

// One counting session: type what is on the shelf for any number of products, save
// once; every difference becomes a count move under the same reference.
export default function CountPage() {
  const navigate = useNavigate()
  const snaps = useLiveQuery(() => stockSnapshots(), [])
  const [query, setQuery] = useState('')
  const [counted, setCounted] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ checked: number; changed: number } | null>(null)
  if (!snaps) return null
  const q = query.trim().toLowerCase()
  const shown = snaps.filter((s) => !s.product.extension && (!q || s.product.name.toLowerCase().includes(q) || s.product.brand?.toLowerCase().includes(q)))
  const entries = Object.entries(counted).filter(([, v]) => v.trim() !== '')

  async function save() {
    setError(null)
    const refId = newId()
    const date = todayISO()
    let changed = 0
    try {
      for (const [productId, v] of entries) {
        const r = await countStock({ productId, counted: Number(v), date, refId })
        if (r.delta !== 0) changed++
      }
      setResult({ checked: entries.length, changed })
      setCounted({})
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <>
      <PageHeader title="Cycle count" subtitle="Type what is on the shelf; blank rows are skipped" />
      <div className="mx-4 mb-3 flex gap-2">
        <input className={inputCls} placeholder="Search products" value={query} onChange={(e) => setQuery(e.target.value)} />
        <button className={btnSecondary} onClick={() => navigate('/inventory')}>Back</button>
      </div>
      {result && (
        <Card>
          <p className="text-sm">Counted {result.checked} product{result.checked === 1 ? '' : 's'}: {result.changed} adjusted, {result.checked - result.changed} matched.</p>
        </Card>
      )}
      <Card title={`Products (${shown.length})`}>
        {shown.length === 0 && <Empty>No products.</Empty>}
        {shown.map(({ product, onHand }) => (
          <div key={product.id} className="grid grid-cols-[1fr_7rem] items-center gap-3 border-b border-slate-100 py-2 last:border-0">
            <div className="min-w-0">
              <div className="truncate font-semibold">{product.name}</div>
              <div className="text-xs text-slate-500">book: {packLabel(onHand, product)}</div>
            </div>
            <input
              className={inputCls}
              inputMode="decimal"
              placeholder={product.baseUnit}
              value={counted[product.id] ?? ''}
              onChange={(e) => setCounted((c) => ({ ...c, [product.id]: e.target.value }))}
            />
          </div>
        ))}
      </Card>
      <div className="mx-4 mb-6 flex flex-col gap-2">
        <ErrorText error={error} />
        <button className={btnPrimary} disabled={entries.length === 0} onClick={save}>
          Save count ({entries.length})
        </button>
      </div>
    </>
  )
}
