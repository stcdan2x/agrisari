import type { Period } from '../engine/finance'
import type { BaseRow, Payment, Purchase, Sale, StockMove, Transaction } from '../types'
import { db, type SyncTable } from './db'

export interface PeriodRows {
  transactions: Transaction[]
  moves: StockMove[]
  sales: Sale[]
  purchases: Purchase[]
  payments: Payment[]
}

// The live rows dated inside the period, for the P6 report engine (every table has a date index).
export async function periodRows({ from, to }: Period): Promise<PeriodRows> {
  const dated = <T extends BaseRow>(table: SyncTable<T>): Promise<T[]> =>
    table
      .where('date')
      .between(from, to, true, true)
      .filter((r) => !r.deletedAt)
      .toArray()
  const [transactions, moves, sales, purchases, payments] = await Promise.all([dated(db.transactions), dated(db.stockMoves), dated(db.sales), dated(db.purchases), dated(db.payments)])
  return { transactions, moves, sales, purchases, payments }
}

// Every live transaction and stock move up to and including asOf, for the ROI and payback view.
export async function historyRows(asOf: string): Promise<{ transactions: Transaction[]; moves: StockMove[] }> {
  const upTo = <T extends BaseRow>(table: SyncTable<T>): Promise<T[]> =>
    table
      .where('date')
      .belowOrEqual(asOf)
      .filter((r) => !r.deletedAt)
      .toArray()
  const [transactions, moves] = await Promise.all([upTo(db.transactions), upTo(db.stockMoves)])
  return { transactions, moves }
}
