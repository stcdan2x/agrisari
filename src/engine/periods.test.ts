import { describe, expect, it } from 'vitest'
import { periodFor, periodLabel, periodParams, quickPeriods, resolvePeriod, shiftAnchor } from './periods'

const TODAY = '2026-09-30' // a Wednesday

describe('periodFor', () => {
  it('bounds each kind around the anchor: the day, the Monday-to-Sunday week, the month, the quarter, the year', () => {
    expect(periodFor('day', TODAY)).toEqual({ from: '2026-09-30', to: '2026-09-30' })
    expect(periodFor('week', TODAY)).toEqual({ from: '2026-09-28', to: '2026-10-04' })
    expect(periodFor('week', '2026-09-27')).toEqual({ from: '2026-09-21', to: '2026-09-27' }) // a Sunday closes its week
    expect(periodFor('month', TODAY)).toEqual({ from: '2026-09-01', to: '2026-09-30' })
    expect(periodFor('month', '2028-02-10')).toEqual({ from: '2028-02-01', to: '2028-02-29' })
    expect(periodFor('quarter', TODAY)).toEqual({ from: '2026-07-01', to: '2026-09-30' })
    expect(periodFor('quarter', '2026-10-01')).toEqual({ from: '2026-10-01', to: '2026-12-31' })
    expect(periodFor('year', TODAY)).toEqual({ from: '2026-01-01', to: '2026-12-31' })
  })
})

describe('shiftAnchor', () => {
  it('moves the anchor by whole periods, across month and year boundaries', () => {
    expect(shiftAnchor('day', TODAY, 1)).toBe('2026-10-01')
    expect(shiftAnchor('week', TODAY, -1)).toBe('2026-09-23')
    expect(shiftAnchor('month', '2026-01-31', -1)).toBe('2025-12-31')
    expect(shiftAnchor('month', '2026-01-31', 1)).toBe('2026-02-28')
    expect(shiftAnchor('quarter', TODAY, 1)).toBe('2026-12-30')
    expect(shiftAnchor('year', '2028-02-29', 1)).toBe('2029-02-28')
  })
})

describe('resolvePeriod', () => {
  it('defaults to the month of today with today as the anchor', () => {
    expect(resolvePeriod(new URLSearchParams(), TODAY)).toEqual({ kind: 'month', anchor: TODAY, period: { from: '2026-09-01', to: '2026-09-30' } })
  })
  it('reads the kind and the anchor from the query', () => {
    expect(resolvePeriod(new URLSearchParams('period=week&at=2026-09-15'), TODAY)).toEqual({
      kind: 'week',
      anchor: '2026-09-15',
      period: { from: '2026-09-14', to: '2026-09-20' },
    })
    expect(resolvePeriod(new URLSearchParams('period=year'), TODAY)).toEqual({ kind: 'year', anchor: TODAY, period: { from: '2026-01-01', to: '2026-12-31' } })
  })
  it('reads a custom range, ordering its bounds, and falls back to the month on a bad or missing bound', () => {
    expect(resolvePeriod(new URLSearchParams('period=custom&from=2026-08-15&to=2026-09-14'), TODAY)).toEqual({
      kind: 'custom',
      anchor: TODAY,
      period: { from: '2026-08-15', to: '2026-09-14' },
    })
    expect(resolvePeriod(new URLSearchParams('period=custom&from=2026-09-14&to=2026-08-15'), TODAY).period).toEqual({ from: '2026-08-15', to: '2026-09-14' })
    expect(resolvePeriod(new URLSearchParams('period=custom&from=2026-08-15'), TODAY)).toEqual({
      kind: 'month',
      anchor: TODAY,
      period: { from: '2026-09-01', to: '2026-09-30' },
    })
    expect(resolvePeriod(new URLSearchParams('period=custom&from=2026-02-30&to=2026-09-14'), TODAY).kind).toBe('month')
  })
  it('falls back to the month of today on an unknown kind or a bad anchor', () => {
    expect(resolvePeriod(new URLSearchParams('period=fortnight'), TODAY).kind).toBe('month')
    expect(resolvePeriod(new URLSearchParams('period=week&at=yesterday'), TODAY)).toEqual({
      kind: 'month',
      anchor: TODAY,
      period: { from: '2026-09-01', to: '2026-09-30' },
    })
  })
})

describe('periodParams', () => {
  it('writes the query the resolver reads back', () => {
    const roundTrip = (q: string) => resolvePeriod(new URLSearchParams(q), TODAY)
    const week = periodParams('week', '2026-09-15')
    expect(week).toBe('period=week&at=2026-09-15')
    expect(roundTrip(week).period).toEqual({ from: '2026-09-14', to: '2026-09-20' })
    const custom = periodParams('custom', TODAY, { from: '2026-08-15', to: '2026-09-14' })
    expect(custom).toBe('period=custom&from=2026-08-15&to=2026-09-14')
    expect(roundTrip(custom).period).toEqual({ from: '2026-08-15', to: '2026-09-14' })
    expect(periodParams('month', TODAY)).toBe('period=month&at=2026-09-30')
  })
})

describe('periodLabel', () => {
  it('names the period in full and in short', () => {
    expect(periodLabel('day', { from: TODAY, to: TODAY })).toEqual({ long: 'Wednesday 30 September 2026', short: '30 Sep' })
    expect(periodLabel('week', { from: '2026-09-28', to: '2026-10-04' })).toEqual({ long: 'Week of 28 September to 4 October 2026', short: 'wk 28 Sep' })
    expect(periodLabel('month', { from: '2026-09-01', to: '2026-09-30' })).toEqual({ long: 'September 2026', short: 'Sep 2026' })
    expect(periodLabel('quarter', { from: '2026-07-01', to: '2026-09-30' })).toEqual({ long: 'Q3 2026 (July to September)', short: 'Q3 2026' })
    expect(periodLabel('year', { from: '2026-01-01', to: '2026-12-31' })).toEqual({ long: '2026', short: '2026' })
    expect(periodLabel('custom', { from: '2026-08-15', to: '2026-09-14' })).toEqual({ long: '15 August to 14 September 2026', short: '15 Aug to 14 Sep' })
    expect(periodLabel('custom', { from: '2025-12-15', to: '2026-01-14' })).toEqual({ long: '15 December 2025 to 14 January 2026', short: '15 Dec to 14 Jan' })
  })
})

describe('quickPeriods', () => {
  it('offers this and last month, this and last quarter, and this year around today', () => {
    expect(quickPeriods(TODAY)).toEqual([
      { label: 'This month', from: '2026-09-01', to: '2026-09-30' },
      { label: 'Last month', from: '2026-08-01', to: '2026-08-31' },
      { label: 'This quarter', from: '2026-07-01', to: '2026-09-30' },
      { label: 'Last quarter', from: '2026-04-01', to: '2026-06-30' },
      { label: 'This year', from: '2026-01-01', to: '2026-12-31' },
    ])
  })
  it('crosses the year boundary in January and the leap day in March', () => {
    expect(quickPeriods('2027-01-15').slice(1, 4)).toEqual([
      { label: 'Last month', from: '2026-12-01', to: '2026-12-31' },
      { label: 'This quarter', from: '2027-01-01', to: '2027-03-31' },
      { label: 'Last quarter', from: '2026-10-01', to: '2026-12-31' },
    ])
    expect(quickPeriods('2028-03-31')[1]).toEqual({ label: 'Last month', from: '2028-02-01', to: '2028-02-29' })
  })
})
