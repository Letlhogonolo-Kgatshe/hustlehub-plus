import { api } from './api'
import { shortRef } from './format'

const OBJECT_ID = /^[a-f\d]{24}$/i

// The API may return the freelancer as an object, a name, or a bare database id.
// Never show a raw id or a full email address to other users.
function sellerName(f) {
  if (f && typeof f === 'object') {
    return f.name ?? (f.email ? f.email.split('@')[0] : 'Freelancer')
  }
  if (typeof f === 'string' && OBJECT_ID.test(f)) return `Freelancer ${f.slice(-4).toUpperCase()}`
  if (typeof f === 'string') return f
  return 'Freelancer'
}

// Normalise once here so every page keeps seeing
// { id, title, description, price, category, freelancer }.
function toGig(raw) {
  return {
    id: raw.id ?? raw._id,
    title: raw.title,
    description: raw.description,
    price: raw.price,
    category: raw.category,
    freelancer: sellerName(raw.freelancer),
  }
}

// The API reads the search text from `q` and returns { gigs, page, limit, total }.
export async function fetchGigs(search = '') {
  const term = search.trim()
  const query = term ? `?q=${encodeURIComponent(term)}` : ''
  const data = await api(`/api/gigs${query}`)
  return (data.gigs ?? []).map(toGig)
}

// GET /api/gigs/:id returns { gig }
export async function fetchGig(id) {
  const data = await api(`/api/gigs/${encodeURIComponent(id)}`)
  return toGig(data.gig ?? data)
}

// Only the gig id is sent. The server looks up the price and freelancer itself.
// The reference format matches the My bookings page, so both screens agree.
export async function bookGig(gigId) {
  const { booking, transaction } = await api('/api/bookings', {
    method: 'POST',
    body: { gigId },
  })
  return {
    reference: shortRef('HH', booking.id),
    transactionId: shortRef('TX', transaction.id),
    gigId,
  }
}