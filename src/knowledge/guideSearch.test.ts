import { describe, expect, it } from 'vitest'
import { GLOSSARY } from './glossary'
import { GUIDE_TOPICS } from './guide'
import { searchGuide } from './guideSearch'

// The Guide search (P9 design decision 2): an in-memory ranking over title, tags, summary
// and paragraphs, plus the glossary terms, with no library.
const text = (id: string) => {
  const t = GUIDE_TOPICS.find((x) => x.id === id)!
  return [t.title, t.summary, ...t.paragraphs, ...t.tags].join(' ').toLowerCase()
}

describe('searchGuide', () => {
  it('returns nothing for an empty or blank query', () => {
    expect(searchGuide('')).toEqual({ topics: [], terms: [] })
    expect(searchGuide('   ')).toEqual({ topics: [], terms: [] })
  })

  it('ranks a title match above a body-only match and is case-insensitive', () => {
    const { topics } = searchGuide('Tingi')
    expect(topics[0].topic.id).toBe('tingi-pricing')
    expect(topics.map((h) => h.topic.id)).toContain('repacking-rules')
    expect(topics.every((h) => text(h.topic.id).includes('tingi'))).toBe(true)
    expect(searchGuide('TINGI').topics.map((h) => h.topic.id)).toEqual(topics.map((h) => h.topic.id))
  })

  it('ranks the two GMROI-titled topics above the buying rules, which only carry the tag and a mention', () => {
    const ids = searchGuide('gmroi').topics.map((h) => h.topic.id)
    expect(ids.slice(0, 2).sort()).toEqual(['kpi-gmroi', 'turnover-and-gmroi'])
    expect(ids.indexOf('buying-rules')).toBeGreaterThan(1)
  })

  it('requires every word of a multi-word query', () => {
    const both = searchGuide('hog cholera').topics
    expect(both.length).toBeGreaterThan(0)
    expect(both.length).toBeLessThan(searchGuide('hog').topics.length)
    for (const h of both) {
      expect(text(h.topic.id)).toContain('hog')
      expect(text(h.topic.id)).toContain('cholera')
    }
  })

  it('gives each topic hit a snippet around the first matching word', () => {
    const { topics } = searchGuide('aflatoxin')
    expect(topics.length).toBeGreaterThan(0)
    for (const h of topics) {
      expect(h.snippet.toLowerCase()).toContain('aflatoxin')
      expect(h.snippet.length).toBeLessThanOrEqual(220)
    }
  })

  it('finds glossary terms by the term and by the meaning, exact term first', () => {
    expect(searchGuide('suki').terms[0].term).toBe('suki')
    expect(searchGuide('kilo').terms.map((g) => g.term)).toContain('tingi')
    expect(searchGuide('darak').terms.map((g) => g.term)).toEqual(['darak'])
    expect(GLOSSARY.some((g) => g.term === 'darak')).toBe(true)
  })

  it('returns nothing on no match', () => {
    expect(searchGuide('zzzzqqq')).toEqual({ topics: [], terms: [] })
  })
})
