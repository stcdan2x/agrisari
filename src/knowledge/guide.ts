import type { Source } from './cite'
import { SOURCE_DOCS } from './cite'
import { APP_TOPICS } from './guide/app'
import { BUYING_TOPICS } from './guide/buying'
import { COUNTER_TOPICS } from './guide/counter'
import { DISCLAIMER_TOPICS } from './guide/disclaimers'
import { FINANCE_TOPICS, KPI_TOPICS } from './guide/finance'
import { MARKET_TOPICS } from './guide/market'
import { OPENING_TOPICS } from './guide/opening'
import { PERMIT_TOPICS } from './guide/permits'
import { PRODUCT_TOPICS } from './guide/products'
import { SELLING_TOPICS } from './guide/selling'
import { STOREKEEPING_TOPICS } from './guide/storekeeping'
import { TAX_TOPICS } from './guide/tax'
import { STRATEGIES, type Strategy } from './strategies'

// The Guide (PLAN.md F7, P9 design decision 1): typed topics compiled from the nine research
// documents, the way the P7 knowledge modules were. The research stays in this repository;
// the public skeleton receives only these modules. Every topic carries its sources (a
// parameter row id or a research document section, resolved by guide.test.ts) and its tags:
// the strategy ids, KPI ids, product categories and parameter keys it covers, so a screen can
// link to the topic for the thing on it and the coverage test can prove nothing is missing.
export type GuideSection =
  'products' | 'counter' | 'storekeeping' | 'buying' | 'selling' | 'market' | 'finance' | 'kpis' | 'opening' | 'permits' | 'tax' | 'app' | 'disclaimers'

export interface GuideTopic {
  id: string
  title: string
  section: GuideSection
  summary: string // one sentence for the section list and the search results
  paragraphs: string[] // plain text; a paragraph may open with a label ending in a full stop
  sources: Source[]
  tags: string[]
  related?: string[] // topic ids
}

export const GUIDE_SECTIONS: { id: GuideSection; title: string; blurb: string }[] = [
  {
    id: 'products',
    title: 'Products',
    blurb: 'What each line is, who buys it, how it is packed, stored, licensed and taxed; feed programs by species; crop inputs.',
  },
  {
    id: 'counter',
    title: 'Counter playbook',
    blurb: 'The questions customers ask at the counter, with the sourced short answer and the products that go with it.',
  },
  {
    id: 'storekeeping',
    title: 'Storekeeping',
    blurb: 'Expiry control, storage, repacking, receiving, reorder arithmetic, counts and the daily, weekly and monthly routines.',
  },
  {
    id: 'buying',
    title: 'Buying',
    blurb: 'Suppliers, terms, forward buying, promos, consignment, assortment and stock financing, with the buying strategy catalog.',
  },
  {
    id: 'selling',
    title: 'Selling',
    blurb: 'Suki, credit, tingi, bundles, delivery, technical service, seasons, payments and channels, with the selling strategy catalog.',
  },
  {
    id: 'market',
    title: 'Market and seasons',
    blurb: 'Demand drivers, disease shocks, the fiesta and planting calendars, price histories and the seasonal indices behind the plan.',
  },
  {
    id: 'finance',
    title: 'Finance',
    blurb: 'The accounting conventions the app uses: weighted average cost, margins, aging, cash cycle, break-even, capital and the books.',
  },
  { id: 'kpis', title: 'KPIs', blurb: 'What each figure on the dashboard and the reports means, how it is computed and what to compare it with.' },
  {
    id: 'opening',
    title: 'Opening a store',
    blurb: 'The trade, the supply chain, the competition, location, startup capital and the ordered opening checklist.',
  },
  {
    id: 'permits',
    title: 'Permits and licences',
    blurb: 'Registration in order, the FPA, BAI, BPI and FDA licences, the renewal calendar and the rules that bind a dealer.',
  },
  { id: 'tax', title: 'Tax', blurb: 'VAT exemption of feeds, fertilizer and seeds, percentage tax, the 8 percent option, BMBE, invoicing and the tax modes.' },
  {
    id: 'app',
    title: 'How the app computes',
    blurb: 'The projection assumptions, the store parameters, the rules behind the Plan page and what the dashboard figures read.',
  },
  { id: 'disclaimers', title: 'Disclaimers', blurb: 'What the figures in this Guide and in the app are, and what they are not.' },
]

// The KPIs of research/finance-and-kpis.md section 16; the dashboard and the reports show
// them and each has a topic in the KPIs section.
export const KPIS: { id: string; label: string }[] = [
  { id: 'daily-sales', label: 'Daily sales' },
  { id: 'transactions-per-day', label: 'Transactions per day' },
  { id: 'average-basket', label: 'Average basket' },
  { id: 'gross-margin-pct', label: 'Gross margin percent' },
  { id: 'inventory-days', label: 'Inventory days' },
  { id: 'receivable-days', label: 'Receivable days' },
  { id: 'bad-debt-pct', label: 'Bad debt percent' },
  { id: 'shrinkage-pct', label: 'Shrinkage percent' },
  { id: 'sales-per-sqm', label: 'Sales per square metre' },
  { id: 'sales-per-employee', label: 'Sales per employee' },
  { id: 'compensation-per-employee', label: 'Compensation per employee' },
  { id: 'dead-stock-share', label: 'Dead stock share' },
  { id: 'gmroi', label: 'GMROI' },
  { id: 'cash-conversion-cycle', label: 'Cash conversion cycle' },
  { id: 'break-even-coverage', label: 'Break-even coverage' },
]

// The strategy catalog entries become topics as they are, one per strategy, in the buying or
// selling section, so the Plan page and a saved scenario link to the same text the research
// wrote. Their sources are the catalog section of the research document plus the [Sn]
// entries the strategy names, shown in the last paragraph.
const firstSentence = (s: string) => s.split(/(?<=\.)\s/)[0]
export const strategyTopicId = (strategyId: string) => `strategy-${strategyId}`
const strategyTopic = (s: Strategy): GuideTopic => ({
  id: strategyTopicId(s.id),
  title: `Strategy ${s.number}: ${s.title}`,
  section: s.side,
  summary: firstSentence(s.description),
  paragraphs: [
    `What it is. ${s.description}`,
    `Cash cycle. ${s.cashCycle}`,
    `Cost structure. ${s.costStructure}`,
    `Margin per unit. ${s.revenueUnit}`,
    `When it wins. ${s.whenItWins}`,
    `When it loses. ${s.whenItLoses}`,
    `Risks. ${s.risks}`,
    `Records the store needs. ${s.records}`,
    `Research sources: ${s.sources.join(', ')} in the Sources list of research/${SOURCE_DOCS[s.doc]}.md.`,
  ],
  sources: [`${s.doc}:Strategy catalog`],
  tags: [s.id, s.side, ...s.parameters],
})

export const GUIDE_TOPICS: GuideTopic[] = [
  ...PRODUCT_TOPICS,
  ...COUNTER_TOPICS,
  ...STOREKEEPING_TOPICS,
  ...BUYING_TOPICS,
  ...STRATEGIES.filter((s) => s.side === 'buying').map(strategyTopic),
  ...SELLING_TOPICS,
  ...STRATEGIES.filter((s) => s.side === 'selling').map(strategyTopic),
  ...MARKET_TOPICS,
  ...FINANCE_TOPICS,
  ...KPI_TOPICS,
  ...OPENING_TOPICS,
  ...PERMIT_TOPICS,
  ...TAX_TOPICS,
  ...APP_TOPICS,
  ...DISCLAIMER_TOPICS,
]

const byId = new Map(GUIDE_TOPICS.map((t) => [t.id, t]))

export const topicById = (id: string): GuideTopic | undefined => byId.get(id)
export const topicsBySection = (section: GuideSection): GuideTopic[] => GUIDE_TOPICS.filter((t) => t.section === section)
export const topicsTagged = (tag: string): GuideTopic[] => GUIDE_TOPICS.filter((t) => t.tags.includes(tag))

// The topics a topic page lists beside its own text: the ones it names, then the ones that
// share a tag with it, in Guide order, without itself.
export function relatedTopics(topic: GuideTopic, limit = 8): GuideTopic[] {
  const named = (topic.related ?? []).map((id) => byId.get(id)).filter((t): t is GuideTopic => t !== undefined)
  const shared = GUIDE_TOPICS.filter((t) => t.id !== topic.id && !named.includes(t) && t.tags.some((tag) => topic.tags.includes(tag)))
  return [...named, ...shared].slice(0, limit)
}
