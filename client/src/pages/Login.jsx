import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../useAuth'
import { landingPath, friendlyError } from '../roles'
import './auth.css'

export default function Login() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // someone who is already logged in has no reason to see this page
  if (user) return <Navigate to={landingPath(user.role) || '/forbidden'} replace />

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!email.trim() || !password) {
      setError('Enter your email and password.')
      return
    }

    setSubmitting(true)
    try {
      const data = await api('/api/login', {
        method: 'POST',
        body: { email: email.trim(), password },
      })

      const destination = landingPath(data.user.role)
      if (!destination) {
        // admin accounts exist, but this app has no admin screens
        setError('This account type has no web dashboard. Admin tasks are done through the API.')
        return
      }

      login(data.token, data.user)
      navigate(destination, { replace: true })
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="auth-card">
      <h1>Log in</h1>
      <p className="auth-sub">Welcome back to HustleHub+.</p>

      {location.state?.registered && (
        <p className="auth-banner success" role="status">Account created. Please log in.</p>
      )}
      {error && <p className="auth-banner error" role="alert">{error}</p>}

      <form onSubmit={handleSubmit} noValidate>
        <div className="auth-field">
          <label htmlFor="email">Email</label>
          <input
            id="email" type="email" autoComplete="email" value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="auth-field">
          <label htmlFor="password">Password</label>
          <input
            id="password" type="password" autoComplete="current-password" value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <button className="auth-submit" type="submit" disabled={submitting}>
          {submitting ? 'Logging in…' : 'Log in'}
        </button>
      </form>

      <p className="auth-alt">New here? <Link to="/register">Create an account</Link></p>
    </main>
  )
}