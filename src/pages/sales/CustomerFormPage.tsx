import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import PageHeader from '../../components/PageHeader'
import { btnDanger, btnPrimary, btnSecondary, Card, ErrorText, Field, inputCls } from '../../components/ui'
import { createCustomer, getCustomer, updateCustomer } from '../../db/customerRepo'
import { db } from '../../db/db'
import { softDelete } from '../../db/repo'
import type { CustomerType } from '../../types'
import { CUSTOMER_TYPE_LABEL } from './labels'

const TYPES = Object.keys(CUSTOMER_TYPE_LABEL) as CustomerType[]

export default function CustomerFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const existing = useLiveQuery(() => (id ? getCustomer(id) : Promise.resolve(undefined)), [id])
  const [name, setName] = useState('')
  const [type, setType] = useState<CustomerType>('backyard')
  const [contact, setContact] = useState('')
  const [creditLimit, setCreditLimit] = useState('')
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    if (!existing) return
    setName(existing.name)
    setType(existing.type)
    setContact(existing.contact ?? '')
    setCreditLimit(existing.creditLimit === undefined ? '' : String(existing.creditLimit))
    setDeliveryAddress(existing.deliveryAddress ?? '')
    setNotes(existing.notes ?? '')
  }, [existing])
  if (id && existing === undefined) return null

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    const input = { name, type, contact, creditLimit: creditLimit === '' ? undefined : Number(creditLimit), deliveryAddress, notes }
    try {
      const row = id ? await updateCustomer(id, input) : await createCustomer(input)
      navigate(`/sales/customers/${row.id}`, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }
  const remove = async () => {
    if (!id) return
    await softDelete(db.customers, id)
    navigate('/sales/customers', { replace: true })
  }

  return (
    <form onSubmit={submit}>
      <PageHeader title={id ? 'Edit customer' : 'New customer'} />
      <Card>
        <div className="grid gap-3">
          <Field label="Name"><input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} autoFocus /></Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Type">
              <select className={inputCls} value={type} onChange={(e) => setType(e.target.value as CustomerType)}>
                {TYPES.map((t) => (
                  <option key={t} value={t}>{CUSTOMER_TYPE_LABEL[t]}</option>
                ))}
              </select>
            </Field>
            <Field label="Contact" hint="(optional)"><input className={inputCls} value={contact} onChange={(e) => setContact(e.target.value)} /></Field>
            <Field label="Credit limit ₱" hint="(blank = no limit)"><input className={inputCls} value={creditLimit} onChange={(e) => setCreditLimit(e.target.value)} inputMode="decimal" /></Field>
          </div>
          <Field label="Delivery address" hint="(optional)"><input className={inputCls} value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)} /></Field>
          <Field label="Notes" hint="(optional)"><input className={inputCls} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
        </div>
        <div className="mt-3">
          <ErrorText error={error} />
        </div>
        <div className="mt-2 flex gap-2">
          <button type="button" className={`text-sm ${btnSecondary}`} onClick={() => navigate(-1)}>Cancel</button>
          {id && <button type="button" className={`text-sm ${btnDanger}`} onClick={remove}>Remove</button>}
          <button type="submit" className={`flex-1 text-sm ${btnPrimary}`}>{id ? 'Save changes' : 'Add customer'}</button>
        </div>
      </Card>
    </form>
  )
}
