import type { BaseRow, Customer, ISODate, Payment, Purchase, Sale, StockMove, Store, Supplier, Transaction, Product } from '../types'
import { db, type SyncTable } from './db'
import { listProducts } from './productRepo'
import { liveAll } from './repo'
import { stockSnapshots, type StockSnapshot } from './stockRepo'
import { getStore } from './storeRepo'

// Everything the books export reads (TASK 003): the live dated rows up to and including
// the To date, so the builder can both report the period and settle what is still open at
// its end, plus the name tables, the stock on hand right now and the store row.
export interface BooksRows {
  store: Store | undefined
  sales: Sale[]
  purchases: Purchase[]
  payments: Payment[]
  transactions: Transaction[]
  moves: StockMove[]
  customers: Customer[]
  suppliers: Supplier[]
  products: Product[]
  snapshots: StockSnapshot[]
}

export async function booksRows(to: ISODate): Promise<BooksRows> {
  const upTo = <T extends BaseRow>(table: SyncTable<T>): Promise<T[]> =>
    table
      .where('date')
      .belowOrEqual(to)
      .filter((r) => !r.deletedAt)
      .toArray()
  const [store, sales, purchases, payments, transactions, moves, customers, suppliers, products, snapshots] = await Promise.all([
    getStore(),
    upTo(db.sales),
    upTo(db.purchases),
    upTo(db.payments),
    upTo(db.transactions),
    upTo(db.stockMoves),
    liveAll(db.customers),
    liveAll(db.suppliers),
    listProducts({ includeExtension: true }),
    stockSnapshots(),
  ])
  return { store, sales, purchases, payments, transactions, moves, customers, suppliers, products, snapshots }
}
