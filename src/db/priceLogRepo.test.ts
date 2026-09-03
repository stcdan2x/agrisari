import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from './db'
import { latestPrices, logReceiptPrice, perBaseUnit, priceHistory, recordPrice, supplierPrices } from './priceLogRepo'
import { createProduct } from './productRepo'
import { createSupplier } from './supplierRepo'

const grower = () =>
  createProduct({ name: 'Expert Hog Grower mash', category: 'feed', baseUnit: 'kg', sellUnits: [{ unit: 'sack', factor: 50, price: 1750 }, { unit: 'kg', factor: 1, price: 38 }] })

beforeEach(async () => {
  await Promise.all([db.products.clear(), db.suppliers.clear(), db.priceLog.clear()])
})

describe('priceLogRepo', () => {
  it('records supplier, competitor and own prices with validation', async () => {
    const p = await grower()
    const s = await createSupplier({ name: 'SMC dealer', terms: 'days15' })
    const quote = await recordPrice({ date: '2026-09-01', productId: p.id, kind: 'supplierPrice', value: 1700, unit: 'sack', source: 'heard', supplierId: s.id, note: 'quoted by text' })
    expect(quote).toMatchObject({ kind: 'supplierPrice', value: 1700, unit: 'sack', supplierId: s.id, note: 'quoted by text' })
    await recordPrice({ date: '2026-09-02', productId: p.id, kind: 'competitorPrice', value: 1800, unit: 'sack', source: 'heard', note: 'Agrivet across the road' })
    await recordPrice({ date: '2026-09-02', productId: p.id, kind: 'ownPrice', value: 38, unit: 'kg', source: 'own' })

    await expect(recordPrice({ date: 'Sept 1', productId: p.id, kind: 'ownPrice', value: 38, unit: 'kg', source: 'own' })).rejects.toThrow(/date/i)
    await expect(recordPrice({ date: '2026-09-01', productId: 'nope', kind: 'ownPrice', value: 38, unit: 'kg', source: 'own' })).rejects.toThrow(/product/i)
    await expect(recordPrice({ date: '2026-09-01', productId: p.id, kind: 'ownPrice', value: 0, unit: 'kg', source: 'own' })).rejects.toThrow(/price/i)
    await expect(recordPrice({ date: '2026-09-01', productId: p.id, kind: 'ownPrice', value: 38, unit: 'pail', source: 'own' })).rejects.toThrow(/pail/)
    await expect(recordPrice({ date: '2026-09-01', productId: p.id, kind: 'supplierPrice', value: 1700, unit: 'sack', source: 'heard' })).rejects.toThrow(/supplier/i)
    await expect(recordPrice({ date: '2026-09-01', productId: p.id, kind: 'supplierPrice', value: 1700, unit: 'sack', source: 'heard', supplierId: 'nope' })).rejects.toThrow(/supplier/i)
    expect(await db.priceLog.count()).toBe(3)
  })

  // Per base unit: 1700 per 50 kg sack is 34 per kg; a kg entry stays as typed.
  it('lists the history newest first and the latest per kind and supplier, converted per base unit', async () => {
    const p = await grower()
    const a = await createSupplier({ name: 'SMC dealer', terms: 'days15' })
    const b = await createSupplier({ name: 'Agro Depot', terms: 'cod' })
    await recordPrice({ date: '2026-08-20', productId: p.id, kind: 'supplierPrice', value: 1650, unit: 'sack', source: 'own', supplierId: a.id })
    const a2 = await recordPrice({ date: '2026-09-01', productId: p.id, kind: 'supplierPrice', value: 1700, unit: 'sack', source: 'heard', supplierId: a.id })
    const b1 = await recordPrice({ date: '2026-08-28', productId: p.id, kind: 'supplierPrice', value: 33.5, unit: 'kg', source: 'heard', supplierId: b.id })
    const comp = await recordPrice({ date: '2026-09-02', productId: p.id, kind: 'competitorPrice', value: 1800, unit: 'sack', source: 'heard' })

    expect((await priceHistory(p.id)).map((o) => o.date)).toEqual(['2026-09-02', '2026-09-01', '2026-08-28', '2026-08-20'])
    expect(perBaseUnit(a2, p)).toBe(34)
    expect(perBaseUnit(b1, p)).toBe(33.5)

    const latest = await latestPrices(p.id)
    expect(latest.map((o) => o.id)).toEqual([comp.id, a2.id, b1.id])
    expect((await supplierPrices(a.id)).map((o) => o.id)).toEqual([a2.id])
    expect(await priceHistory('nobody')).toEqual([])
  })

  it('logs a receipt as an own-source supplier price per base unit', async () => {
    const p = await grower()
    const s = await createSupplier({ name: 'SMC dealer', terms: 'days15' })
    const o = await logReceiptPrice({ date: '2026-09-05', productId: p.id, supplierId: s.id, unitCost: 34.2 })
    expect(o).toMatchObject({ kind: 'supplierPrice', source: 'own', value: 34.2, unit: 'kg', supplierId: s.id, note: 'received' })
    expect((await latestPrices(p.id)).map((x) => x.id)).toEqual([o.id])
  })
})
