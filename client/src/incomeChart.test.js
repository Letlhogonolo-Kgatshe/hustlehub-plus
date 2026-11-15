import { describe, it, expect } from 'vitest'
import { axisRand, currentMonthKey, fillMonths, monthLong, monthShort, niceTicks, percent } from './incomeChart'

describe('fillMonths', () => {
  it('sorts the months and puts back missing ones as zero', () => {
    const filled = fillMonths([
      { month: '2026-11', total: 6400, count: 1 },
      { month: '2026-08', total: 16900, count: 4 },
    ])
    expect(filled.map((m) => m.month)).toEqual(['2026-08', '2026-09', '2026-10', '2026-11'])
    expect(filled[1]).toEqual({ month: '2026-09', total: 0, count: 0 })
  })

  it('crosses into the next year', () => {
    const filled = fillMonths([{ month: '2026-12', total: 1, count: 1 }, { month: '2027-02', total: 2, count: 1 }])
    expect(filled.map((m) => m.month)).toEqual(['2026-12', '2027-01', '2027-02'])
  })

  it('keeps only the latest 12 months', () => {
    const filled = fillMonths([{ month: '2025-01', total: 1, count: 1 }, { month: '2026-02', total: 2, count: 1 }])
    expect(filled).toHaveLength(12)
    expect(filled[0].month).toBe('2025-03')
  })

  it('returns nothing for no months', () => {
    expect(fillMonths([])).toEqual([])
  })
})

describe('niceTicks', () => {
  it('rounds the axis up to a clean step', () => {
    expect(niceTicks(25600)).toEqual([0, 10000, 20000, 30000])
    expect(niceTicks(10000)).toEqual([0, 2500, 5000, 7500, 10000])
  })

  it('has a single tick when nothing was earned', () => {
    expect(niceTicks(0)).toEqual([0])
  })
})

describe('labels', () => {
  it('writes rand axis labels in full below 10 000 and compact above', () => {
    expect(axisRand(0, true)).toBe('R 0')
    expect(axisRand(7500, false)).toMatch(/^R 7\s500$/)
    expect(axisRand(30000, true)).toBe('R 30k')
    expect(axisRand(2500, true)).toBe('R 2,5k')
  })

  it('gives the month a date falls in, in UTC like the server', () => {
    expect(currentMonthKey(new Date('2026-11-08T10:00:00Z'))).toBe('2026-11')
    expect(currentMonthKey(new Date('2027-01-31T23:30:00Z'))).toBe('2027-01')
  })

  it('names months', () => {
    expect(monthShort('2026-06')).toBe('Jun')
    expect(monthLong('2026-06')).toBe('June 2026')
  })

  it('shows shares as whole percentages, never 0% for a part that exists', () => {
    expect(percent(10, 100)).toBe('10%')
    expect(percent(1, 1000)).toBe('<1%')
    expect(percent(0, 100)).toBe('0%')
    expect(percent(5, 0)).toBe('0%')
  })
})
