// Display helpers for the income dashboard charts.
// They only arrange and label numbers the server sent; nothing here adds up money.

const MONTH_SHORT = new Intl.DateTimeFormat('en-ZA', { month: 'short', timeZone: 'UTC' })
const MONTH_LONG = new Intl.DateTimeFormat('en-ZA', { month: 'long', year: 'numeric', timeZone: 'UTC' })
const WHOLE = new Intl.NumberFormat('en-ZA', { maximumFractionDigits: 0 })
const THOUSANDS = new Intl.NumberFormat('en-ZA', { maximumFractionDigits: 1 })

export const MAX_MONTHS = 12

// '2026-06' -> a Date at midnight UTC on the 1st
function monthStart(key) {
  const [year, month] = key.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, 1))
}

function monthKey(date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
}

// The month a date falls in, in UTC like the server: '2026-11'
export const currentMonthKey = (date = new Date()) => monthKey(date)

// '2026-06' -> 'Jun'
export const monthShort = (key) => MONTH_SHORT.format(monthStart(key))

// '2026-06' -> 'June 2026'
export const monthLong = (key) => MONTH_LONG.format(monthStart(key))

// The server may leave out months with no income. Put them back as zero so the
// columns stay evenly spaced in time, then keep the latest MAX_MONTHS.
export function fillMonths(monthly) {
  if (monthly.length === 0) return []
  const byKey = new Map(monthly.map((m) => [m.month, m]))
  const keys = [...byKey.keys()].sort()
  const out = []
  for (let d = monthStart(keys[0]); monthKey(d) <= keys[keys.length - 1]; d.setUTCMonth(d.getUTCMonth() + 1)) {
    const key = monthKey(d)
    out.push(byKey.get(key) ?? { month: key, total: 0, count: 0 })
  }
  return out.slice(-MAX_MONTHS)
}

// Clean axis ticks from 0 to just above max, about four steps (0, 5 000, 10 000, ...)
export function niceTicks(max, steps = 4) {
  if (!(max > 0)) return [0]
  const rough = max / steps
  const power = 10 ** Math.floor(Math.log10(rough))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * power).find((s) => s >= rough)
  const ticks = []
  for (let i = 0; i * step < max + step; i++) ticks.push(i * step)
  return ticks
}

// Axis label in rand: in full below 10 000 (R 2 500), compact from there (R 10k)
export function axisRand(value, compact) {
  if (value === 0) return 'R 0'
  return compact ? `R ${THOUSANDS.format(value / 1000)}k` : `R ${WHOLE.format(value)}`
}

// A share of the whole as a whole percentage, never showing 0% for a part that exists
export function percent(part, whole) {
  if (!(whole > 0) || part <= 0) return '0%'
  const pct = Math.round((part / whole) * 100)
  return pct === 0 ? '<1%' : `${pct}%`
}
