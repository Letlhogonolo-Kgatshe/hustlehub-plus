import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../useAuth'
import { landingPath, friendlyError } from '../roles'
import { PASSWORD_RULES, MAX_BYTES } from '../passwordRules'
import PasswordChecklist from '../components/PasswordChecklist'
import './auth.css'

// mirrors the API rules in api/src/middleware/validators.js so mistakes show
// instantly. The API still checks everything again: this is only for speed.
function validate({ email, password, confirm, role }) {
  const errors = {}
  if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
    errors.email = 'Enter a valid email address, like name@example.com.'
  }

  const failed = PASSWORD_RULES.find((rule) => !rule.test(password))
  if (failed) {
    errors.password = `Password needs: ${failed.label.toLowerCase()}.`
  } else if (new TextEncoder().encode(password).length > MAX_BYTES) {
    errors.password = `Password must be at most ${MAX_BYTES} bytes.`
  }

  if (confirm !== password) errors.confirm = 'The passwords do not match.'
  if (role !== 'client' && role !== 'freelancer') errors.role = 'Choose client or freelancer.'
  return errors
}

export default function Register() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '', confirm: '', role: '' })
  const [fieldErrors, setFieldErrors] = useState({})
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (user) return <Navigate to={landingPath(user.role) || '/forbidden'} replace />

  const set = (name) => (e) => setForm((f) => ({ ...f, [name]: e.target.value }))

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    const problems = validate(form)
    setFieldErrors(problems)
    if (Object.keys(problems).length) return

    setSubmitting(true)
    try {
      await api('/api/register', {
        method: 'POST',
        body: { email: form.email.trim(), password: form.password, role: form.role },
      })
      navigate('/login', { replace: true, state: { registered: true } })
    } catch (err) {
      // show the API's per-field messages next to the right field when it sent them
      if (err.fieldErrors?.length) {
        const mapped = {}
        for (const item of err.fieldErrors) mapped[item.field] ??= item.message
        setFieldErrors(mapped)
      } else {
        setError(friendlyError(err))
      }
    } finally {
      setSubmitting(false)
    }
  }

  const field = (name, label, type, autoComplete, extra, describedBy) => (
    <div className="auth-field">
      <label htmlFor={name}>{label}</label>
      <input
        id={name} type={type} autoComplete={autoComplete} value={form[name]}
        onChange={set(name)}
        aria-invalid={fieldErrors[name] ? 'true' : undefined}
        aria-describedby={fieldErrors[name] ? `${name}-error` : describedBy}
      />
      {fieldErrors[name] && <span id={`${name}-error`} className="auth-error">{fieldErrors[name]}</span>}
      {extra}
    </div>
  )

  return (
    <main className="auth-card">
      <h1>Create account</h1>
      <p className="auth-sub">Join HustleHub+ as a client or a freelancer.</p>

      {error && <p className="auth-banner error" role="alert">{error}</p>}

      <form onSubmit={handleSubmit} noValidate>
        {field('email', 'Email', 'email', 'email')}
        {field('password', 'Password', 'password', 'new-password',
          <PasswordChecklist password={form.password} id="password-rules" />, 'password-rules')}
        {field('confirm', 'Confirm password', 'password', 'new-password')}

        <fieldset className="auth-fieldset">
          <legend>I am a</legend>
          <div className="auth-roles">
            <label><input type="radio" name="role" value="client" checked={form.role === 'client'} onChange={set('role')} /> Client</label>
            <label><input type="radio" name="role" value="freelancer" checked={form.role === 'freelancer'} onChange={set('role')} /> Freelancer</label>
          </div>
          {fieldErrors.role && <span className="auth-error">{fieldErrors.role}</span>}
        </fieldset>

        <button className="auth-submit" type="submit" disabled={submitting}>
          {submitting ? 'Creating account...' : 'Create account'}
        </button>
      </form>

      <p className="auth-alt">Already have an account? <Link to="/login">Log in</Link></p>
    </main>
  )
}