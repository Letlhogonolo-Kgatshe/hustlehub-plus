import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchBookings } from '../bookingsApi'
import { formatPrice, formatDate, shortRef, statusLabel } from '../format'
import Notice from '../components/Notice'
import StatusChip from '../components/StatusChip'

export default function MyBookingsPage() {
  const [state, setState] = useState({ status: 'loading', bookings: [], total: 0 })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    // the server only returns this client's bookings, based on the login token
    fetchBookings()
      .then(({ bookings, total }) => { if (!cancelled) setState({ status: 'ready', bookings, total }) })
      .catch(() => { if (!cancelled) setState({ status: 'error', bookings: [], total: 0 }) })
    return () => { cancelled = true }
  }, [attempt])

  function retry() {
    setState({ status: 'loading', bookings: [], total: 0 })
    setAttempt((n) => n + 1)
  }

  return (
    <>
      <header className="page-head">
        <span className="chip">Client</span>
        <h1 className="page-title">My bookings</h1>
        <p className="page-sub">Everything you have booked, in one place.</p>
      </header>

      {state.status === 'loading' && <p role="status" className="count">Loading your bookings...</p>}

      {state.status === 'error' && (
        <div className="stack">
          <Notice kind="error">We could not load your bookings. Check your connection and try again.</Notice>
          <button type="button" className="btn btn-primary" onClick={retry}>Try again</button>
        </div>
      )}

      {state.status === 'ready' && state.bookings.length === 0 && (
        <div className="empty">
          <h2>No bookings yet</h2>
          <p>When you book a gig it will show up here.</p>
          <Link to="/" className="btn btn-primary">Browse gigs</Link>
        </div>
      )}

      {state.status === 'ready' && state.bookings.length > 0 && (
        <>
          {state.total > state.bookings.length && (
            <p className="count">Showing your newest {state.bookings.length} of {state.total} bookings.</p>
          )}
          <div className="booking-list">
            {state.bookings.map((b) => {
              const freelancer = b.freelancer ? b.freelancer.email : 'Unknown freelancer'
              return (
                <article key={b.id} className="card booking-row">
                  <div className="booking-main">
                    <span className="booking-meta">
                      {shortRef('HH', b.id)}
                      {b.transaction && ` · ${shortRef('TX', b.transaction.id)}`}
                      {` · Booked ${formatDate(b.createdAt)}`}
                    </span>
                    <h2 className="booking-title">{b.gig.title}</h2>
                    <div className="booking-seller">
                      <span className="avatar small" aria-hidden="true">{freelancer.charAt(0).toUpperCase()}</span>
                      <span>{freelancer}</span>
                    </div>
                  </div>
                  <StatusChip status={statusLabel(b.status)} />
                  <span className="booking-price">{formatPrice(b.price)}</span>
                </article>
              )
            })}
          </div>
        </>
      )}
    </>
  )
}
