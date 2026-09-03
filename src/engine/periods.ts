import {
  addDays,
  addMonths,
  addQuarters,
  addWeeks,
  addYears,
  endOfMonth,
  endOfQuarter,
  endOfWeek,
  endOfYear,
  format,
  getQuarter,
  parseISO,
  startOfMonth,
  startOfQuarter,
  startOfWeek,
  startOfYear,
} from 'date-fns'
import type { ISODate } from '../types'
import { isISODate, monthRange, toISODate } from './dates'
import type { Period } from './finance'

// The dashboard period (P8 design decision 3): one query parameter set shared by the tiles and
// the charts. `period` is the kind, `at` the anchor day inside it, or `from` and `to` for a
// custom range; anything unreadable falls back to the month of today. Weeks run Monday to
// Sunday.
export type PeriodKind = 'day' | 'week' | 'month' | 'quarter' | 'year' | 'custom'
export const PERIOD_KINDS: { kind: PeriodKind; label: string }[] = [
  { kind: 'day', label: 'Day' },
  { kind: 'week', label: 'Week' },
  { kind: 'month', label: 'Month' },
  { kind: 'quarter', label: 'Quarter' },
  { kind: 'year', label: 'Year' },
  { kind: 'custom', label: 'Custom' },
]
export type AnchoredKind = Exclude<PeriodKind, 'custom'>

export interface ResolvedPeriod {
  kind: PeriodKind
  anchor: ISODate
  period: Period
}

const WEEK = { weekStartsOn: 1 } as const

export function periodFor(kind: AnchoredKind, anchor: ISODate): Period {
  const d = parseISO(anchor)
  switch (kind) {
    case 'day':
      return { from: anchor, to: anchor }
    case 'week':
      return { from: toISODate(startOfWeek(d, WEEK)), to: toISODate(endOfWeek(d, WEEK)) }
    case 'month':
      return { from: toISODate(startOfMonth(d)), to: toISODate(endOfMonth(d)) }
    case 'quarter':
      return { from: toISODate(startOfQuarter(d)), to: toISODate(endOfQuarter(d)) }
    case 'year':
      return { from: toISODate(startOfYear(d)), to: toISODate(endOfYear(d)) }
  }
}

// The anchor moved n periods on (negative for back).
export function shiftAnchor(kind: AnchoredKind, anchor: ISODate, n: number): ISODate {
  const d = parseISO(anchor)
  switch (kind) {
    case 'day':
      return toISODate(addDays(d, n))
    case 'week':
      return toISODate(addWeeks(d, n))
    case 'month':
      return toISODate(addMonths(d, n))
    case 'quarter':
      return toISODate(addQuarters(d, n))
    case 'year':
      return toISODate(addYears(d, n))
  }
}

const isKind = (s: string | null): s is PeriodKind => PERIOD_KINDS.some((k) => k.kind === s)

export function resolvePeriod(params: URLSearchParams, today: ISODate): ResolvedPeriod {
  const fallback: ResolvedPeriod = { kind: 'month', anchor: today, period: monthRange(today.slice(0, 7)) }
  const kind = params.get('period')
  if (!isKind(kind)) return fallback
  if (kind === 'custom') {
    const from = params.get('from')
    const to = params.get('to')
    if (!from || !to || !isISODate(from) || !isISODate(to)) return fallback
    return { kind, anchor: today, period: from <= to ? { from, to } : { from: to, to: from } }
  }
  const at = params.get('at') ?? today
  if (!isISODate(at)) return fallback
  return { kind, anchor: at, period: periodFor(kind, at) }
}

// The query string resolvePeriod reads back.
export function periodParams(kind: PeriodKind, anchor: ISODate, custom?: Period): string {
  const p = new URLSearchParams()
  p.set('period', kind)
  if (kind === 'custom') {
    const range = custom ?? { from: anchor, to: anchor }
    p.set('from', range.from)
    p.set('to', range.to)
  } else p.set('at', anchor)
  return p.toString()
}

const day = (d: ISODate, f: string) => format(parseISO(d), f)

export function periodLabel(kind: PeriodKind, { from, to }: Period): { long: string; short: string } {
  switch (kind) {
    case 'day':
      return { long: day(from, 'EEEE d MMMM yyyy'), short: day(from, 'd MMM') }
    case 'week':
      return { long: `Week of ${day(from, 'd MMMM')} to ${day(to, 'd MMMM yyyy')}`, short: `wk ${day(from, 'd MMM')}` }
    case 'month':
      return { long: day(from, 'MMMM yyyy'), short: day(from, 'MMM yyyy') }
    case 'quarter':
      return {
        long: `Q${getQuarter(parseISO(from))} ${day(from, 'yyyy')} (${day(from, 'MMMM')} to ${day(to, 'MMMM')})`,
        short: `Q${getQuarter(parseISO(from))} ${day(from, 'yyyy')}`,
      }
    case 'year':
      return { long: day(from, 'yyyy'), short: day(from, 'yyyy') }
    case 'custom': {
      const sameYear = from.slice(0, 4) === to.slice(0, 4)
      return { long: `${day(from, sameYear ? 'd MMMM' : 'd MMMM yyyy')} to ${day(to, 'd MMMM yyyy')}`, short: `${day(from, 'd MMM')} to ${day(to, 'd MMM')}` }
    }
  }
}
