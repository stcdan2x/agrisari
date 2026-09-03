import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import PageHeader from '../../components/PageHeader'
import { btnDanger, btnPrimary, btnSecondary, Card, Check, ErrorText, Field, inputCls } from '../../components/ui'
import { createProduct, updateProduct } from '../../db/productRepo'
import { db } from '../../db/db'
import { softDelete } from '../../db/repo'
import { CATEGORY_DEFAULTS, CATEGORY_ORDER, LICENCE_LABELS } from '../../knowledge/categories'
import type { LicenceClass, ProductCategory } from '../../types'

interface UnitRow {
  unit: string
  factor: string
  price: string
}

const LICENCES = Object.keys(LICENCE_LABELS) as LicenceClass[]

// One form for a new product and for editing one (`/inventory/products/:id/edit`).
// Changing the category on a new product re-applies that category's defaults.
export default function ProductFormPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const existing = useLiveQuery(() => (id ? db.products.get(id) : undefined), [id])
  const [name, setName] = useState('')
  const [brand, setBrand] = useState('')
  const [category, setCategory] = useState<ProductCategory>('feed')
  const [baseUnit, setBaseUnit] = useState('kg')
  const [units, setUnits] = useState<UnitRow[]>([
    { unit: 'sack', factor: '50', price: '' },
    { unit: 'kg', factor: '1', price: '' },
  ])
  const [vatExempt, setVatExempt] = useState(true)
  const [hasExpiry, setHasExpiry] = useState(true)
  const [shelfLife, setShelfLife] = useState('40')
  const [repackable, setRepackable] = useState(true)
  const [licenceClass, setLicenceClass] = useState<LicenceClass>('baiFeed')
  const [coldChain, setColdChain] = useState(false)
  const [barcode, setBarcode] = useState('')
  const [reorderLevel, setReorderLevel] = useState('0')
  const [reorderQty, setReorderQty] = useState('0')
  const [extension, setExtension] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!existing) return
    setName(existing.name)
    setBrand(existing.brand ?? '')
    setCategory(existing.category)
    setBaseUnit(existing.baseUnit)
    setUnits(existing.sellUnits.map((u) => ({ unit: u.unit, factor: String(u.factor), price: u.price ? String(u.price) : '' })))
    setVatExempt(existing.vatExempt)
    setHasExpiry(existing.hasExpiry)
    setShelfLife(existing.lotShelfLifeDays ? String(existing.lotShelfLifeDays) : '')
    setRepackable(existing.repackable)
    setLicenceClass(existing.licenceClass)
    setColdChain(existing.coldChain)
    setBarcode(existing.barcode ?? '')
    setReorderLevel(String(existing.reorderLevel))
    setReorderQty(String(existing.reorderQty))
    setExtension(existing.extension ?? false)
  }, [existing])

  function pickCategory(c: ProductCategory) {
    setCategory(c)
    if (id) return
    const d = CATEGORY_DEFAULTS[c]
    setBaseUnit(d.baseUnit)
    setUnits(d.baseUnit === 'kg' ? [{ unit: 'sack', factor: '50', price: '' }, { unit: 'kg', factor: '1', price: '' }] : [{ unit: d.baseUnit, factor: '1', price: '' }])
    setVatExempt(d.vatExempt)
    setHasExpiry(d.hasExpiry)
    setShelfLife(d.lotShelfLifeDays ? String(d.lotShelfLifeDays) : '')
    setRepackable(d.repackable)
    setLicenceClass(d.licenceClass)
    setColdChain(d.coldChain)
  }

  const setUnit = (i: number, patch: Partial<UnitRow>) => setUnits((rows) => rows.map((r, j) => (j === i ? { ...r, ...patch } : r)))

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      const data = {
        name,
        brand: brand.trim() || undefined,
        category,
        baseUnit,
        sellUnits: units.map((u) => ({ unit: u.unit, factor: Number(u.factor), price: u.price.trim() ? Number(u.price) : 0 })),
        vatExempt,
        hasExpiry,
        lotShelfLifeDays: shelfLife.trim() ? Number(shelfLife) : undefined,
        repackable,
        licenceClass,
        coldChain,
        barcode: barcode.trim() || undefined,
        reorderLevel: Number(reorderLevel),
        reorderQty: Number(reorderQty),
        extension: extension || undefined,
      }
      if (id) await updateProduct(id, data)
      else await createProduct(data)
      navigate(-1)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSaving(false)
    }
  }

  async function remove() {
    if (!id) return
    await softDelete(db.products, id)
    navigate('/inventory', { replace: true })
  }

  const d = CATEGORY_DEFAULTS[category]
  return (
    <form onSubmit={submit}>
      <PageHeader title={id ? 'Edit product' : 'New product'} />
      <Card title="Product">
        <div className="flex flex-col gap-3">
          <Field label="Name">
            <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Expert Hog Grower mash" />
          </Field>
          <Field label="Brand" hint="(optional)">
            <input className={inputCls} value={brand} onChange={(e) => setBrand(e.target.value)} />
          </Field>
          <Field label="Category">
            <select className={inputCls} value={category} onChange={(e) => pickCategory(e.target.value as ProductCategory)}>
              {CATEGORY_ORDER.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_DEFAULTS[c].label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Barcode" hint="(optional)">
            <input className={inputCls} value={barcode} onChange={(e) => setBarcode(e.target.value)} inputMode="numeric" />
          </Field>
        </div>
      </Card>
      <Card title="Units and prices">
        <div className="flex flex-col gap-3">
          <Field label="Base unit" hint="stock is counted in this unit">
            <input className={inputCls} value={baseUnit} onChange={(e) => setBaseUnit(e.target.value)} placeholder="kg, bag, bottle, piece" />
          </Field>
          {units.map((u, i) => (
            <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] items-end gap-2">
              <Field label={i === 0 ? 'Sell unit' : ''}>
                <input className={inputCls} value={u.unit} onChange={(e) => setUnit(i, { unit: e.target.value })} />
              </Field>
              <Field label={i === 0 ? `= ${baseUnit || 'base'}` : ''}>
                <input className={inputCls} value={u.factor} onChange={(e) => setUnit(i, { factor: e.target.value })} inputMode="decimal" />
              </Field>
              <Field label={i === 0 ? 'Price ₱' : ''}>
                <input className={inputCls} value={u.price} onChange={(e) => setUnit(i, { price: e.target.value })} inputMode="decimal" placeholder="0" />
              </Field>
              <button type="button" className={`${btnSecondary} px-3`} onClick={() => setUnits((rows) => rows.filter((_, j) => j !== i))} aria-label="Remove unit">
                ✕
              </button>
            </div>
          ))}
          <button type="button" className={`self-start text-sm ${btnSecondary}`} onClick={() => setUnits((rows) => [...rows, { unit: '', factor: '1', price: '' }])}>
            Add sell unit
          </button>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Reorder level" hint={`in ${baseUnit || 'base units'}`}>
              <input className={inputCls} value={reorderLevel} onChange={(e) => setReorderLevel(e.target.value)} inputMode="decimal" />
            </Field>
            <Field label="Reorder quantity">
              <input className={inputCls} value={reorderQty} onChange={(e) => setReorderQty(e.target.value)} inputMode="decimal" />
            </Field>
          </div>
        </div>
      </Card>
      <Card title="Rules" action={<span className="text-xs text-slate-400">defaults for {d.label.toLowerCase()}</span>}>
        <div className="flex flex-col gap-3">
          <Check label="VAT-exempt" hint="Feeds, ingredients, seeds and fertilizers are exempt; gamefowl and pet feeds are not." checked={vatExempt} onChange={setVatExempt} />
          <Check label="Tracks expiry" hint="Lots carry an expiry date and the earliest expiry is sold first." checked={hasExpiry} onChange={setHasExpiry} />
          {hasExpiry && (
            <Field label="Lot shelf life" hint="days from receipt when the label has no date (optional)">
              <input className={inputCls} value={shelfLife} onChange={(e) => setShelfLife(e.target.value)} inputMode="numeric" />
            </Field>
          )}
          <Check label="Repackable (tingi)" hint="Sold out of the pack by the base unit. Fertilizer needs the FPA dealer-repacker LTO; pesticides never." checked={repackable} onChange={setRepackable} />
          <Field label="Licence needed">
            <select className={inputCls} value={licenceClass} onChange={(e) => setLicenceClass(e.target.value as LicenceClass)}>
              {LICENCES.map((l) => (
                <option key={l} value={l}>
                  {LICENCE_LABELS[l]}
                </option>
              ))}
            </select>
          </Field>
          <Check label="Cold chain" hint="Keep at +2 to +8 C." checked={coldChain} onChange={setColdChain} />
          <Check label="Extension line" hint="Hidden from the list until the outlet licence is in place." checked={extension} onChange={setExtension} />
        </div>
      </Card>
      <div className="mx-4 mb-6 flex flex-col gap-3">
        <ErrorText error={error} />
        <div className="flex gap-3">
          <button type="button" className={btnSecondary} onClick={() => navigate(-1)}>
            Cancel
          </button>
          <button type="submit" className={`flex-1 ${btnPrimary}`} disabled={saving}>
            {id ? 'Save changes' : 'Add product'}
          </button>
        </div>
        {id && (
          <button type="button" className={btnDanger} onClick={remove}>
            Remove product
          </button>
        )}
      </div>
    </form>
  )
}
