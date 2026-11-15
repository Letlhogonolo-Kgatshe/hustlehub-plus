import { Link } from 'react-router-dom'
import { useAuth } from '../useAuth'
import Notice from '../components/Notice'

export default function ForbiddenPage() {
  const { user } = useAuth()
  const home = user?.role === 'freelancer' ? '/my-gigs' : user ? '/' : '/login'

  return (
    <div className="forbidden">
      <div className="forbidden-code" aria-hidden="true">403</div>
      <section className="stack">
        <h1 className="page-title">This page is not for your account.</h1>
        <p className="page-sub">You are logged in with a role that cannot open this page.</p>
        <Notice kind="error">Access denied. Your role does not allow this action.</Notice>
        <Link to={home} className="btn btn-primary">Back to my home page</Link>
      </section>
    </div>
  )
}