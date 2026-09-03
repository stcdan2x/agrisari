import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { defaultScenario } from '../engine/projection'
import { db } from './db'
import { deleteScenario, getScenario, listScenarios, saveScenario, updateScenario } from './scenarioRepo'

beforeEach(async () => {
  await db.scenarios.clear()
})

describe('scenarioRepo', () => {
  it('saves, lists newest first, updates and soft-deletes scenarios with their strategy and params', async () => {
    const a = await saveScenario({ name: 'Feeds only', strategy: 'buy-4-assortment', params: defaultScenario('2027-01') })
    expect(a).toMatchObject({ name: 'Feeds only', strategy: 'buy-4-assortment', deletedAt: null })
    expect(a.createdAt).toMatch(/T/)
    expect(a.params.months).toBe(24)
    const b = await saveScenario({
      name: 'With the vet line',
      strategy: 'sell-14-line-extensions',
      params: { ...defaultScenario('2027-01'), steadyStateSales: 350000 },
    })
    expect((await listScenarios()).map((s) => s.name)).toEqual(['With the vet line', 'Feeds only'])
    const updated = await updateScenario(a.id, { name: 'Feeds only, 30 months', params: { ...a.params, months: 30 } })
    expect(updated.params.months).toBe(30)
    expect((await getScenario(a.id))!.name).toBe('Feeds only, 30 months')
    await deleteScenario(b.id)
    expect((await listScenarios()).map((s) => s.id)).toEqual([a.id])
    expect((await db.scenarios.get(b.id))!.deletedAt).toMatch(/T/)
  })

  it('rejects a blank name, an unknown strategy and params the projection refuses', async () => {
    const params = defaultScenario('2027-01')
    await expect(saveScenario({ name: '  ', strategy: 'custom', params })).rejects.toThrow(/name/i)
    await expect(saveScenario({ name: 'x', strategy: 'nope', params })).rejects.toThrow(/strategy/i)
    await expect(saveScenario({ name: 'x', strategy: 'custom', params: { ...params, months: 40 } })).rejects.toThrow(/12 to 36/)
    expect(await listScenarios()).toEqual([])
    expect((await saveScenario({ name: 'Custom', strategy: 'custom', params })).strategy).toBe('custom')
  })
})
