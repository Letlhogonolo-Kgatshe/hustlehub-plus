import { Link } from 'react-router-dom'
import { formatPrice } from '../format'
import { styleFor } from '../categories'

export default function GigCard({ gig }) {
  const { bg, ink } = styleFor(gig.category)
  return (
    <article className="card gig-card">
      <div className="gig-cover" style={{ background: bg }}>
        <span className="gig-cover-word" aria-hidden="true" style={{ color: ink }}>
          {gig.category}
        </span>
        <span className="gig-pill">{gig.category}</span>
      </div>
      <div className="gig-body">
        <h2 className="gig-title">{gig.title}</h2>
        <p className="gig-desc">{gig.description}</p>
        <div className="gig-seller">
          <span className="avatar small" aria-hidden="true">{gig.freelancer.charAt(0)}</span>
          <span>{gig.freelancer}</span>
        </div>
        <div className="gig-footer">
          <span className="gig-price">{formatPrice(gig.price)}</span>
          <Link to={`/gigs/${gig.id}`} className="btn btn-primary" aria-label={`View ${gig.title}`}>
            View gig →
          </Link>
        </div>
      </div>
    </article>
  )
}