import { NavLink, Link, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../useAuth'
import { api } from '../api'

const LINKS = {
  client: [
    { to: '/', label: 'Browse', end: true },
    { to: '/my-bookings', label: 'My bookings' },
  ],
  freelancer: [
    { to: '/my-gigs', label: 'My gigs' },
    { to: '/income', label: 'Bookings and income' },
  ],
}
const HOME = { client: '/', freelancer: '/my-gigs' }

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const links = (user && LINKS[user.role]) || []
  const home = (user && HOME[user.role]) || '/'
  const displayName = user?.name || user?.email || 'Account'
  const roleLabel = user ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : ''

  function handleLogout() {
    // end the session on the server too; the token is read before logout() clears it,
    // and the page does not wait for the reply
    api('/api/logout', { method: 'POST' }).catch(() => {})
    logout()
    navigate('/login')
  }

  return (
    <>
      <header className="site-header">
        <div className="container header-inner">
          <Link to={home} className="brand" aria-label="HustleHub+ home">
            <span className="brand-mark" aria-hidden="true">H</span>
            <span className="brand-name">HustleHub<span className="brand-plus">+</span></span>
          </Link>

          <nav className="nav" aria-label="Main">
            {links.map((l) => (
              <NavLink key={l.to} to={l.to} end={l.end} className="nav-link">
                {l.label}
              </NavLink>
            ))}
          </nav>

          {user ? (
            <div className="header-user">
              <div className="user-chip">
                <span className="avatar" aria-hidden="true">{displayName.charAt(0).toUpperCase()}</span>
                <span className="user-text">
                  <span className="user-name">{displayName}</span>
                  <span className="user-role">{roleLabel}</span>
                </span>
              </div>
              <button type="button" className="btn" onClick={handleLogout}>Logout</button>
            </div>
          ) : (
            <div className="header-user">
              <Link to="/login" className="btn btn-primary">Log in</Link>
              <Link to="/register" className="btn">Sign up</Link>
            </div>
          )}
        </div>
      </header>

      <main className="container page">
        <Outlet />
      </main>
    </>
  )
}