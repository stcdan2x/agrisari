import Dexie, { type EntityTable, type Table } from 'dexie'
import type {
  BaseRow,
  Customer,
  Payment,
  PriceObservation,
  Product,
  Purchase,
  Sale,
  Scenario,
  Setting,
  StockLot,
  StockMove,
  Store,
  Supplier,
  Transaction,
} from '../types'

// Compile-time guard: a table can only hold rows that carry the sync stamps.
export type SyncTable<T extends BaseRow> = Table<T, string>

export const db = new Dexie('agrisari') as Dexie & {
  store: SyncTable<Store>
  suppliers: SyncTable<Supplier>
  customers: SyncTable<Customer>
  products: SyncTable<Product>
  stockLots: SyncTable<StockLot>
  stockMoves: SyncTable<StockMove>
  purchases: SyncTable<Purchase>
  sales: SyncTable<Sale>
  payments: SyncTable<Payment>
  transactions: SyncTable<Transaction>
  priceLog: SyncTable<PriceObservation>
  scenarios: SyncTable<Scenario>
  settings: EntityTable<Setting, 'key'>
}

// Only indexed fields are listed; Dexie stores every property of the object.
db.version(1).stores({
  store: 'id',
  suppliers: 'id, name',
  customers: 'id, name, type',
  products: 'id, name, category, barcode',
  stockLots: 'id, productId, expiryDate, purchaseId',
  stockMoves: 'id, productId, lotId, date, reason, [refType+refId]',
  purchases: 'id, date, supplierId, dueDate',
  sales: 'id, date, customerId, paymentMethod',
  payments: 'id, date, kind, customerId, supplierId, refId',
  transactions: 'id, date, kind, category',
  priceLog: 'id, date, productId, kind',
  scenarios: 'id, name',
  settings: 'key',
})

// One store per install (decision 4: one Google account shared by whoever runs the store).
export const STORE_ID = 'store'
