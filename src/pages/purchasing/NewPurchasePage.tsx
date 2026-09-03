import { useLiveQuery } from 'dexie-react-hooks'
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import PageHeader from '../../components/PageHeader'
import { btnPrimary, btnSecondary, Card, ErrorText, Field, inputCls, peso } from '../../components/ui'
import { listProducts } from '../../db/productRepo'
import { createPurchase, dueDateFor } from '../../db/purchaseRepo'
import { listSuppliers } from '../../db/supplierRepo'
import { todayISO } from '../../engine/dates'
import { TERMS_LABEL } from './labels'

interface LineDraft {
  productId: string
  qty: string
  unit: string
  unitCost: string
  lotNo: string
  expiryDate: string
}

const blank = (): LineDraft => ({ productId: '', qty: '', unit: '', unitCost: '', lotNo: '', expiryDate: '' })

export default function NewPurchasePage() {
  const navigate = useNavigate()
  const suppliers = useLiveQuery(() => listSuppliers(), [])
  const products = useLiveQuery(() => listProducts(), [])
  const [supplierId, setSupplierId] = useState('')
  const [date, setDate] = useState(todayISO())
  const [lines, setLines] = useState<LineDraft[]>([blank()])
  const [paid, setPaid] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  if (!suppliers || !products) return null
  const supplier = suppliers.find((s) => s.id === supplierId)
  const byId = new Map(products.map((p) => [p.id, p]))
  const unitsOf = (productId: string) => {
    const p = byId.get(productId)
    return p ? [...p.sellUnits.map((u) => u.unit), ...(p.sellUnits.some((u) => u.unit === p.baseUnit) ? [] : [p.baseUnit])] : []
  }
  const total = lines.reduce((s, l) => s + (Number(l.qty) || 0) * (Number(l.unitCost) || 0), 0)
  const setLine = (i: number, patch: Partial<LineDraft>) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)))

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    try {
      const po = await createPurchase({
        date,
        supplierId,
        lines: lines
          .filter((l) => l.productId)
          .map((l) => ({
            productId: l.productId,
            qty: Number(l.qty),
            unit: l.unit || unitsOf(l.productId)[0] || '',
            unitCost: Number(l.unitCost),
            lotNo: l.lotNo,
            ...(l.expiryDate ? { expiryDate: l.expiryDate } : {}),
          })),
        ...(paid !== '' ? { paidAmount: Number(paid) } : {}),
        notes,
      })
      navigate(`/purchasing/${po.id}`, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  return (
    <form onSubmit={submit}>
      <PageHeader title="New order" subtitle="What was ordered, at what cost; receive it when it arrives" />
      <Card>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Supplier">
            <select className={inputCls} value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
              <option value="">Choose a supplier</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} · {TERMS_LABEL[s.terms]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Order date"><input className={inputCls} type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        </div>
        {suppliers.length === 0 && <p className="mt-2 text-sm text-slate-500">No suppliers yet: add one under Suppliers first.</p>}
      </Card>
      <Card title="Lines" action={<button type="button" className={`text-sm ${btnSecondary}`} onClick={() => setLines((ls) => [...ls, blank()])}>Add line</button>}>
        <div className="grid gap-4">
          {lines.map((l, i) => {
            const units = unitsOf(l.productId)
            return (
              <div key={i} className="grid gap-2 border-b border-slate-100 pb-3 last:border-0">
                <Field label={`Product ${i + 1}`}>
                  <select className={inputCls} value={l.productId} onChange={(e) => setLine(i, { productId: e.target.value, unit: '' })}>
                    <option value="">Choose a product</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                        {p.brand ? ` · ${p.brand}` : ''}
                      </option>
                    ))}
                  </select>
                </Field>
                <div className="grid grid-cols-3 gap-2">
                  <Field label="Qty"><input className={inputCls} value={l.qty} onChange={(e) => setLine(i, { qty: e.target.value })} inputMode="decimal" /></Field>
                  <Field label="Unit">
                    <select className={inputCls} value={l.unit || units[0] || ''} onChange={(e) => setLine(i, { unit: e.target.value })} disabled={!l.productId}>
                      {units.map((u) => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Cost ₱ each"><input className={inputCls} value={l.unitCost} onChange={(e) => setLine(i, { unitCost: e.target.value })} inputMode="decimal" /></Field>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Lot no." hint="(optional)"><input className={inputCls} value={l.lotNo} onChange={(e) => setLine(i, { lotNo: e.target.value })} /></Field>
                  <Field label="Expiry" hint="(optional)"><input className={inputCls} type="date" value={l.expiryDate} onChange={(e) => setLine(i, { expiryDate: e.target.value })} /></Field>
                </div>
              </div>
            )
          })}
        </div>
      </Card>
      <Card title="Payment">
        <div className="grid grid-cols-2 gap-2">
          <Field label="Total">
            <div className="py-2.5 text-base font-semibold">{peso(Math.round(total * 100) / 100)}</div>
          </Field>
          <Field label="Paid now ₱" hint={supplier ? `(blank = ${supplier.terms === 'cod' ? 'the total' : 'nothing yet'})` : undefined}>
            <input className={inputCls} value={paid} onChange={(e) => setPaid(e.target.value)} inputMode="decimal" />
          </Field>
        </div>
        {supplier && (
          <p className="mt-2 text-sm text-slate-500">
            {TERMS_LABEL[supplier.terms]} terms{dueDateFor(date, supplier.terms) ? `: due ${dueDateFor(date, supplier.terms)}` : ''}
          </p>
        )}
        <div className="mt-3">
          <Field label="Notes" hint="(optional)"><input className={inputCls} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
        </div>
        <div className="mt-3">
          <ErrorText error={error} />
        </div>
        <div className="mt-2 flex gap-2">
          <button type="button" className={`text-sm ${btnSecondary}`} onClick={() => navigate(-1)}>Cancel</button>
          <button type="submit" className={`flex-1 text-sm ${btnPrimary}`}>Save order</button>
        </div>
      </Card>
    </form>
  )
}
