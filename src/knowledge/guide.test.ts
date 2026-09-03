import { describe, expect, it } from 'vitest'
import { CATEGORY_ORDER } from './categories'
import { SOURCE_DOCS } from './cite'
import { GLOSSARY } from './glossary'
import { GUIDE_SECTIONS, GUIDE_TOPICS, KPIS, topicById, topicsBySection, topicsTagged } from './guide'
import { STRATEGIES } from './strategies'

// The guide topics and the glossary are compiled research data (TDD exclusion, decision 11,
// accepted for P9): these tests check shape, citation and coverage, not the wording. A
// source is a parameter row id of research/parameters.md, a numbered section of a research
// document ('SK:8' or 'SK:8.2'), or a heading quoted in full for the documents whose
// headings carry no number ('SS:Suki loyalty schemes').

const RESEARCH = import.meta.glob('../../research/*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>
const research = (name: string) => RESEARCH[`../../research/${name}.md`]
const rowIds = new Set([...research('parameters').matchAll(/^\| [a-z-]+ \| ([A-Z]{2}-\d+) \|/gm)].map((m) => m[1]))
const docOf = (prefix: string) => research(SOURCE_DOCS[prefix])

function checkSource(source: string, where: string) {
  const section = source.match(/^([A-Z]{2}):(.+)$/)
  if (section) {
    const [, prefix, ref] = section
    expect(SOURCE_DOCS[prefix], `${where}: unknown document ${prefix}`).toBeTruthy()
    const doc = docOf(prefix)
    const found = /^\d+(\.\d+)?$/.test(ref)
      ? doc.includes(`\n## ${ref}. `) || doc.includes(`\n### ${ref} `)
      : doc.includes(`\n## ${ref}\n`) || doc.includes(`\n### ${ref}\n`)
    expect(found, `${where}: section ${source} not found`).toBe(true)
    return
  }
  expect(source, `${where}: source must be a row id or a section`).toMatch(/^[A-Z]{2}-\d+$/)
  expect(rowIds.has(source), `${where}: row ${source} is not in research/parameters.md`).toBe(true)
}

const EM_DASH = '—'
const ids = new Set(GUIDE_TOPICS.map((t) => t.id))

describe('guide topics', () => {
  it('have a unique kebab id, a title, a known section, a summary, text, sources and tags', () => {
    expect(GUIDE_TOPICS.length).toBeGreaterThan(100)
    expect(ids.size).toBe(GUIDE_TOPICS.length)
    const sections = new Set(GUIDE_SECTIONS.map((s) => s.id))
    for (const t of GUIDE_TOPICS) {
      expect(t.id, t.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
      expect(t.title.trim().length, t.id).toBeGreaterThan(0)
      expect(sections.has(t.section), `${t.id}: section ${t.section}`).toBe(true)
      expect(t.summary.trim().length, t.id).toBeGreaterThan(0)
      expect(t.paragraphs.length, t.id).toBeGreaterThan(0)
      for (const p of t.paragraphs) expect(p.trim().length, t.id).toBeGreaterThan(0)
      expect(t.sources.length, `${t.id}: no sources`).toBeGreaterThan(0)
      expect(Array.isArray(t.tags), t.id).toBe(true)
      for (const r of t.related ?? []) expect(ids.has(r), `${t.id}: related ${r} is not a topic`).toBe(true)
    }
  })

  it('never use the em dash', () => {
    for (const t of GUIDE_TOPICS) expect([t.title, t.summary, ...t.paragraphs].join(' ').includes(EM_DASH), t.id).toBe(false)
    for (const g of GLOSSARY) expect(`${g.term} ${g.meaning}`.includes(EM_DASH), g.term).toBe(false)
    for (const s of GUIDE_SECTIONS) expect(`${s.title} ${s.blurb}`.includes(EM_DASH), s.id).toBe(false)
  })

  it('resolve every source against research/parameters.md or a research document heading', () => {
    expect(rowIds.size).toBe(1046)
    for (const t of GUIDE_TOPICS) for (const s of t.sources) checkSource(s, t.id)
    for (const g of GLOSSARY) checkSource(g.source, `glossary ${g.term}`)
  })

  it('cover every section, every catalog strategy, every KPI and every product category, and carry the disclaimers', () => {
    for (const s of GUIDE_SECTIONS) expect(topicsBySection(s.id).length, `section ${s.id} is empty`).toBeGreaterThan(0)
    for (const s of STRATEGIES) expect(topicsTagged(s.id).length, `strategy ${s.id} has no topic`).toBeGreaterThan(0)
    expect(KPIS.length).toBe(15)
    for (const k of KPIS) expect(topicsTagged(k.id).length, `KPI ${k.id} has no topic`).toBeGreaterThan(0)
    for (const c of CATEGORY_ORDER) expect(topicsTagged(c).length, `category ${c} has no topic`).toBeGreaterThan(0)
    for (const id of ['price-disclaimer', 'legal-disclaimer', 'advice-disclaimer']) {
      expect(topicById(id)?.section, id).toBe('disclaimers')
    }
    expect(topicById('nope')).toBeUndefined()
  })
})

describe('glossary', () => {
  it('lists the Tagalog trade terms once each, with a meaning and a topic that exists', () => {
    expect(GLOSSARY.length).toBeGreaterThanOrEqual(30)
    const terms = new Set(GLOSSARY.map((g) => g.term.toLowerCase()))
    expect(terms.size).toBe(GLOSSARY.length)
    for (const term of ['tingi', 'suki', 'listahan', 'bodega', 'darak', 'abono']) expect(terms.has(term), term).toBe(true)
    for (const g of GLOSSARY) {
      expect(g.meaning.trim().length, g.term).toBeGreaterThan(0)
      if (g.topic) expect(ids.has(g.topic), `${g.term}: topic ${g.topic}`).toBe(true)
    }
  })
})
