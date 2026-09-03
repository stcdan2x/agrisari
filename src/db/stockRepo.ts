import { isISODate, plusDays } from '../engine/dates'
import type { ISODate, Product, StockLot, StockMove, StockMoveReason, StockMoveRefType } from '../types'
import { db } from './db'
import { listProducts } from './productRepo'
import { liveWhere, newId, now } from './repo'

// Stock truth is the append-only stockMoves table (TASK 001 P3 design decision 1):
// every receipt creates a lot, every move names its lot, and StockLot.qtyOnHand is a
// cache written in the same transaction and rebuildable from the live moves.

export interface ReceiveInput {
  productId: string
  qty: number // base units
  unitCost: number // per base unit
  date: ISODate
  lotNo?: string
  expiryDate?: ISODate
  purchaseId?: string
  note?: string
}

export interface ConsumeInput {
  productId: string
  qty: number // base units, positive
  date: ISODate
  reason: StockMoveReason
  lotId?: string // limit to one lot; FEFO across the product's lots otherwise
  refType?: StockMoveRefType
  refId?: string
  note?: string
}

export interface CostState {
  qty: number
  avgCost: number
}

type CostMove = Pick<StockMove, 'date' | 'qtyDelta' | 'unitCost' | 'updatedAt' | 'deletedAt'>

const byDateAsc = (a: CostMove, b: CostMove) => a.date.localeCompare(b.date) || a.updatedAt.localeCompare(b.updatedAt)

// Weighted average per product (decision 8) replayed from the moves in date order:
// stock in moves the average by its own cost, stock out leaves it unchanged; stock that
// ran out restarts at the next receipt's cost.
export function costState(moves: CostMove[]): CostState {
  let qty = 0
  let avgCost = 0
  for (const m of [...moves].filter((m) => !m.deletedAt).sort(byDateAsc)) {
    if (m.qtyDelta > 0) {
      const held = Math.max(qty, 0)
      avgCost = held + m.qtyDelta > 0 ? (held * avgCost + m.qtyDelta * m.unitCost) / (held + m.qtyDelta) : m.unitCost
    }
    qty += m.qtyDelta
  }
  return { qty, avgCost: round(avgCost) }
}

// Costs are pesos and centavos; the replay keeps fractions of a centavo out.
const round = (n: number) => Math.round(n * 10000) / 10000

async function liveProduct(productId: string): Promise<Product> {
  const p = await db.products.get(productId)
  if (!p || p.deletedAt) throw new Error('Product not found')
  return p
}

export async function movesForProduct(productId: string): Promise<StockMove[]> {
  const rows = await liveWhere(db.stockMoves, 'productId', productId)
  return rows.sort((a, b) => b.date.localeCompare(a.date) || b.updatedAt.localeCompare(a.updatedAt))
}

export async function stockOnHand(productId: string): Promise<number> {
  const rows = await liveWhere(db.stockMoves, 'productId', productId)
  return rows.reduce((s, m) => s + m.qtyDelta, 0)
}

export async function averageCost(productId: string): Promise<number> {
  return costState(await liveWhere(db.stockMoves, 'productId', productId)).avgCost
}

// FEFO order: earliest expiry first, lots without an expiry last, then oldest receipt.
const fefo = (a: StockLot, b: StockLot) =>
  (a.expiryDate ?? '9999').localeCompare(b.expiryDate ?? '9999') || a.receivedDate.localeCompare(b.receivedDate) || a.updatedAt.localeCompare(b.updatedAt)

export async function lotsOnHand(productId: string): Promise<StockLot[]> {
  const rows = await liveWhere(db.stockLots, 'productId', productId)
  return rows.filter((l) => l.qtyOnHand > 0).sort(fefo)
}

function validateReceive(input: ReceiveInput): void {
  if (!(Number.isFinite(input.qty) && input.qty > 0)) throw new Error('Quantity must be above 0')
  if (!(Number.isFinite(input.unitCost) && input.unitCost >= 0)) throw new Error('Unit cost must be 0 or more')
  if (!isISODate(input.date)) throw new Error('Date must be a valid YYYY-MM-DD date')
  if (input.expiryDate !== undefined && !isISODate(input.expiryDate)) throw new Error('Expiry must be a valid YYYY-MM-DD date')
}

// Adds a lot and its stock-in move in one transaction; `reason` is `purchase` for a
// receipt and `repack`, `adjustment`, `count` or `return` for the other stock-in cases.
export async function addLot(
  input: ReceiveInput,
  reason: StockMoveReason,
  ref: { refType?: StockMoveRefType; refId?: string } = {},
): Promise<{ lot: StockLot; move: StockMove }> {
  validateReceive(input)
  return db.transaction('rw', db.products, db.stockLots, db.stockMoves, async () => {
    const product = await liveProduct(input.productId)
    const ts = now()
    const expiryDate = input.expiryDate ?? (product.hasExpiry && product.lotShelfLifeDays ? plusDays(input.date, product.lotShelfLifeDays) : undefined)
    const lot: StockLot = {
      id: newId(),
      updatedAt: ts,
      deletedAt: null,
      productId: product.id,
      ...(input.lotNo?.trim() ? { lotNo: input.lotNo.trim() } : {}),
      ...(expiryDate ? { expiryDate } : {}),
      qtyOnHand: input.qty,
      unitCost: input.unitCost,
      receivedDate: input.date,
      ...(input.purchaseId ? { purchaseId: input.purchaseId } : {}),
    }
    const move: StockMove = {
      id: newId(),
      updatedAt: ts,
      deletedAt: null,
      productId: product.id,
      lotId: lot.id,
      date: input.date,
      qtyDelta: input.qty,
      unitCost: input.unitCost,
      reason,
      ...(ref.refType ? { refType: ref.refType } : {}),
      ...(ref.refId ? { refId: ref.refId } : {}),
      ...(input.note?.trim() ? { note: input.note.trim() } : {}),
    }
    await db.stockLots.add(lot)
    await db.stockMoves.add(move)
    return { lot, move }
  })
}

export function receiveLot(input: ReceiveInput): Promise<{ lot: StockLot; move: StockMove }> {
  return addLot(input, 'purchase', input.purchaseId ? { refType: 'purchase', refId: input.purchaseId } : {})
}

// Takes `qty` out of the product's lots in FEFO order (or out of one lot), one move
// per lot, each valued at the product's weighted average before the consumption.
export async function consume(input: ConsumeInput): Promise<{ moves: StockMove[]; unitCost: number }> {
  if (!(Number.isFinite(input.qty) && input.qty > 0)) throw new Error('Quantity must be above 0')
  if (!isISODate(input.date)) throw new Error('Date must be a valid YYYY-MM-DD date')
  return db.transaction('rw', db.products, db.stockLots, db.stockMoves, async () => {
    const product = await liveProduct(input.productId)
    const all = await liveWhere(db.stockMoves, 'productId', product.id)
    const unitCost = costState(all).avgCost
    let lots = await lotsOnHand(product.id)
    if (input.lotId) lots = lots.filter((l) => l.id === input.lotId)
    const available = lots.reduce((s, l) => s + l.qtyOnHand, 0)
    if (available < input.qty) throw new Error(`Only ${available} ${product.baseUnit} of ${product.name} on hand`)
    const ts = now()
    const moves: StockMove[] = []
    let left = input.qty
    for (const lot of lots) {
      if (left <= 0) break
      const take = Math.min(lot.qtyOnHand, left)
      left -= take
      moves.push({
        id: newId(),
        updatedAt: ts,
        deletedAt: null,
        productId: product.id,
        lotId: lot.id,
        date: input.date,
        qtyDelta: -take,
        unitCost,
        reason: input.reason,
        ...(input.refType ? { refType: input.refType } : {}),
        ...(input.refId ? { refId: input.refId } : {}),
        ...(input.note?.trim() ? { note: input.note.trim() } : {}),
      })
      await db.stockLots.put({
        ...lot,
        qtyOnHand: lot.qtyOnHand - take,
        updatedAt: ts,
      })
    }
    await db.stockMoves.bulkAdd(moves)
    return { moves, unitCost }
  })
}

// Recomputes the lot caches from the live moves (P10 runs this after a merge).
export async function rebuildLotQuantities(productId?: string): Promise<void> {
  await db.transaction('rw', db.stockLots, db.stockMoves, async () => {
    const lots = productId ? await db.stockLots.where('productId').equals(productId).toArray() : await db.stockLots.toArray()
    for (const lot of lots) {
      const moves = await db.stockMoves.where('lotId').equals(lot.id).toArray()
      const qtyOnHand = moves.filter((m) => !m.deletedAt).reduce((s, m) => s + m.qtyDelta, 0)
      if (qtyOnHand !== lot.qtyOnHand) await db.stockLots.put({ ...lot, qtyOnHand, updatedAt: now() })
    }
  })
}

// --- 3.3 repack, adjustment, loss, expiry write-off ---------------------------------

export interface AdjustInput {
  productId: string
  qtyDelta: number // signed, base units
  date: ISODate
  note: string // an adjustment always says why
  unitCost?: number // stock in only; the product's average when omitted
  lotId?: string // stock out only; FEFO otherwise
}

const newestFirst = (a: StockLot, b: StockLot) => b.receivedDate.localeCompare(a.receivedDate) || b.updatedAt.localeCompare(a.updatedAt)

// Stock in: onto the newest lot that still holds stock, at the given or average cost, or
// onto a new lot when none does. Stock out: FEFO through consume.
async function stockIn(
  productId: string,
  qty: number,
  date: ISODate,
  reason: StockMoveReason,
  opts: {
    unitCost?: number
    note?: string
    refType?: StockMoveRefType
    refId?: string
  },
): Promise<{ moves: StockMove[]; unitCost: number }> {
  return db.transaction('rw', db.products, db.stockLots, db.stockMoves, async () => {
    const product = await liveProduct(productId)
    const unitCost = opts.unitCost ?? costState(await liveWhere(db.stockMoves, 'productId', product.id)).avgCost
    const lots = (await liveWhere(db.stockLots, 'productId', product.id)).filter((l) => l.qtyOnHand > 0).sort(newestFirst)
    const ref = {
      ...(opts.refType ? { refType: opts.refType } : {}),
      ...(opts.refId ? { refId: opts.refId } : {}),
    }
    if (lots.length === 0) {
      const { move } = await addLot({ productId: product.id, qty, unitCost, date, note: opts.note }, reason, ref)
      return { moves: [move], unitCost }
    }
    const lot = lots[0]
    const ts = now()
    const move: StockMove = {
      id: newId(),
      updatedAt: ts,
      deletedAt: null,
      productId: product.id,
      lotId: lot.id,
      date,
      qtyDelta: qty,
      unitCost,
      reason,
      ...ref,
      ...(opts.note?.trim() ? { note: opts.note.trim() } : {}),
    }
    await db.stockLots.put({
      ...lot,
      qtyOnHand: lot.qtyOnHand + qty,
      updatedAt: ts,
    })
    await db.stockMoves.add(move)
    return { moves: [move], unitCost }
  })
}

export async function adjust(input: AdjustInput): Promise<{ moves: StockMove[]; unitCost: number }> {
  if (!Number.isFinite(input.qtyDelta) || input.qtyDelta === 0) throw new Error('Quantity must be a number other than 0')
  if (!input.note.trim()) throw new Error('A note is required: say why the stock is adjusted')
  if (!isISODate(input.date)) throw new Error('Date must be a valid YYYY-MM-DD date')
  if (input.qtyDelta > 0)
    return stockIn(input.productId, input.qtyDelta, input.date, 'adjustment', {
      unitCost: input.unitCost,
      note: input.note,
    })
  return consume({
    productId: input.productId,
    qty: -input.qtyDelta,
    date: input.date,
    reason: 'adjustment',
    lotId: input.lotId,
    note: input.note,
  })
}

export function recordLoss(input: {
  productId: string
  qty: number
  date: ISODate
  lotId?: string
  note?: string
}): Promise<{ moves: StockMove[]; unitCost: number }> {
  return consume({ ...input, reason: 'loss' })
}

// Writes off whatever is left in the lot at the product's average cost.
export async function writeOffExpired(input: { lotId: string; date: ISODate; note?: string }): Promise<StockMove> {
  if (!isISODate(input.date)) throw new Error('Date must be a valid YYYY-MM-DD date')
  return db.transaction('rw', db.products, db.stockLots, db.stockMoves, async () => {
    const lot = await db.stockLots.get(input.lotId)
    if (!lot || lot.deletedAt) throw new Error('Lot not found')
    if (lot.qtyOnHand <= 0) throw new Error('Nothing left in this lot to write off')
    const { moves } = await consume({
      productId: lot.productId,
      qty: lot.qtyOnHand,
      date: input.date,
      reason: 'expired',
      lotId: lot.id,
      note: input.note,
    })
    return moves[0]
  })
}

export interface RepackInput {
  fromProductId: string
  toProductId: string
  qtyOut: number // source base units taken
  qtyIn: number // target base units made
  date: ISODate
  note?: string
}

// A repack moves stock and its cost from one product to another (design decision 3):
// the source is consumed FEFO, the target receives one lot carrying the whole cost taken
// (so spillage raises the unit cost) and the earliest expiry of the source lots.
export async function repack(input: RepackInput): Promise<{
  refId: string
  out: { moves: StockMove[]; unitCost: number }
  in: { lot: StockLot; move: StockMove }
}> {
  if (input.fromProductId === input.toProductId) throw new Error('Repack needs two different products')
  if (!(Number.isFinite(input.qtyOut) && input.qtyOut > 0) || !(Number.isFinite(input.qtyIn) && input.qtyIn > 0))
    throw new Error('Quantity out and quantity in must be above 0')
  if (!isISODate(input.date)) throw new Error('Date must be a valid YYYY-MM-DD date')
  return db.transaction('rw', db.products, db.stockLots, db.stockMoves, async () => {
    await liveProduct(input.toProductId)
    const refId = newId()
    const out = await consume({
      productId: input.fromProductId,
      qty: input.qtyOut,
      date: input.date,
      reason: 'repack',
      refId,
      note: input.note,
    })
    const sourceLots = await db.stockLots.bulkGet(out.moves.map((m) => m.lotId!))
    const expiries = sourceLots.flatMap((l) => (l?.expiryDate ? [l.expiryDate] : [])).sort()
    const unitCost = round((input.qtyOut * out.unitCost) / input.qtyIn)
    const target = await addLot(
      {
        productId: input.toProductId,
        qty: input.qtyIn,
        unitCost,
        date: input.date,
        note: input.note,
        ...(expiries[0] ? { expiryDate: expiries[0] } : {}),
      },
      'repack',
      { refId },
    )
    return { refId, out, in: target }
  })
}

// --- 3.4 cycle count and snapshots ---------------------------------------------------

export interface CountInput {
  productId: string
  counted: number // base units on the shelf
  date: ISODate
  refId: string // one id per counting session, shared by all its moves
  note?: string
}

// A count per product (design decision 4): a shortage is taken FEFO, a surplus lands on
// the newest lot that still holds stock, both as `count` moves under the session id.
export async function countStock(input: CountInput): Promise<{ delta: number; moves: StockMove[] }> {
  if (!(Number.isFinite(input.counted) && input.counted >= 0)) throw new Error('The counted quantity must be 0 or more')
  if (!isISODate(input.date)) throw new Error('Date must be a valid YYYY-MM-DD date')
  if (!input.refId.trim()) throw new Error('A count reference is required')
  return db.transaction('rw', db.products, db.stockLots, db.stockMoves, async () => {
    const delta = round(input.counted - (await stockOnHand(input.productId)))
    if (delta === 0) return { delta: 0, moves: [] }
    const ref = { refType: 'count' as const, refId: input.refId.trim() }
    const r =
      delta > 0
        ? await stockIn(input.productId, delta, input.date, 'count', {
            note: input.note,
            ...ref,
          })
        : await consume({
            productId: input.productId,
            qty: -delta,
            date: input.date,
            reason: 'count',
            note: input.note,
            ...ref,
          })
    return { delta, moves: r.moves }
  })
}

export interface StockSnapshot {
  product: Product
  onHand: number
  lots: StockLot[]
  moves: StockMove[]
}

// Every live product (extension lines included) with its live lots and moves, in the
// product list order.
export async function stockSnapshots(): Promise<StockSnapshot[]> {
  const [products, lots, moves] = await Promise.all([listProducts({ includeExtension: true }), db.stockLots.toArray(), db.stockMoves.toArray()])
  const lotsBy = new Map<string, StockLot[]>()
  for (const l of lots) if (!l.deletedAt) lotsBy.set(l.productId, [...(lotsBy.get(l.productId) ?? []), l])
  const movesBy = new Map<string, StockMove[]>()
  for (const m of moves) if (!m.deletedAt) movesBy.set(m.productId, [...(movesBy.get(m.productId) ?? []), m])
  return products.map((product) => {
    const ms = movesBy.get(product.id) ?? []
    return {
      product,
      onHand: ms.reduce((s, m) => s + m.qtyDelta, 0),
      lots: (lotsBy.get(product.id) ?? []).filter((l) => l.qtyOnHand > 0).sort(fefo),
      moves: ms,
    }
  })
}
