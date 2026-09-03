import { isISODate } from '../engine/dates'
import type { ISODate, Transaction, TransactionKind } from '../types'
import { db } from './db'
import { STOCK_PURCHASES } from './purchaseRepo'
import { create, now } from './repo'

// The ledger is the transactions table (P6 design decision 1). Sales and purchases post
// their own rows (revenue 'sales', expense 'stock purchases', both linked); the quick-add
// here writes the kinds nothing else posts: an expense by category, other revenue, the
// owner's capital and drawings, a loan and its payments. The expense category list is
// seeded from PLAN.md section 5 and edited in Settings; hand expenses must use it.

export const TRANSACTION_KINDS: TransactionKind[] = ['expense', 'revenue', 'capital', 'drawing', 'loan', 'loanPayment']

export const EXPENSE_CATEGORY_SEED: string[] = [
  STOCK_PURCHASES,
  'rent',
  'salaries',
  'utilities',
  'transport and delivery',
  'permits and licences',
  'repairs',
  'packaging',
  'marketing',
  'bank and e-wallet fees',
  'other',
]

export const SALES_CATEGORY = 'sales'
export const OTHER_REVENUE = 'other revenue'

// Fixed categories for the kinds that have exactly one.
const FIXED_CATEGORY: Partial<Record<TransactionKind, string>> = { capital: 'capital', drawing: 'drawing', loan: 'loan', loanPayment: 'loan payment' }

const CATEGORIES_KEY = 'expenseCategories'

export interface TransactionInput {
  date: ISODate
  kind: TransactionKind
  category: string // an expense picks from the list; other revenue is free text; the rest are fixed
  amount: number
  note?: string
}

export async function expenseCategories(): Promise<string[]> {
  const row = await db.settings.get(CATEGORIES_KEY)
  const list = row && !row.deletedAt ? (row.value as string[]) : undefined
  return list && list.length > 0 ? list : EXPENSE_CATEGORY_SEED
}

// Trims, drops blanks and case-insensitive duplicates (first spelling wins). Stock purchases
// stays on the list because purchases post to it, and at least one hand category must remain.
export async function setExpenseCategories(input: string[]): Promise<string[]> {
  const list: string[] = []
  for (const raw of input) {
    const name = raw.trim()
    if (name && !list.some((c) => c.toLowerCase() === name.toLowerCase())) list.push(name)
  }
  if (!list.some((c) => c.toLowerCase() === STOCK_PURCHASES)) throw new Error(`${STOCK_PURCHASES} stays on the list: purchases post to it`)
  if (list.length < 2) throw new Error('Keep at least one expense category besides stock purchases')
  await db.settings.put({ key: CATEGORIES_KEY, value: list, updatedAt: now(), deletedAt: null })
  return list
}

async function categoryFor(kind: TransactionKind, raw: string): Promise<string> {
  const fixed = FIXED_CATEGORY[kind]
  if (fixed) return fixed
  const name = raw.trim()
  if (kind === 'revenue') {
    if (name.toLowerCase() === SALES_CATEGORY) throw new Error('Sales are recorded on the Sales page, not by hand')
    return name || OTHER_REVENUE
  }
  if (!name) throw new Error('Pick an expense category')
  if (name.toLowerCase() === STOCK_PURCHASES) throw new Error('Record stock purchases as a purchase order so the stock is received')
  const match = (await expenseCategories()).find((c) => c.toLowerCase() === name.toLowerCase())
  if (!match) throw new Error(`Expense category ${name} is not on the list (edit the list in Settings)`)
  return match
}

export async function addTransaction(input: TransactionInput): Promise<Transaction> {
  if (!isISODate(input.date)) throw new Error('Date must be a valid YYYY-MM-DD date')
  if (!TRANSACTION_KINDS.includes(input.kind)) throw new Error('Kind must be expense, revenue, capital, drawing, loan or loan payment')
  if (!(input.amount > 0)) throw new Error('Amount must be above 0')
  const category = await categoryFor(input.kind, input.category)
  const note = input.note?.trim()
  return create(db.transactions, { date: input.date, kind: input.kind, category, amount: Math.round(input.amount * 100) / 100, ...(note ? { note } : {}), links: {} })
}

export interface LedgerFilter {
  from?: ISODate // inclusive
  to?: ISODate // inclusive
  kind?: TransactionKind
}

// Live rows newest first (same date: latest written first); both bounds inclusive.
export async function listTransactions({ from, to, kind }: LedgerFilter): Promise<Transaction[]> {
  const rows = await db.transactions.toArray()
  return rows
    .filter((t) => !t.deletedAt && (!from || t.date >= from) && (!to || t.date <= to) && (!kind || t.kind === kind))
    .sort((a, b) => (a.date === b.date ? (a.updatedAt < b.updatedAt ? 1 : -1) : a.date < b.date ? 1 : -1))
}
