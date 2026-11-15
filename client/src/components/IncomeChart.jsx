import { useState } from 'react'
import { formatPrice } from '../format'
import { axisRand, monthLong, monthShort, niceTicks } from '../incomeChart'

const bookingsText = (count) => (count === 0 ? 'no paid bookings' : count === 1 ? '1 paid booking' : `${count} paid bookings`)

// Column chart of what the server says was earned each month.
// months: [{ month: '2026-06', total, count }], already filled and in order.
export default function IncomeChart({ months }) {
  const [active, setActive] = useState(null)
  const ticks = niceTicks(Math.max(...months.map((m) => m.total)))
  const top = ticks[ticks.length - 1]
  const compact = top >= 10000
  const height = (value) => `${top > 0 ? (value / top) * 100 : 0}%`
  const best = months.reduce((a, b) => (b.total > a.total ? b : a))
  const first = months[0].month
  const last = months[months.length - 1].month
  const range = first === last ? monthLong(first) : `${monthLong(first)} to ${monthLong(last)}`

  return (
    <figure className="card chart-card">
      <figcaption className="chart-head">
        <h2 className="chart-title">Income per month</h2>
        <p className="chart-sub">
          {range}. Best month: {monthLong(best.month)}, {formatPrice(best.total)}.
        </p>
      </figcaption>

      <div className="col-chart">
        <div className="col-axis" aria-hidden="true">
          {ticks.map((t) => (
            <span key={t} className="col-tick" style={{ bottom: height(t) }}>{axisRand(t, compact)}</span>
          ))}
        </div>
        <div className="col-plot" role="list" aria-label="Income per month">
          {ticks.map((t) => (
            <span key={t} className="col-grid" style={{ bottom: height(t) }} aria-hidden="true" />
          ))}
          {months.map((m, i) => (
            <div
              key={m.month}
              role="listitem"
              className="col-slot"
              tabIndex={0}
              aria-label={`${monthLong(m.month)}: ${formatPrice(m.total)}, ${bookingsText(m.count)}`}
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
            >
              <span
                className={`col-bar${m.total > 0 ? ' has-value' : ''}${active === i ? ' active' : ''}`}
                style={{ height: height(m.total) }}
                aria-hidden="true"
              />
              {active === i && (
                <span
                  className={`chart-tip${i === 0 ? ' tip-start' : ''}${i === months.length - 1 ? ' tip-end' : ''}`}
                  style={{ bottom: `calc(${height(m.total)} + 10px)` }}
                  aria-hidden="true"
                >
                  <strong>{formatPrice(m.total)}</strong>
                  <span>{monthLong(m.month)} · {bookingsText(m.count)}</span>
                </span>
              )}
            </div>
          ))}
        </div>
        <div className={`col-labels${months.length > 6 ? ' dense' : ''}`} aria-hidden="true">
          {months.map((m) => <span key={m.month}>{monthShort(m.month)}</span>)}
        </div>
      </div>

      <details className="chart-table">
        <summary>Show the numbers</summary>
        <table className="mini-table">
          <caption className="sr-only">Income per month</caption>
          <thead>
            <tr>
              <th scope="col">Month</th>
              <th scope="col" className="num-head">Paid bookings</th>
              <th scope="col" className="num-head">Earned</th>
            </tr>
          </thead>
          <tbody>
            {months.map((m) => (
              <tr key={m.month}>
                <th scope="row">{monthLong(m.month)}</th>
                <td className="num">{m.count}</td>
                <td className="num">{formatPrice(m.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  )
}
