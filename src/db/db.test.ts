import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { db, STORE_ID } from './db'

// PLAN.md section 5 with the P2 review (TASK 001 section 7 item r): thirteen tables,
// every row stamped with updatedAt and a nullable deletedAt tombstone so sync (P10)
// can propagate deletions; taxMode lives on the single store row.
const TABLES = [
  'store',
  'suppliers',
  'customers',
  'products',
  'stockLots',
  'stockMoves',
  'purchases',
  'sales',
  'payments',
  'transactions',
  'priceLog',
  'scenarios',
  'settings',
]

function indexes(table: string): string[] {
  return db.table(table).schema.indexes.map((i) => i.keyPath as string | string[]).map(String)
}

describe('Dexie schema', () => {
  it('opens version 1 with the thirteen planned tables', async () => {
    await db.open()
    expect(db.verno).toBe(1)
    expect(db.tables.map((t) => t.name).sort()).toEqual([...TABLES].sort())
  })

  it('keys every table by id, except settings which is keyed by key', () => {
    for (const name of TABLES) {
      const expected = name === 'settings' ? 'key' : 'id'
      expect(db.table(name).schema.primKey.keyPath, name).toBe(expected)
    }
  })

  it('indexes the lookups the sales, inventory and finance pages query on', () => {
    expect(indexes('suppliers')).toEqual(expect.arrayContaining(['name']))
    expect(indexes('customers')).toEqual(expect.arrayContaining(['name', 'type']))
    expect(indexes('products')).toEqual(expect.arrayContaining(['name', 'category', 'barcode']))
    expect(indexes('stockLots')).toEqual(expect.arrayContaining(['productId', 'expiryDate', 'purchaseId']))
    expect(indexes('stockMoves')).toEqual(expect.arrayContaining(['productId', 'lotId', 'date', 'reason', 'refType,refId']))
    expect(indexes('purchases')).toEqual(expect.arrayContaining(['date', 'supplierId', 'dueDate']))
    expect(indexes('sales')).toEqual(expect.arrayContaining(['date', 'customerId', 'paymentMethod']))
    expect(indexes('payments')).toEqual(expect.arrayContaining(['date', 'kind', 'customerId', 'supplierId', 'refId']))
    expect(indexes('transactions')).toEqual(expect.arrayContaining(['date', 'kind', 'category']))
    expect(indexes('priceLog')).toEqual(expect.arrayContaining(['date', 'productId', 'kind']))
    expect(indexes('scenarios')).toEqual(expect.arrayContaining(['name']))
  })

  it('reserves a fixed id for the single store row', () => {
    expect(STORE_ID).toBe('store')
  })
})
