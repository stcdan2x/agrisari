import { addDays, addMonths, differenceInCalendarDays, endOfMonth, format, isValid, parseISO } from 'date-fns'
import type { ISODate } from '../types'

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
export const isISODate = (d: string): boolean => ISO_DATE.test(d) && isValid(parseISO(d))
export const toISODate = (d: Date): ISODate => format(d, 'yyyy-MM-dd')
export const todayISO = (): ISODate => toISODate(new Date())
export const plusDays = (date: ISODate, n: number): ISODate => toISODate(addDays(parseISO(date), n))
// Calendar days from `from` to `to`; negative when `to` is earlier.
export const daysBetween = (from: ISODate, to: ISODate): number => differenceInCalendarDays(parseISO(to), parseISO(from))
// 'YYYY-MM' of a date, and the first and last day of such a month.
export const monthOf = (date: ISODate): string => date.slice(0, 7)
export const monthRange = (month: string): { from: ISODate; to: ISODate } => {
  const from = `${month}-01`
  return { from, to: toISODate(endOfMonth(parseISO(from))) }
}
export const nextMonth = (month: string): string => format(addMonths(parseISO(`${month}-01`), 1), 'yyyy-MM')
