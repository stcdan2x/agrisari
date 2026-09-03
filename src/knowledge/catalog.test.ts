import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../db/db'
import { updateProduct } from '../db/productRepo'
import { CATALOG, catalogProduct, seedCatalog } from './catalog'

describe('starter catalog (research/product-catalog-and-categories.md section 12)', () => {
  it('holds 130 SKUs: 116 launch lines and 14 extension lines with unique stable ids', () => {
    expect(CATALOG).toHaveLength(130)
    expect(CATALOG.filter((r) => r.extension)).toHaveLength(14)
    expect(new Set(CATALOG.map((r) => r.id)).size).toBe(130)
    expect(CATALOG[4]).toMatchObject({ id: 'catalog-005', name: 'Expert Hog Grower mash', brand: 'B-MEG', category: 'feed' })
    expect(CATALOG[116]).toMatchObject({ id: 'catalog-e01', name: 'Vetracin Classic', category: 'vetDrug', extension: true })
  })

  it('builds products with the pack and tingi sell units, prices unset, and the category defaults', () => {
    const grower = catalogProduct(CATALOG[4])
    expect(grower).toMatchObject({ baseUnit: 'kg', vatExempt: true, lotShelfLifeDays: 40, licenceClass: 'baiFeed', repackable: true, species: ['hog'], stage: 'grower', form: 'mash' })
    expect(grower.sellUnits).toEqual([
      { unit: 'sack', factor: 50, price: 0 },
      { unit: 'kg', factor: 1, price: 0 },
    ])
    const booster = catalogProduct(CATALOG[0]) // 1 kg bag, not tingi
    expect(booster.sellUnits).toEqual([{ unit: 'bag', factor: 1, price: 0 }])
    const urea = catalogProduct(CATALOG.find((r) => r.id === 'catalog-084')!)
    expect(urea).toMatchObject({ category: 'fertilizer', baseUnit: 'bag', repackable: false, regulator: 'fpa', vatExempt: true, hasExpiry: false })
    expect(urea.sellUnits).toEqual([{ unit: 'bag', factor: 1, price: 0 }])
  })

  it('marks gamefowl and pet feeds VATable and every other feed, ingredient, seed and fertilizer exempt', () => {
    const products = CATALOG.map(catalogProduct)
    const gamefowl = products.filter((p) => p.species?.includes('gamefowl'))
    expect(gamefowl.length).toBeGreaterThanOrEqual(8)
    expect(gamefowl.every((p) => p.vatExempt === false)).toBe(true)
    expect(products.filter((p) => p.category === 'pet').every((p) => p.vatExempt === false)).toBe(true)
    const exempt = products.filter((p) => ['feed', 'feedIngredient', 'seed', 'fertilizer'].includes(p.category) && !p.species?.includes('gamefowl'))
    expect(exempt.every((p) => p.vatExempt === true)).toBe(true)
    expect(products.filter((p) => ['pesticide', 'tool', 'equipment', 'vetDrug', 'vaccine', 'vitamin', 'disinfectant'].includes(p.category)).every((p) => p.vatExempt === false)).toBe(true)
  })

  it('carries the pesticide classes and actives, the vet withdrawal days and the vaccine cold chain', () => {
    const cymbush = catalogProduct(CATALOG.find((r) => r.id === 'catalog-096')!)
    expect(cymbush).toMatchObject({ category: 'pesticide', pesticideClass: 'insecticide', activeIngredient: 'cypermethrin', licenceClass: 'fpaDealer', baseUnit: 'bottle' })
    const vetracin = catalogProduct(CATALOG.find((r) => r.id === 'catalog-e01')!)
    expect(vetracin).toMatchObject({ rxClass: 'rx', licenceClass: 'baiVetOutletRx', withdrawalDays: { broiler: 1, layer: 1, cattle: 3, hog: 5 } })
    const vaccine = catalogProduct(CATALOG.find((r) => r.id === 'catalog-e09')!)
    expect(vaccine).toMatchObject({ category: 'vaccine', coldChain: true, licenceClass: 'baiBiologic', baseUnit: 'vial' })
  })

  describe('seedCatalog', () => {
    beforeEach(async () => {
      await db.products.clear()
    })

    it('inserts all 130 rows once and keeps the user edits on a second run', async () => {
      expect(await seedCatalog()).toBe(130)
      expect(await db.products.count()).toBe(130)
      const grower = (await db.products.get('catalog-005'))!
      expect(grower.deletedAt).toBeNull()
      await updateProduct(grower.id, { sellUnits: [{ unit: 'sack', factor: 50, price: 1750 }] })
      await db.products.delete('catalog-e14')
      expect(await seedCatalog()).toBe(1)
      expect(await db.products.count()).toBe(130)
      expect((await db.products.get('catalog-005'))!.sellUnits[0].price).toBe(1750)
    })
  })
})
