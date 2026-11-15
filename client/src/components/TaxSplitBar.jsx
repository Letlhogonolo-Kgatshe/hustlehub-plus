import { useState } from 'react'
import { formatPrice } from '../format'
import { percent } from '../incomeChart'

// a share is printed inside its block only when the block is wide enough to hold it
const LABEL_MIN_SHARE = 0.12

// One bar for the whole amount earned, split into what the freelancer keeps and the
// tax the server estimates. Every amount comes from GET /api/income.
export default function TaxSplitBar({ total, estimatedTax, net, taxYear }) {
  const [active, setActive] = useState(null)
  const parts = [
    { key: 'net', name: 'Take-home', amount: net },
    { key: 'tax', name: 'Estimated tax', amount: estimatedTax },
  ]
  const shown = parts.filter((p) => p.amount > 0)
  const year = taxYear ? ` for the ${taxYear} tax year` : ''
  const summary = estimatedTax > 0
    ? `You keep ${percent(net, total)} of what you earned. The server estimates ${percent(estimatedTax, total)} tax${year}.`
    : `No tax is estimated on your income so far${year}.`

  return (
    <figure className="card chart-card">
      <figcaption className="chart-head">
        <h2 className="chart-title">Income against tax</h2>
        <p className="chart-sub">{summary}</p>
      </figcaption>

      <div className="split-bar" role="list" aria-label="Income against tax">
        {shown.map((p) => (
          <div
            key={p.key}
            role="listitem"
            className={`split-part part-${p.key}${active === p.key ? ' active' : ''}`}
            style={{ flexGrow: p.amount }}
            tabIndex={0}
            aria-label={`${p.name}: ${formatPrice(p.amount)} (${percent(p.amount, total)})`}
            onMouseEnter={() => setActive(p.key)}
            onMouseLeave={() => setActive(null)}
            onFocus={() => setActive(p.key)}
            onBlur={() => setActive(null)}
          >
            {p.amount / total >= LABEL_MIN_SHARE && (
              <span className="split-share" aria-hidden="true">{percent(p.amount, total)}</span>
            )}
            {active === p.key && (
              <span className={`chart-tip${p.key === 'net' ? ' tip-start' : ' tip-end'}`} aria-hidden="true">
                <strong>{formatPrice(p.amount)}</strong>
                <span>{p.name} · {percent(p.amount, total)}</span>
              </span>
            )}
          </div>
        ))}
      </div>

      <ul className="chart-legend" aria-hidden="true">
        {parts.map((p) => (
          <li key={p.key}><span className={`legend-swatch part-${p.key}`} />{p.name}</li>
        ))}
      </ul>
    </figure>
  )
}
