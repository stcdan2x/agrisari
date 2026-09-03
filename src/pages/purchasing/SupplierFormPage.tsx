import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import PageHeader from '../../components/PageHeader'
import { btnDanger, btnPrimary, btnSecondary, Card, ErrorText, Field, inputCls } from '../../components/ui'
import { db } from '../../db/db'
import { softDelete } from '../../db/repo'
import { createSupplier, getSupplier, SUPPLIER_TERMS, updateSupplier } from '../../db/supplierRepo'
import type { SupplierTerms } from '../../types'
import { TERMS_LABEL } from './labels'

export default function SupplierFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const existing = useLiveQuery(() => (id ? getSupplier(id) : Promise.resolve(undefined)), [id])
  const [name, setName] = useState('')
  const [terms, setTerms] = useState<SupplierTerms>('cod')
  const [leadTimeDays, setLeadTimeDays] = useState('')
  const [contact, setContact] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    if (!existing) return
    setName(existing.name)
    setTerms(existing.terms)
    setLeadTimeDays(existing.leadTimeDays === undefined ? '' : String(existing.leadTimeDays))
    setContact(existing.contact ?? '')
    setNotes(existing.notes ?? '')
  }, [existing])
  if (id && existing === undefined) return null

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    const input = { name, terms, leadTimeDays: leadTimeDays === '' ? undefined : Number(leadTimeDays), contact, notes }
    try {
      const row = id ? await updateSupplier(id, input) : await createSupplier(input)
      navigate(`/purchasing/suppliers/${row.id}`, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }
  const remove = async () => {
    if (!id) return
    await softDelete(db.suppliers, id)
    navigate('/purchasing/suppliers', { replace: true })
  }

  return (
    <form onSubmit={submit}>
      <PageHeader title={id ? 'Edit supplier' : 'New supplier'} />
      <Card>
        <div className="grid gap-3">
          <Field label="Name"><input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} autoFocus /></Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Terms">
              <select className={inputCls} value={terms} onChange={(e) => setTerms(e.target.value as SupplierTerms)}>
                {SUPPLIER_TERMS.map((t) => (
                  <option key={t} value={t}>{TERMS_LABEL[t]}</option>
                ))}
              </select>
            </Field>
            <Field label="Lead time, days" hint="(blank = unknown)"><input className={inputCls} value={leadTimeDays} onChange={(e) => setLeadTimeDays(e.target.value)} inputMode="numeric" /></Field>
          </div>
          <Field label="Contact" hint="(optional)"><input className={inputCls} value={contact} onChange={(e) => setContact(e.target.value)} /></Field>
          <Field label="Notes" hint="(optional)"><input className={inputCls} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
        </div>
        <div className="mt-3">
          <ErrorText error={error} />
        </div>
        <div className="mt-2 flex gap-2">
          <button type="button" className={`text-sm ${btnSecondary}`} onClick={() => navigate(-1)}>Cancel</button>
          {id && <button type="button" className={`text-sm ${btnDanger}`} onClick={remove}>Remove</button>}
          <button type="submit" className={`flex-1 text-sm ${btnPrimary}`}>{id ? 'Save changes' : 'Add supplier'}</button>
        </div>
      </Card>
    </form>
  )
}
