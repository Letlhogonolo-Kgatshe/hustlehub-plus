import { useEffect, useState } from 'react'
import { fetchGigs } from '../gigsApi'
import GigCard from '../components/GigCard'
import Notice from '../components/Notice'

export default function BrowsePage() {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('loading') // loading | ready | error
  const [gigs, setGigs] = useState([])
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    fetchGigs(query)
      .then((data) => {
        if (!cancelled) { setGigs(data); setStatus('ready') }
      })
      .catch(() => {
        if (!cancelled) setStatus('error')
      })
    return () => { cancelled = true }
  }, [query, attempt])

  function handleSearch(e) {
    setQuery(e.target.value)
    setStatus('loading')
  }

  function reload(nextQuery) {
    setQuery(nextQuery)
    setAttempt((n) => n + 1)
    setStatus('loading')
  }

  return (
    <>
      <section className="hero">
        <span className="chip">Browse gigs</span>
        <h1 className="hero-title">Find someone who gets it done.</h1>
        <p className="hero-sub">
          Design, video, web, writing and more from freelancers who are ready to start.
        </p>
        <div className="search-wrap">
          <label htmlFor="gig-search" className="search-label">Search gigs</label>
          <div className="search card">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#17142B"
                 strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" />
            </svg>
            <input
              id="gig-search"
              type="search"
              value={query}
              onChange={handleSearch}
              maxLength={100}
              placeholder="Try logo, video, copywriting..."
              autoComplete="off"
            />
          </div>
        </div>
      </section>

      <section aria-label="Gig results">
        {status === 'loading' && (
          <div role="status">
            <p className="count">Loading gigs...</p>
            <div className="gig-grid">
              <div className="skeleton" />
              <div className="skeleton" />
              <div className="skeleton" />
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="stack">
            <Notice kind="error">We could not load the gigs. Check your connection and try again.</Notice>
            <button type="button" className="btn btn-primary" onClick={() => reload(query)}>
              Try again
            </button>
          </div>
        )}

        {status === 'ready' && gigs.length === 0 && (
          <div className="empty">
            <h2>Nothing here yet</h2>
            <p>No gigs match that search. Try a shorter word or a different category name.</p>
            <button type="button" className="btn btn-secondary" onClick={() => reload('')}>
              Clear search
            </button>
          </div>
        )}

        {status === 'ready' && gigs.length > 0 && (
          <>
            <p className="count" aria-live="polite">
              {gigs.length} {gigs.length === 1 ? 'gig' : 'gigs'}
            </p>
            <div className="gig-grid">
              {gigs.map((gig) => <GigCard key={gig.id} gig={gig} />)}
            </div>
          </>
        )}
      </section>
    </>
  )
}