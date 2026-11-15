import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { fetchGig, bookGig } from '../gigsApi'
import { formatPrice } from '../format'
import { styleFor } from '../categories'
import Notice from '../components/Notice'

export default function GigDetailPage() {
  const { id } = useParams()
  const [state, setState] = useState({ status: 'loading', gig: null }) // loading | ready | notfound | error
  const [booking, setBooking] = useState({ status: 'idle', result: null, message: '' }) // idle | working | done | failed

  useEffect(() => {
    let cancelled = false
    fetchGig(id)
      .then((gig) => {
        if (!cancelled) setState({ status: 'ready', gig })
      })
      .catch((err) => {
        if (!cancelled) setState({ status: err.status === 404 ? 'notfound' : 'error', gig: null })
      })
    return () => { cancelled = true }
  }, [id])

  async function handleBook() {
    setBooking({ status: 'working', result: null, message: '' })
    try {
      const result = await bookGig(id)
      setBooking({ status: 'done', result, message: '' })
    } catch (err) {
      const message = err.status === 429
        ? 'Too many booking attempts. Please wait a minute before trying again.'
        : err.message
      setBooking({ status: 'failed', result: null, message })
    }
  }

  if (state.status === 'loading') {
    return <p role="status" className="count">Loading gig...</p>
  }

  if (state.status !== 'ready') {
    const text = state.status === 'notfound'
      ? 'We could not find that gig. It may have been removed.'
      : 'We could not load this gig. Check your connection and try again.'
    return (
      <div className="stack">
        <Notice kind="error">{text}</Notice>
        <Link to="/" className="btn btn-secondary">Back to browse</Link>
      </div>
    )
  }

  const { gig } = state
  const { bg, ink } = styleFor(gig.category)

  return (
    <>
      <Link to="/" className="back-link">← Back to browse</Link>
      <div className="detail">
        <article className="detail-main">
          <div className="detail-cover" style={{ background: bg }}>
            <span className="gig-cover-word" aria-hidden="true" style={{ color: ink }}>
              {gig.category}
            </span>
            <span className="gig-pill">{gig.category}</span>
          </div>
          <h1 className="detail-title">{gig.title}</h1>
          <div className="gig-seller seller-detail">
            <span className="avatar" aria-hidden="true">{gig.freelancer.charAt(0)}</span>
            <span>{gig.freelancer}</span>
          </div>
          <div className="card about">
            <h2>About this gig</h2>
            <p>{gig.description}</p>
          </div>
        </article>

        <aside className="card book-panel">
          {booking.status === 'done' ? (
            <>
              <Notice kind="success">
                Booking confirmed. {gig.freelancer} can now see your request.
              </Notice>
              <div className="receipt">
                <span className="receipt-label">Booking reference</span>
                <span className="receipt-value">{booking.result.reference}</span>
                <span className="receipt-label">Transaction record</span>
                <span className="receipt-value">{booking.result.transactionId}</span>
                <span className="book-note">
                  {formatPrice(gig.price)} recorded. Payment is simulated, so no money moves.
                </span>
              </div>
              <Link to="/my-bookings" className="btn btn-primary">See my bookings</Link>
            </>
          ) : (
            <>
              <span className="receipt-label">Price</span>
              <span className="book-price">{formatPrice(gig.price)}</span>
              {booking.status === 'failed' && <Notice kind="error">{booking.message}</Notice>}
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleBook}
                disabled={booking.status === 'working'}
              >
                {booking.status === 'working' ? 'Booking...' : 'Book this gig'}
              </button>
              <p className="book-note">
                Payment is simulated in this project. You will see a confirmation straight away.
              </p>
            </>
          )}
        </aside>
      </div>
    </>
  )
}