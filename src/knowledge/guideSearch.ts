import { GLOSSARY, type GlossaryEntry } from './glossary'
import { GUIDE_TOPICS, type GuideTopic } from './guide'

// The Guide search (P9 design decision 2): an in-memory ranking with no library. Every word
// of the query must match a topic somewhere; a word in the title counts most, then an exact
// tag, then a tag that contains it, then the summary, then the paragraphs (at most three).
// Glossary terms match by the term first and by the meaning second.
export interface TopicHit {
  topic: GuideTopic
  score: number
  snippet: string
}

export interface SearchResult {
  topics: TopicHit[]
  terms: GlossaryEntry[]
}

const WEIGHT = { title: 10, tag: 8, tagPart: 5, summary: 3, paragraph: 1, phrase: 5, maxParagraphs: 3 }
const SNIPPET = 200

const words = (query: string) =>
  query
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)

export function searchGuide(query: string, topics: GuideTopic[] = GUIDE_TOPICS, glossary: GlossaryEntry[] = GLOSSARY): SearchResult {
  const qs = words(query)
  if (qs.length === 0) return { topics: [], terms: [] }

  const hits: TopicHit[] = []
  for (const topic of topics) {
    const title = topic.title.toLowerCase()
    const summary = topic.summary.toLowerCase()
    const tags = topic.tags.map((t) => t.toLowerCase())
    const paragraphs = topic.paragraphs.map((p) => p.toLowerCase())
    let score = 0
    for (const w of qs) {
      let s = 0
      if (title.includes(w)) s += WEIGHT.title
      if (tags.includes(w)) s += WEIGHT.tag
      else if (tags.some((t) => t.includes(w))) s += WEIGHT.tagPart
      if (summary.includes(w)) s += WEIGHT.summary
      s += Math.min(paragraphs.filter((p) => p.includes(w)).length, WEIGHT.maxParagraphs) * WEIGHT.paragraph
      if (s === 0) {
        score = 0
        break
      }
      score += s
    }
    if (score === 0) continue
    if (qs.length > 1 && title.includes(qs.join(' '))) score += WEIGHT.phrase
    hits.push({ topic, score, snippet: snippet(topic, qs[0]) })
  }
  hits.sort((a, b) => b.score - a.score || a.topic.title.localeCompare(b.topic.title))

  const terms = glossary
    .map((entry) => ({ entry, score: termScore(entry, qs) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.entry.term.localeCompare(b.entry.term))
    .map((x) => x.entry)

  return { topics: hits, terms }
}

function termScore(entry: GlossaryEntry, qs: string[]): number {
  const term = entry.term.toLowerCase()
  const meaning = entry.meaning.toLowerCase()
  let score = 0
  for (const w of qs) {
    const s = term === w ? 10 : term.includes(w) ? 6 : meaning.includes(w) ? 1 : 0
    if (s === 0) return 0
    score += s
  }
  return score
}

// The text around the first paragraph (or the summary) that contains the word, trimmed to
// whole words on both sides.
function snippet(topic: GuideTopic, word: string): string {
  const source = [...topic.paragraphs, topic.summary].find((p) => p.toLowerCase().includes(word)) ?? topic.summary
  if (source.length <= SNIPPET) return source
  const at = Math.max(source.toLowerCase().indexOf(word), 0)
  let start = Math.max(0, at - Math.floor(SNIPPET / 3))
  if (start > 0) start = source.indexOf(' ', start) + 1
  let end = Math.min(source.length, start + SNIPPET)
  if (end < source.length) end = source.lastIndexOf(' ', end)
  return `${start > 0 ? '...' : ''}${source.slice(start, end).trim()}${end < source.length ? '...' : ''}`
}
