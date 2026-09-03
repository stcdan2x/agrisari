import { describe, expect, it } from 'vitest'
import { topicById } from './guide'
import { GUIDE_LINKS } from './guideLinks'

// The contextual links (P9 design decision 3): one GuideLink component takes a topic id, and
// the screens take their ids from GUIDE_LINKS, a registry typed against the category, licence,
// parameter, rule and alert unions so tsc proves every key has an entry. This test proves every
// entry is a topic, that the three F7 examples point where the plan says, and that every
// literal GuideLink in the pages resolves and each of the six screens carries one.
const SOURCES = import.meta.glob(['../pages/**/*.tsx', '../components/**/*.tsx'], { query: '?raw', import: 'default', eager: true }) as Record<string, string>

const walk = (node: unknown, where: string, out: [string, string][]) => {
  if (typeof node === 'string') out.push([where, node])
  else if (node && typeof node === 'object') for (const [k, v] of Object.entries(node)) walk(v, `${where}.${k}`, out)
}

describe('guide links', () => {
  it('every registry entry is a topic', () => {
    const entries: [string, string][] = []
    walk(GUIDE_LINKS, 'GUIDE_LINKS', entries)
    expect(entries.length).toBeGreaterThan(40)
    for (const [where, id] of entries) expect(topicById(id), `${where}: ${id}`).toBeDefined()
  })

  it('points the F7 examples where the plan says: pesticide to the FPA and storage topics, a credit sale to the credit policy, a reorder alert to the reorder point', () => {
    expect(GUIDE_LINKS.category.pesticide).toBe('pesticides')
    expect(GUIDE_LINKS.licence.fpaDealer).toBe('fpa-dealer-licence')
    expect(GUIDE_LINKS.storage.pesticide).toBe('pesticide-storage')
    expect(GUIDE_LINKS.creditSale).toBe('credit-policy')
    expect(GUIDE_LINKS.alert.lowStock).toBe('reorder-point')
    expect(GUIDE_LINKS.taxCard).toBe('tax-modes')
  })

  it('every literal GuideLink in the pages resolves, and each of the six screens carries one', () => {
    const usages = (path: string) => {
      const src = Object.entries(SOURCES).find(([p]) => p.endsWith(path))?.[1]
      expect(src, path).toBeDefined()
      return (src!.match(/<GuideLink\b/g) ?? []).length
    }
    for (const [path, src] of Object.entries(SOURCES)) {
      for (const m of src.matchAll(/<GuideLink\b[^>]*\btopic="([^"]+)"/g)) expect(topicById(m[1]), `${path}: ${m[1]}`).toBeDefined()
    }
    for (const screen of [
      'pages/inventory/ProductPage.tsx',
      'pages/sales/NewSalePage.tsx',
      'pages/inventory/InventoryPage.tsx',
      'pages/finance/ReportsPage.tsx',
      'pages/plan/PlanPage.tsx',
      'pages/SettingsPage.tsx',
    ]) {
      expect(usages(screen), screen).toBeGreaterThan(0)
    }
  })
})
