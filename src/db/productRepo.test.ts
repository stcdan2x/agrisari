import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { CATEGORY_DEFAULTS } from '../knowledge/categories'
import { db } from './db'
import { createProduct, findByBarcode, getProduct, listProducts, updateProduct } from './productRepo'

const grower = {
  name: '  Expert Hog Grower mash ',
  brand: 'B-MEG',
  category: 'feed' as const,
  baseUnit: 'kg',
  sellUnits: [
    { unit: 'sack', factor: 50, price: 1750 },
    { unit: 'kg', factor: 1, price: 38 },
  ],
}

describe('category defaults', () => {
  it('follow the catalog research: feeds exempt with a 40 day lot life, pesticides VATable under the FPA dealer licence, vaccines cold chain', () => {
    expect(CATEGORY_DEFAULTS.feed).toMatchObject({ vatExempt: true, hasExpiry: true, lotShelfLifeDays: 40, repackable: true, licenceClass: 'baiFeed' })
    expect(CATEGORY_DEFAULTS.feedIngredient).toMatchObject({ vatExempt: true, lotShelfLifeDays: 30, repackable: true })
    expect(CATEGORY_DEFAULTS.seed).toMatchObject({ vatExempt: true, hasExpiry: true, repackable: false, licenceClass: 'seedDealer' })
    expect(CATEGORY_DEFAULTS.fertilizer).toMatchObject({ vatExempt: true, hasExpiry: false, repackable: false, licenceClass: 'fpaDealer' })
    expect(CATEGORY_DEFAULTS.pesticide).toMatchObject({ vatExempt: false, hasExpiry: true, repackable: false, licenceClass: 'fpaDealer' })
    expect(CATEGORY_DEFAULTS.vaccine).toMatchObject({ vatExempt: false, coldChain: true, licenceClass: 'baiBiologic' })
    expect(CATEGORY_DEFAULTS.pet).toMatchObject({ vatExempt: false, licenceClass: 'baiFeed' })
    expect(CATEGORY_DEFAULTS.tool).toMatchObject({ vatExempt: false, hasExpiry: false, licenceClass: 'none' })
  })
})

describe('createProduct', () => {
  beforeEach(async () => {
    await db.products.clear()
  })

  it('stores a trimmed product with the category defaults filled in', async () => {
    const p = await createProduct(grower)
    expect(p.name).toBe('Expert Hog Grower mash')
    expect(p).toMatchObject({
      vatExempt: true,
      hasExpiry: true,
      lotShelfLifeDays: 40,
      repackable: true,
      licenceClass: 'baiFeed',
      coldChain: false,
      reorderLevel: 0,
      reorderQty: 0,
    })
    expect(await db.products.get(p.id)).toMatchObject({ brand: 'B-MEG', sellUnits: grower.sellUnits, deletedAt: null })
  })

  it('lets a SKU override its category defaults (gamefowl feed is a VATable specialty feed)', async () => {
    const p = await createProduct({ ...grower, name: 'Enertone', vatExempt: false, lotShelfLifeDays: 60 })
    expect(p.vatExempt).toBe(false)
    expect(p.lotShelfLifeDays).toBe(60)
  })

  it('rejects a blank name or base unit, no sell units, a bad sell unit, and negative levels', async () => {
    await expect(createProduct({ ...grower, name: ' ' })).rejects.toThrow(/name/i)
    await expect(createProduct({ ...grower, baseUnit: '' })).rejects.toThrow(/base unit/i)
    await expect(createProduct({ ...grower, sellUnits: [] })).rejects.toThrow(/sell unit/i)
    await expect(createProduct({ ...grower, sellUnits: [{ unit: 'sack', factor: 0, price: 1 }] })).rejects.toThrow(/factor/i)
    await expect(createProduct({ ...grower, sellUnits: [{ unit: 'sack', factor: 50, price: -1 }] })).rejects.toThrow(/price/i)
    await expect(createProduct({ ...grower, sellUnits: [{ unit: ' ', factor: 50, price: 1 }] })).rejects.toThrow(/unit/i)
    await expect(createProduct({ ...grower, sellUnits: [...grower.sellUnits, { unit: 'kg', factor: 1, price: 40 }] })).rejects.toThrow(/twice/i)
    await expect(createProduct({ ...grower, reorderLevel: -1 })).rejects.toThrow(/reorder/i)
    await expect(createProduct({ ...grower, lotShelfLifeDays: 0 })).rejects.toThrow(/shelf life/i)
    expect(await db.products.count()).toBe(0)
  })
})

describe('updateProduct, listProducts, findByBarcode', () => {
  beforeEach(async () => {
    await db.products.clear()
  })

  it('validates the patch and bumps updatedAt', async () => {
    const p = await createProduct(grower)
    await expect(updateProduct(p.id, { sellUnits: [] })).rejects.toThrow(/sell unit/i)
    const q = await updateProduct(p.id, { barcode: ' 4800000000001 ', reorderLevel: 4, reorderQty: 10 })
    expect(q.barcode).toBe('4800000000001')
    expect(q.reorderLevel).toBe(4)
    expect(q.updatedAt >= p.updatedAt).toBe(true)
    expect(await findByBarcode('4800000000001')).toMatchObject({ id: p.id })
    expect(await findByBarcode('nope')).toBeUndefined()
    expect(await getProduct(p.id)).toMatchObject({ id: p.id })
  })

  it('lists live products in category order then by name, hiding extension SKUs unless asked', async () => {
    await createProduct({ ...grower, name: 'Urea 46-0-0', category: 'fertilizer', baseUnit: 'bag', sellUnits: [{ unit: 'bag', factor: 1, price: 0 }] })
    await createProduct({ ...grower, name: 'Chick Booster Crumble' })
    const gone = await createProduct({ ...grower, name: 'Discontinued' })
    await createProduct({ ...grower, name: 'Vetracin Classic', category: 'vetDrug', baseUnit: 'sachet', sellUnits: [{ unit: 'sachet', factor: 1, price: 0 }], extension: true })
    await db.products.put({ ...gone, deletedAt: gone.updatedAt })
    expect((await listProducts()).map((p) => p.name)).toEqual(['Chick Booster Crumble', 'Urea 46-0-0'])
    expect((await listProducts({ includeExtension: true })).map((p) => p.name)).toEqual(['Chick Booster Crumble', 'Urea 46-0-0', 'Vetracin Classic'])
  })
})
