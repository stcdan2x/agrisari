import type { TransactionKind } from '../../types'

export const KIND_LABEL: Record<TransactionKind, string> = {
  expense: 'Expense',
  revenue: 'Revenue',
  capital: 'Capital in',
  drawing: 'Drawing',
  loan: 'Loan received',
  loanPayment: 'Loan payment',
}

// Money coming into the store; every other kind is money going out.
export const MONEY_IN: ReadonlySet<TransactionKind> = new Set<TransactionKind>(['revenue', 'capital', 'loan'])

export const KIND_TONE: Record<TransactionKind, 'green' | 'red' | 'brand' | 'amber' | 'slate'> = {
  expense: 'red',
  revenue: 'green',
  capital: 'brand',
  drawing: 'amber',
  loan: 'brand',
  loanPayment: 'amber',
}
