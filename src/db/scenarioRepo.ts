import { type ScenarioParams, validateScenario } from '../engine/projection'
import { strategyById } from '../knowledge/strategies'
import type { Scenario } from '../types'
import { db } from './db'
import { create, liveAll, now, softDelete, update } from './repo'

// Saved scenarios (P7 step 7.4): a name, the strategy catalog entry it tries (or 'custom')
// and the projection params; the Plan page runs and compares them.

export interface ScenarioInput {
  name: string
  strategy: string
  params: ScenarioParams
}

export interface SavedScenario extends Omit<Scenario, 'params'> {
  params: ScenarioParams
}

function check(input: Partial<ScenarioInput>): void {
  if (input.name !== undefined && !input.name.trim()) throw new Error('Scenario name is required')
  if (input.strategy !== undefined && input.strategy !== 'custom' && !strategyById(input.strategy))
    throw new Error(`Strategy ${input.strategy} is not in the catalog`)
  if (input.params !== undefined) validateScenario(input.params)
}

export async function saveScenario(input: ScenarioInput): Promise<SavedScenario> {
  check(input)
  const row = await create(db.scenarios, {
    name: input.name.trim(),
    strategy: input.strategy,
    params: input.params as unknown as Record<string, unknown>,
    createdAt: now(),
  })
  return row as unknown as SavedScenario
}

export async function updateScenario(id: string, patch: Partial<ScenarioInput>): Promise<SavedScenario> {
  check(patch)
  const data: Partial<Scenario> = {
    ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
    ...(patch.strategy !== undefined ? { strategy: patch.strategy } : {}),
    ...(patch.params !== undefined ? { params: patch.params as unknown as Record<string, unknown> } : {}),
  }
  return (await update(db.scenarios, id, data)) as unknown as SavedScenario
}

export async function getScenario(id: string): Promise<SavedScenario | undefined> {
  const row = await db.scenarios.get(id)
  return row && !row.deletedAt ? (row as unknown as SavedScenario) : undefined
}

// Newest first.
export async function listScenarios(): Promise<SavedScenario[]> {
  return ((await liveAll(db.scenarios)) as unknown as SavedScenario[]).sort(
    (a, b) => b.createdAt.localeCompare(a.createdAt) || b.updatedAt.localeCompare(a.updatedAt),
  )
}

export function deleteScenario(id: string): Promise<void> {
  return softDelete(db.scenarios, id)
}
