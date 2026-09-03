import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { defaultParameters } from '../knowledge/parameters'
import { db } from './db'
import { loadParameters, resetParameters, saveParameters } from './parameterRepo'

beforeEach(async () => {
  await db.settings.clear()
})

describe('parameterRepo', () => {
  it('returns the research defaults when the store has no parameters row', async () => {
    const p = await loadParameters()
    expect(p.overridden).toEqual([])
    expect(p.values).toEqual(defaultParameters())
    expect(p.values.carryingCostPctPerYear).toBe(25)
    expect(p.values.targetMarginPct).toEqual({ fertilizer: 3.5 })
    expect(p.values.expiryWarningDays.feed).toBe(30)
    expect(p.values.expiryWarningDays.pesticide).toBe(90)
    expect(p.values.seasonalIndex.seed).toEqual([0.75, 1.35, 0.7, 1.2])
    expect(p.values.seasonalIndex.tool).toEqual([1, 1, 1, 1])
    expect(await db.settings.get('parameters')).toBeUndefined()
  })

  it('saves a Settings edit as the override on top of the defaults and keeps later edits', async () => {
    const first = await saveParameters({ carryingCostPctPerYear: 20, targetMarginPct: { fertilizer: 4, feed: 6 } })
    expect(first.overridden).toEqual(['carryingCostPctPerYear', 'targetMarginPct'])
    expect(first.values.carryingCostPctPerYear).toBe(20)
    expect(first.values.targetMarginPct).toEqual({ fertilizer: 4, feed: 6 })
    expect(first.values.fundingRatePctPerYear).toBe(defaultParameters().fundingRatePctPerYear)
    // The row holds only what was edited, stamped for sync, so a new default key later shows through.
    const row = (await db.settings.get('parameters'))!
    expect(row.value).toEqual({ carryingCostPctPerYear: 20, targetMarginPct: { fertilizer: 4, feed: 6 } })
    expect(row.deletedAt).toBeNull()
    expect(row.updatedAt).toMatch(/T/)

    const second = await saveParameters({ deadStockDays: 120, seasonalIndex: { ...first.values.seasonalIndex, feed: [0.9, 0.9, 1, 1.2] } })
    expect(second.overridden).toEqual(['carryingCostPctPerYear', 'targetMarginPct', 'deadStockDays', 'seasonalIndex'])
    expect(second.values.carryingCostPctPerYear).toBe(20)
    expect(second.values.deadStockDays).toBe(120)
    expect(second.values.seasonalIndex.feed).toEqual([0.9, 0.9, 1, 1.2])
    expect((await loadParameters()).values).toEqual(second.values)
  })

  it('rejects values outside their range and leaves the stored row unchanged', async () => {
    await saveParameters({ carryingCostPctPerYear: 20 })
    await expect(saveParameters({ carryingCostPctPerYear: Number.NaN })).rejects.toThrow(/carrying cost/i)
    await expect(saveParameters({ carryingCostPctPerYear: 150 })).rejects.toThrow(/carrying cost/i)
    await expect(saveParameters({ deadStockDays: 0 })).rejects.toThrow(/dead stock/i)
    await expect(saveParameters({ deadStockDays: 45.5 })).rejects.toThrow(/dead stock/i)
    await expect(saveParameters({ targetMarginPct: { feed: 120 } })).rejects.toThrow(/target margin/i)
    await expect(saveParameters({ expiryWarningDays: { ...defaultParameters().expiryWarningDays, feed: -1 } })).rejects.toThrow(/expiry warning/i)
    await expect(saveParameters({ seasonalIndex: { ...defaultParameters().seasonalIndex, feed: [1, 1, 1] as never } })).rejects.toThrow(/seasonal index/i)
    await expect(saveParameters({ seasonalIndex: { ...defaultParameters().seasonalIndex, feed: [1, 0, 1, 1] } })).rejects.toThrow(/seasonal index/i)
    await expect(saveParameters({ allowancePct: { current: 1, d31: 5, d61: 20, d90: 101 } })).rejects.toThrow(/allowance/i)
    await expect(saveParameters({ serviceLevelZ: -1 })).rejects.toThrow(/service level/i)
    await expect(saveParameters({ bogus: 1 } as never)).rejects.toThrow(/bogus/)
    const p = await loadParameters()
    expect(p.overridden).toEqual(['carryingCostPctPerYear'])
    expect(p.values.carryingCostPctPerYear).toBe(20)
  })

  it('resets to the research defaults with a tombstone so sync propagates the reset', async () => {
    await saveParameters({ carryingCostPctPerYear: 20 })
    await resetParameters()
    const p = await loadParameters()
    expect(p.overridden).toEqual([])
    expect(p.values).toEqual(defaultParameters())
    expect((await db.settings.get('parameters'))!.deletedAt).toMatch(/T/)
    // A save after the reset revives the row.
    await saveParameters({ deadStockDays: 60 })
    expect((await db.settings.get('parameters'))!.deletedAt).toBeNull()
    expect((await loadParameters()).overridden).toEqual(['deadStockDays'])
  })
})
