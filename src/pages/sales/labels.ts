import type { CustomerType, PaymentMethod } from '../../types'

export const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  cash: 'Cash',
  gcash: 'GCash',
  bank: 'Bank transfer',
  credit: 'Credit (listahan)',
  mixed: 'Part paid',
}

export const CUSTOMER_TYPE_LABEL: Record<CustomerType, string> = {
  backyard: 'Backyard raiser',
  commercial: 'Commercial farm',
  farmer: 'Crop farmer',
  reseller: 'Reseller',
  pet: 'Pet owner',
  other: 'Other',
}
