import { useEffect, useState } from 'react'
import { api } from '../api'
import { friendlyError } from '../roles'
import Notice from '../components/Notice'
import { formatPrice } from '../format'
import { styleFor } from '../categories'
import './mygigs.css'

// keep in step with api/src/models/Gig.js
const CATEGORIES = ['design', 'writing', 'development', 'marketing', 'video', 'music', 'tutoring', 'other']
const LIMITS = { titleMin: 3, titleMax: 100, descMin: 10, descMax: 2000, priceMin: 1, priceMax: 100000 }
const EMPTY_FORM = { title: '', description: '', price: '', category: '' }

// quick feedback in the browser; the API checks everything again
function validate({ title, description, price, category }) {
  const errors = {}
  const t = title.trim()
  const d = description.trim()
  const p = Number(price)
  if (t.length < LIMITS.titleMin || t.length > LIMITS.titleMax) {
    errors.title = `Title must be ${LIMITS.titleMin} to ${LIMITS.titleMax} characters.`
  }
  if (d.length < LIMITS.descMin || d.length > LIMITS.descMax) {
    errors.description = `Description must be ${LIMITS.descMin} to ${LIMITS.descMax} characters.`
  }
  if (price === '' || !Number.isFinite(p) || p < LIMITS.priceMin || p > LIMITS.priceMax) {
    errors.price = `Price must be a number from ${LIMITS.priceMin} to ${LIMITS.priceMax}.`
  }
  if (!CATEGORIES.includes(category)) errors.category = 'Choose a category.'
  return errors
}

export default function MyGigs() {
  const [gigs, setGigs] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [notice, setNotice] = useState('')

  const [editingId, setEditingId] = useState(null) // null = form closed, 'new' = creating
  const [form, setForm] = useState(EMPTY_FORM)
  const [fieldErrors, setFieldErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  const [confirmingId, setConfirmingId] = useState(null)
  const [deleteError, setDeleteError] = useState('')

  useEffect(() => {
    let cancelled = false
    api('/api/gigs/mine')
      .then((data) => { if (!cancelled) setGigs(data.gigs) })
      .catch((err) => { if (!cancelled) setLoadError(friendlyError(err)) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const set = (name) => (e) => setForm((f) => ({ ...f, [name]: e.target.value }))

  function openCreate() {
    setForm(EMPTY_FORM); setFieldErrors({}); setFormError(''); setNotice('')
    setEditingId('new')
  }

  function openEdit(gig) {
    setForm({
      title: gig.title, description: gig.description,
      price: String(gig.price), category: gig.category,
    })
    setFieldErrors({}); setFormError(''); setNotice('')
    setConfirmingId(null)
    setEditingId(gig.id)
  }

  function closeForm() {
    setEditingId(null); setFieldErrors({}); setFormError('')
  }

  async function handleSave(e) {
    e.preventDefault()
    setFormError('')

    const problems = validate(form)
    setFieldErrors(problems)
    if (Object.keys(problems).length) return

    const body = {
      title: form.title.trim(),
      description: form.description.trim(),
      price: Number(form.price),
      category: form.category,
    }
    const creating = editingId === 'new'

    setSaving(true)
    try {
      const data = await api(creating ? '/api/gigs' : `/api/gigs/${editingId}`, {
        method: creating ? 'POST' : 'PUT',
        body,
      })
      setGigs((current) => creating
        ? [data.gig, ...current]
        : current.map((g) => (g.id === data.gig.id ? data.gig : g)))
      setNotice(creating ? 'Gig created.' : 'Gig updated.')
      closeForm()
    } catch (err) {
      if (err.fieldErrors?.length) {
        const mapped = {}
        for (const item of err.fieldErrors) mapped[item.field] ??= item.message
        setFieldErrors(mapped)
      } else {
        setFormError(friendlyError(err))
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id) {
    setDeleteError('')
    try {
      await api(`/api/gigs/${id}`, { method: 'DELETE' })
      setGigs((current) => current.filter((g) => g.id !== id))
      setNotice('Gig deleted.')
      if (editingId === id) closeForm()
    } catch (err) {
      setDeleteError(friendlyError(err))
    } finally {
      setConfirmingId(null)
    }
  }

  const fieldError = (name) =>
    fieldErrors[name] && <span id={`${name}-error`} className="mg-error">{fieldErrors[name]}</span>
  const describedBy = (name) => (fieldErrors[name] ? `${name}-error` : undefined)
  const invalid = (name) => (fieldErrors[name] ? 'true' : undefined)

  return (
    <div className="mg-page">
      <div className="mg-head">
        <h1>My gigs</h1>
        {editingId === null && (
          <button type="button" className="mg-btn primary" onClick={openCreate}>New gig</button>
        )}
      </div>

      {notice && <Notice kind="success">{notice}</Notice>}
      {deleteError && <Notice kind="error">{deleteError}</Notice>}

      {editingId !== null && (
        <form className="mg-form" onSubmit={handleSave} noValidate aria-label={editingId === 'new' ? 'New gig' : 'Edit gig'}>
          <h2>{editingId === 'new' ? 'New gig' : 'Edit gig'}</h2>
          {formError && <Notice kind="error">{formError}</Notice>}

          <div className="mg-field">
            <label htmlFor="title">Title</label>
            <input id="title" type="text" maxLength={LIMITS.titleMax} value={form.title} onChange={set('title')}
              aria-invalid={invalid('title')} aria-describedby={describedBy('title')} />
            {fieldError('title')}
          </div>

          <div className="mg-field">
            <label htmlFor="description">Description</label>
            <textarea id="description" rows={4} maxLength={LIMITS.descMax} value={form.description} onChange={set('description')}
              aria-invalid={invalid('description')} aria-describedby={describedBy('description')} />
            {fieldError('description')}
          </div>

          <div className="mg-row">
            <div className="mg-field">
              <label htmlFor="price">Price (R)</label>
              <input id="price" type="number" min={LIMITS.priceMin} max={LIMITS.priceMax} step="any" value={form.price} onChange={set('price')}
                aria-invalid={invalid('price')} aria-describedby={describedBy('price')} />
              {fieldError('price')}
            </div>
            <div className="mg-field">
              <label htmlFor="category">Category</label>
              <select id="category" value={form.category} onChange={set('category')}
                aria-invalid={invalid('category')} aria-describedby={describedBy('category')}>
                <option value="">Choose…</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              {fieldError('category')}
            </div>
          </div>

          <div className="mg-actions">
            <button type="submit" className="mg-btn primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save gig'}
            </button>
            <button type="button" className="mg-btn" onClick={closeForm} disabled={saving}>Cancel</button>
          </div>
        </form>
      )}

      {loading && <p>Loading your gigs…</p>}
      {loadError && <Notice kind="error">{loadError}</Notice>}

      {!loading && !loadError && gigs.length === 0 && (
        <p className="mg-empty">You have no gigs yet. Create your first one to start getting bookings.</p>
      )}

      <ul className="mg-list">
        {gigs.map((gig) => (
          <li key={gig.id} className="mg-card">
            <div className="mg-card-top">
              <h2>{gig.title}</h2>
              <span className="mg-price">{formatPrice(gig.price)}</span>
            </div>
            <span className="mg-tag" style={{ background: styleFor(gig.category).bg }}>{gig.category}</span>
            <p className="mg-desc">{gig.description}</p>

            {confirmingId === gig.id ? (
              <div className="mg-actions" role="group" aria-label={`Confirm delete ${gig.title}`}>
                <span>Delete this gig?</span>
                <button type="button" className="mg-btn danger" onClick={() => handleDelete(gig.id)}>Yes, delete</button>
                <button type="button" className="mg-btn" onClick={() => setConfirmingId(null)}>Cancel</button>
              </div>
            ) : (
              <div className="mg-actions">
                <button type="button" className="mg-btn" onClick={() => openEdit(gig)} aria-label={`Edit ${gig.title}`}>Edit</button>
                <button type="button" className="mg-btn danger-outline" onClick={() => setConfirmingId(gig.id)} aria-label={`Delete ${gig.title}`}>Delete</button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}