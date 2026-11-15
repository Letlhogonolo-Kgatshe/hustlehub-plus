import { useEffect, useState } from 'react'
import { fetchBookings, fetchIncome } from '../bookingsApi'
import { formatPrice, formatDate, shortRef, statusLabel } from '../format'
import { currentMonthKey, fillMonths } from '../incomeChart'
import Notice from '../components/Notice'
import StatusChip from '../components/StatusChip'
import IncomeChart from '../components/IncomeChart'
import TaxSplitBar from '../components/TaxSplitBar'

const EMPTY = { bookings: [], totalBookings: 0, income: null }

// Older API versions send no tax fields; the dashboard then shows the totals only.
const hasTax = (income) => typeof income.estimatedTax === 'number' && typeof income.net === 'number'

export default function IncomePage() {
  const [state, setState] = useState({ status: 'loading', ...EMPTY })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    Promise.all([fetchBookings(), fetchIncome()])
      .then(([{ bookings, total }, income]) => {
        if (!cancelled) setState({ status: 'ready', bookings, totalBookings: total, income })
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'error', ...EMPTY })
      })
    return () => { cancelled = true }
  }, [attempt])

  function retry() {
    setState({ status: 'loading', ...EMPTY })
    setAttempt((n) => n + 1)
  }

  const { status, bookings, totalBookings, income } = state
  // the server sends every month of the tax year; months still to come are left off the chart
  const thisMonth = currentMonthKey()
  const months = Array.isArray(income?.monthly)
    ? fillMonths(income.monthly.filter((m) => m.month <= thisMonth))
    : null
  const earnedAny = months !== null && months.some((m) => m.total > 0)
  // tax and take-home are worked out on this tax year's income, while total is all-time
  const taxedIncome = income?.taxYearIncome ?? income?.total

  return (
    <>
      <header className="page-head">
        <span className="chip">Freelancer</span>
        <h1 className="page-title">Bookings and income</h1>
        <p className="page-sub">What you have earned, the tax the server estimates, and who booked your gigs.</p>
      </header>

      {status === 'loading' && <p role="status" className="count">Loading your bookings...</p>}

      {status === 'error' && (
        <div className="stack">
          <Notice kind="error">We could not load your bookings and income. Check your connection and try again.</Notice>
          <button type="button" className="btn btn-primary" onClick={retry}>Try again</button>
        </div>
      )}

      {status === 'ready' && (
        <>
          {/* every amount comes from the server; the page never adds amounts up itself */}
          <section className="summary-grid" aria-label="Income summary">
            <div className="card summary-card lime">
              <span className="summary-label">Total earned</span>
              <span className="summary-value">{formatPrice(income.total)}</span>
            </div>
            {hasTax(income) && (
              <>
                <div className="card summary-card">
                  <span className="summary-label">Estimated tax</span>
                  <span className="summary-value">{formatPrice(income.estimatedTax)}</span>
                  <span className="summary-note">
                    {income.taxYear ? `Estimate for the ${income.taxYear} tax year` : 'Estimate'}
                  </span>
                </div>
                <div className="card summary-card">
                  <span className="summary-label">Take-home</span>
                  <span className="summary-value">{formatPrice(income.net)}</span>
                  <span className="summary-note">
                    {income.taxYear ? `${income.taxYear} income after estimated tax` : 'After estimated tax'}
                  </span>
                </div>
              </>
            )}
            <div className="card summary-card">
              <span className="summary-label">Paid bookings</span>
              <span className="summary-value">{income.count}</span>
            </div>
          </section>
          <p className="count">
            Payments are simulated, so no real money has moved.
            {hasTax(income) && ' The tax figure is an estimate, not tax advice.'}
          </p>

          {months !== null && (
            earnedAny ? (
              <section className="chart-stack" aria-label="Income charts">
                <IncomeChart months={months} />
                {hasTax(income) && taxedIncome > 0 && (
                  <TaxSplitBar total={taxedIncome} estimatedTax={income.estimatedTax} net={income.net} taxYear={income.taxYear} />
                )}
              </section>
            ) : (
              <div className="empty chart-empty">
                <h2>No income yet</h2>
                <p>Your income charts appear here after your first paid booking.</p>
              </div>
            )
          )}

          <section aria-label="Bookings">
            <h2 className="section-title">Bookings</h2>
            {bookings.length === 0 ? (
              <div className="empty">
                <h2>No bookings yet</h2>
                <p>Once a client books one of your gigs it shows up here.</p>
              </div>
            ) : (
              <>
                {totalBookings > bookings.length && (
                  <p className="count">Showing the newest {bookings.length} of {totalBookings} bookings.</p>
                )}
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th scope="col">Reference</th>
                        <th scope="col">Transaction</th>
                        <th scope="col">Booked</th>
                        <th scope="col">Gig</th>
                        <th scope="col">Client</th>
                        <th scope="col">Status</th>
                        <th scope="col" className="num-head">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bookings.map((b) => (
                        <tr key={b.id}>
                          <td className="muted-strong nowrap" title={b.id}>{shortRef('HH', b.id)}</td>
                          <td className="muted-strong nowrap" title={b.transaction?.id}>
                            {b.transaction ? shortRef('TX', b.transaction.id) : '-'}
                          </td>
                          <td className="nowrap">{formatDate(b.createdAt)}</td>
                          <td><strong>{b.gig.title}</strong></td>
                          <td>{b.client ? b.client.email : 'Unknown client'}</td>
                          <td><StatusChip status={statusLabel(b.status)} /></td>
                          <td className="num">{formatPrice(b.price)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>
        </>
      )}
    </>
  )
}
