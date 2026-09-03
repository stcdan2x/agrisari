import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from './db'
import { softDelete } from './repo'
import { createSupplier, getSupplier, listSuppliers, updateSupplier } from './supplierRepo'

beforeEach(async () => {
  await db.suppliers.clear()
})

describe('supplierRepo', () => {
  it('creates, validates, updates and lists suppliers by name', async () => {
    const feeds = await createSupplier({ name: ' San Miguel Feeds dealer ', terms: 'days15', leadTimeDays: 3, contact: '0917 111 2222' })
    expect(feeds).toMatchObject({ name: 'San Miguel Feeds dealer', terms: 'days15', leadTimeDays: 3, contact: '0917 111 2222' })
    const agro = await createSupplier({ name: 'Agro Depot', terms: 'cod' })
    expect(agro.leadTimeDays).toBeUndefined()
    await expect(createSupplier({ name: '  ', terms: 'cod' })).rejects.toThrow(/name/i)
    await expect(createSupplier({ name: 'X', terms: 'weekly' as never })).rejects.toThrow(/terms/i)
    await expect(createSupplier({ name: 'X', terms: 'cod', leadTimeDays: -1 })).rejects.toThrow(/lead time/i)
    await expect(createSupplier({ name: 'X', terms: 'cod', leadTimeDays: 2.5 })).rejects.toThrow(/lead time/i)

    const changed = await updateSupplier(feeds.id, { terms: 'days30', leadTimeDays: 5 })
    expect(changed).toMatchObject({ terms: 'days30', leadTimeDays: 5 })
    expect((await getSupplier(feeds.id))!.terms).toBe('days30')
    await expect(updateSupplier('nope', { terms: 'cod' })).rejects.toThrow(/not found/i)

    expect((await listSuppliers()).map((s) => s.name)).toEqual(['Agro Depot', 'San Miguel Feeds dealer'])
    await softDelete(db.suppliers, agro.id)
    expect(await getSupplier(agro.id)).toBeUndefined()
    expect((await listSuppliers()).map((s) => s.id)).toEqual([feeds.id])
  })
})
