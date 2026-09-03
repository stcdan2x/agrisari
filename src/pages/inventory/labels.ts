import { peso } from '../../components/ui'
import type { Product, StockMoveReason } from '../../types'

export const REASON_LABEL: Record<StockMoveReason, string> = {
  purchase: 'Received',
  sale: 'Sold',
  repack: 'Repack',
  adjustment: 'Adjustment',
  loss: 'Loss',
  expired: 'Expired',
  return: 'Return',
  count: 'Count',
}

// "₱1,750 per sack · ₱38 per kg", or "no price yet" while every sell unit is still 0.
export function priceLabel(p: Product): string {
  const priced = p.sellUnits.filter((u) => u.price > 0)
  if (priced.length === 0) return 'no price yet'
  return priced.map((u) => `${peso(u.price)} per ${u.unit}`).join(' · ')
}
