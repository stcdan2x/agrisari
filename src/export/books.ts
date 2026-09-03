import { format } from 'date-fns'
import type { BooksRows } from '../db/exportRepo'
import { cashFlow, incomeStatement, inventoryValuation, TAX_RATES, taxEstimate, type CashSection, type Period } from '../engine/finance'
import { CATEGORY_DEFAULTS } from '../knowledge/categories'
import { KIND_LABEL, MONEY_IN } from '../pages/finance/labels'
import { STATUS_LABEL } from '../pages/purchasing/labels'
import { CUSTOMER_TYPE_LABEL, PAYMENT_LABEL } from '../pages/sales/labels'
import type { BaseRow, ISODate, ISOTime, Purchase, TaxMode } from '../types'

// The books export (TASK 003): the pure builder behind "Export to Excel" on the Reports page.
// Ten sheets an accountant can file from, built from the rows up to the To date: the period
// sheets take the rows dated inside the period, Receivables and Payables settle what is still
// open at the To date, Stock is the on-hand value at export time. Names replace ids wherever
// the app stores one; a name that is gone keeps the id. Dates stay ISO text so they sort and
// never shift by a time zone; money is a number cell with a two-decimal format.

export type Cell = string | number | null | { value: number; format: string }

export interface BookColumn {
  header: string
  width: number // characters
}

export interface BookSheet {
  name: string
  columns: BookColumn[]
  rows: Cell[][]
}

export const MONEY_FORMAT = '#,##0.00'

const round = (n: number) => Math.round(n * 100) / 100
const m = (n: number): Cell => ({ value: round(n), format: MONEY_FORMAT })
const pct = (n: number): Cell => ({ value: n, format: '0.00' })
const col = (header: string, width: number): BookColumn => ({ header, width })
const byDate = <T extends BaseRow & { date: ISODate }>(a: T, b: T) => a.date.localeCompare(b.date) || a.updatedAt.localeCompare(b.updatedAt)
const within = <T extends { date: ISODate }>(rows: T[], p: Period) => rows.filter((r) => r.date >= p.from && r.date <= p.to)

const TAX_MODE_LABEL: Record<TaxMode, string> = { off: 'Off', nonVat: 'Non-VAT', vat: 'VAT' }
const percent = (rate: number) => `${Math.round(rate * 100)} percent`

export function buildBooks(period: Period, exportedAt: ISOTime, rows: BooksRows): BookSheet[] {
  const customerName = new Map(rows.customers.map((c) => [c.id, c.name]))
  const supplierName = new Map(rows.suppliers.map((s) => [s.id, s.name]))
  const product = new Map(rows.products.map((p) => [p.id, p]))
  const customer = (id?: string) => (id ? (customerName.get(id) ?? id) : 'Walk-in')
  const supplier = (id: string) => supplierName.get(id) ?? id
  const productName = (id: string) => product.get(id)?.name ?? id
  const sales = within(rows.sales, period).sort(byDate)
  const purchases = within(rows.purchases, period).sort(byDate)
  const payments = within(rows.payments, period).sort(byDate)
  const transactions = within(rows.transactions, period).sort(byDate)

  const summary = (): BookSheet => {
    const inc = incomeStatement(period, { transactions: rows.transactions, moves: rows.moves })
    const cash = cashFlow(period, { sales: rows.sales, purchases: rows.purchases, payments: rows.payments, transactions: rows.transactions })
    const tax = taxEstimate(rows.store?.taxMode ?? 'off', period, { sales: rows.sales, purchases: rows.purchases, products: rows.products })
    const section = (title: string, s: CashSection): Cell[][] => [[title, null], ...s.rows.map((r): Cell[] => [r.label, m(r.amount)]), [`${title} total`, m(s.total)]]
    const out: Cell[][] = [
      ['Store', rows.store?.name ?? ''],
      ['Period', `${period.from} to ${period.to}`],
      ['Exported', format(new Date(exportedAt), 'yyyy-MM-dd HH:mm')],
      ['Tax mode', TAX_MODE_LABEL[rows.store?.taxMode ?? 'off']],
      ['', null],
      ['Income statement (accrual)', null],
      ['Sales', m(inc.revenue.sales)],
      ['Other revenue', m(inc.revenue.other)],
      ['Revenue', m(inc.revenue.total)],
      ['Cost of goods sold', m(-inc.cogs)],
      ['Gross profit', m(inc.grossProfit)],
      ['Gross margin %', pct(inc.grossMarginPct)],
      ['Write-off: expired', m(-inc.writeOffs.expired)],
      ['Write-off: loss', m(-inc.writeOffs.loss)],
      ...inc.expenses.rows.map((r): Cell[] => [`Expense: ${r.category}`, m(-r.amount)]),
      ['Operating expenses', m(-inc.expenses.total)],
      ['Net income', m(inc.netIncome)],
      ['', null],
      ['Cash flow (cash basis)', null],
      ...section('Operating', cash.operating),
      ...section("Owner's capital", cash.capital),
      ...section('Financing', cash.financing),
      ['Net cash change', m(cash.net)],
    ]
    if (tax.mode === 'nonVat')
      out.push(
        ['', null],
        ['Tax estimate (non-VAT)', null],
        ['Exempt sales', m(tax.exemptSales)],
        ['Sales subject to percentage tax', m(tax.taxableSales)],
        [`Percentage tax (${percent(TAX_RATES.percentageTax)})`, m(tax.percentageTax)],
        ['Gross sales', m(tax.grossSales)],
        [`${percent(TAX_RATES.eightPercent)} option on gross sales`, m(tax.eightPercent)],
      )
    if (tax.mode === 'vat')
      out.push(
        ['', null],
        ['Tax estimate (VAT)', null],
        ['Exempt sales', m(tax.exemptSales)],
        ['VATable sales', m(tax.vatableSales)],
        ['Output VAT', m(tax.outputVat)],
        ['VATable purchases', m(tax.vatablePurchases)],
        ['Input VAT', m(tax.inputVat)],
        ['VAT payable', m(tax.vatPayable)],
      )
    return { name: 'Summary', columns: [col('Item', 40), col('Amount', 16)], rows: out }
  }

  const salesSheet = (): BookSheet => ({
    name: 'Sales',
    columns: [col('Date', 12), col('Reference', 38), col('Customer', 28), col('Payment method', 18), col('Total', 14), col('Paid', 14), col('Balance', 14), col('Delivery fee', 14), col('Delivery status', 16), col('Notes', 40)],
    rows: sales.map((s) => [s.date, s.id, customer(s.customerId), PAYMENT_LABEL[s.paymentMethod], m(s.total), m(s.paidAmount), m(s.total - s.paidAmount), s.delivery ? m(s.delivery.fee) : null, s.delivery?.status ?? '', s.notes ?? '']),
  })

  const saleLines = (): BookSheet => ({
    name: 'Sale lines',
    columns: [col('Date', 12), col('Reference', 38), col('Customer', 28), col('Product', 32), col('Qty', 10), col('Unit', 10), col('Unit price', 14), col('Line total', 14), col('Unit cost', 14), col('Line cost', 14), col('VAT', 10)],
    rows: sales.flatMap((s) =>
      s.lines.map((l): Cell[] => [
        s.date,
        s.id,
        customer(s.customerId),
        productName(l.productId),
        l.qty,
        l.unit,
        m(l.unitPrice),
        m(l.qty * l.unitPrice),
        m(l.unitCost),
        m(l.qty * l.unitCost),
        (l.vatExempt ?? product.get(l.productId)?.vatExempt ?? false) ? 'Exempt' : 'VATable',
      ]),
    ),
  })

  const status = (p: Purchase) => STATUS_LABEL[p.lines.every((l) => l.receivedQty >= l.qty) ? 'received' : p.lines.some((l) => l.receivedQty > 0) ? 'partial' : 'ordered']
  const purchasesSheet = (): BookSheet => ({
    name: 'Purchases',
    columns: [col('Date', 12), col('Reference', 38), col('Supplier', 28), col('Total', 14), col('Paid', 14), col('Balance', 14), col('Due date', 12), col('Status', 14), col('Notes', 40)],
    rows: purchases.map((p) => [p.date, p.id, supplier(p.supplierId), m(p.total), m(p.paidAmount), m(p.total - p.paidAmount), p.dueDate ?? '', status(p), p.notes ?? '']),
  })

  const purchaseLines = (): BookSheet => ({
    name: 'Purchase lines',
    columns: [col('Date', 12), col('Reference', 38), col('Supplier', 28), col('Product', 32), col('Qty', 10), col('Unit', 10), col('Unit cost', 14), col('Line total', 14), col('Received', 10), col('Lot no', 14), col('Expiry', 12)],
    rows: purchases.flatMap((p) => p.lines.map((l): Cell[] => [p.date, p.id, supplier(p.supplierId), productName(l.productId), l.qty, l.unit, m(l.unitCost), m(l.qty * l.unitCost), l.receivedQty, l.lotNo ?? '', l.expiryDate ?? ''])),
  })

  const paymentsSheet = (): BookSheet => ({
    name: 'Payments',
    columns: [col('Date', 12), col('Reference', 38), col('Kind', 24), col('Customer or supplier', 28), col('Amount', 14), col('Method', 14), col('For', 38), col('Note', 40)],
    rows: payments.map((p) => [
      p.date,
      p.id,
      p.kind === 'receivable' ? 'Collection from customer' : 'Payment to supplier',
      p.kind === 'receivable' ? customer(p.customerId) : supplier(p.supplierId ?? ''),
      m(p.amount),
      PAYMENT_LABEL[p.method],
      p.refId ?? '',
      p.note ?? '',
    ]),
  })

  const ledger = (): BookSheet => ({
    name: 'Ledger',
    columns: [col('Date', 12), col('Reference', 38), col('Kind', 14), col('Category', 24), col('Money in', 14), col('Money out', 14), col('Note', 40), col('Linked to', 38)],
    rows: transactions.map((t) => [t.date, t.id, KIND_LABEL[t.kind], t.category, MONEY_IN.has(t.kind) ? m(t.amount) : null, MONEY_IN.has(t.kind) ? null : m(t.amount), t.note ?? '', t.links.saleId ?? t.links.purchaseId ?? t.links.paymentId ?? '']),
  })

  // A customer's charges are the credit left on each sale up to the To date, settled oldest
  // first by the collections up to it (the rule of customerLedger and customerAging).
  const receivables = (): BookSheet => {
    const out: Cell[][] = []
    let charged = 0
    let collected = 0
    for (const c of [...rows.customers].sort((a, b) => a.name.localeCompare(b.name))) {
      const charges = rows.sales.filter((s) => s.customerId === c.id && s.total > s.paidAmount).sort(byDate)
      const total = round(charges.reduce((sum, s) => sum + s.total - s.paidAmount, 0))
      const paid = round(rows.payments.filter((p) => p.kind === 'receivable' && p.customerId === c.id).reduce((sum, p) => sum + p.amount, 0))
      const balance = round(total - paid)
      if (balance === 0) continue
      let credit = paid
      let oldest = ''
      for (const s of charges) {
        credit -= s.total - s.paidAmount
        if (credit < 0) {
          oldest = s.date
          break
        }
      }
      out.push([c.name, CUSTOMER_TYPE_LABEL[c.type], c.contact ?? '', m(total), m(paid), m(balance), oldest])
      charged += total
      collected += paid
    }
    out.push(['Total', '', '', m(charged), m(collected), m(charged - collected), ''])
    return { name: 'Receivables', columns: [col('Customer', 28), col('Type', 18), col('Contact', 20), col('Charged to date', 16), col('Collected to date', 16), col('Balance', 14), col('Oldest open charge', 18)], rows: out }
  }

  // A supplier's open purchases up to the To date after its payable payments up to it are
  // applied oldest first (the rule of paymentRepo.openPurchases).
  const payables = (): BookSheet => {
    const out: Cell[][] = []
    const totals = { total: 0, paid: 0, open: 0 }
    for (const s of [...rows.suppliers].sort((a, b) => a.name.localeCompare(b.name))) {
      let credit = rows.payments.filter((p) => p.kind === 'payable' && p.supplierId === s.id).reduce((sum, p) => sum + p.amount, 0)
      for (const p of rows.purchases.filter((p) => p.supplierId === s.id).sort(byDate)) {
        const owed = round(p.total - p.paidAmount)
        if (owed <= 0) continue
        const settled = Math.min(owed, credit)
        credit -= settled
        const open = round(owed - settled)
        if (open <= 0) continue
        out.push([s.name, p.id, p.date, p.dueDate ?? '', m(p.total), m(p.paidAmount), m(open)])
        totals.total += p.total
        totals.paid += p.paidAmount
        totals.open += open
      }
    }
    out.push(['Total', '', '', '', m(totals.total), m(totals.paid), m(totals.open)])
    return { name: 'Payables', columns: [col('Supplier', 28), col('Purchase', 38), col('Purchase date', 14), col('Due date', 12), col('Total', 14), col('Paid on order', 14), col('Open', 14)], rows: out }
  }

  const stock = (): BookSheet => {
    const v = inventoryValuation(rows.snapshots)
    return {
      name: 'Stock',
      columns: [col('Product', 32), col('Category', 18), col('Unit', 10), col('On hand', 12), col('Average cost', 14), col('Value at average', 16), col('Value at lot cost', 16)],
      rows: [...v.rows.map((r): Cell[] => [r.name, CATEGORY_DEFAULTS[r.category]?.label ?? r.category, r.unit, r.onHand, m(r.avgCost), m(r.atAverage), m(r.atCost)]), ['Total', '', '', null, null, m(v.total.atAverage), m(v.total.atCost)]],
    }
  }

  return [summary(), salesSheet(), saleLines(), purchasesSheet(), purchaseLines(), paymentsSheet(), ledger(), receivables(), payables(), stock()]
}
