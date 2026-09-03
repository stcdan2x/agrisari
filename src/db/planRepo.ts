import type { BuyingInput, ProductSupply } from '../engine/buying'
import { plusDays, todayISO } from '../engine/dates'
import type { SellingInput } from '../engine/selling'
import { RULE_DEFAULTS } from '../knowledge/parameters'
import type { Supplier } from '../types'
import { listCustomers } from './customerRepo'
import { db } from './db'
import { loadParameters } from './parameterRepo'
import { receivablesAging } from './paymentRepo'
import { leadTimeFor, listPurchases } from './purchaseRepo'
import { listSales } from './saleRepo'
import { stockSnapshots } from './stockRepo'
import { listSuppliers } from './supplierRepo'

// Assembles what the engine rules read (P7 step 7.5) from the repositories the earlier
// phases wrote: the Plan page calls these, the rules stay pure.

export async function buyingInputs(today = todayISO()): Promise<BuyingInput> {
  const [snapshots, suppliers, purchases, priceLog, parameters] = await Promise.all([
    stockSnapshots(),
    listSuppliers(),
    listPurchases(),
    db.priceLog.toArray(),
    loadParameters(),
  ])
  const leadTimes = new Map<string, Promise<{ days: number | undefined; learned: boolean }>>()
  const leadTime = (s: Supplier) => {
    if (!leadTimes.has(s.id)) leadTimes.set(s.id, leadTimeFor(s))
    return leadTimes.get(s.id)!
  }
  const supply: ProductSupply[] = []
  for (const snap of snapshots) {
    const latest = purchases.find((p) => p.lines.some((l) => l.productId === snap.product.id)) // newest first
    if (!latest) continue
    const supplier = suppliers.find((s) => s.id === latest.supplierId)
    const lt = supplier ? await leadTime(supplier) : { days: undefined, learned: false }
    supply.push({
      productId: snap.product.id,
      supplierId: latest.supplierId,
      ...(lt.days !== undefined ? { leadTimeDays: lt.days } : {}),
      leadTimeLearned: lt.learned,
    })
  }
  return { today, snapshots, suppliers, supply, priceLog: priceLog.filter((q) => !q.deletedAt && q.kind === 'supplierPrice'), parameters }
}

export async function sellingInputs(today = todayISO()): Promise<SellingInput> {
  const from = plusDays(today, 1 - RULE_DEFAULTS.velocityWindowDays.value)
  const [buying, sales, customers, aging] = await Promise.all([buyingInputs(today), listSales({ from, to: today }), listCustomers(), receivablesAging(today)])
  return { ...buying, sales, customers, aging }
}
