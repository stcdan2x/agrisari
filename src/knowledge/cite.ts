// Every knowledge value carries where it came from (P7 design decision 1). A source is a
// research parameter row id ('FK-108', 'PM-125'), a section of a research document when the
// figure sits in a table without a row id ('PM:11' = philippine-market-and-seasonality
// section 11), or 'assumption' when the research has no figure and the value is the app's
// starting point, said so in the note. knowledge.test.ts checks every source resolves.
export type Source = string

export interface Cited<T> {
  value: T
  source: Source
  note?: string
}

export const cite = <T>(value: T, source: Source, note?: string): Cited<T> => (note ? { value, source, note } : { value, source })

// The research documents behind the two-letter row prefixes.
export const SOURCE_DOCS: Record<string, string> = {
  IS: 'industry-and-supply-chain',
  PC: 'product-catalog-and-categories',
  RT: 'regulations-permits-and-tax',
  SK: 'storekeeping-and-inventory-practice',
  BS: 'buying-strategies',
  SS: 'selling-strategies',
  PM: 'philippine-market-and-seasonality',
  FK: 'finance-and-kpis',
  PK: 'product-knowledge-for-counter-advice',
}

// The explanation every engine output carries (P7 design decision 3): one paragraph in
// words plus the assumptions it used, each with its value, its source and where the value
// came from: the research default, the store's own setting, or the store's history.
export type AssumptionOrigin = 'research' | 'store' | 'history'

export interface Assumption {
  label: string
  value: string | number
  source: Source
  origin: AssumptionOrigin
}

export interface Explanation {
  text: string
  assumptions: Assumption[]
}
