import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import MyBookingsPage from './MyBookingsPage'
import { fetchBookings } from '../bookingsApi'

vi.mock('../bookingsApi', () => ({ fetchBookings: vi.fn() }))

// same shape as GET /api/bookings
const BOOKINGS = [
  {
    id: '6ac93cf37892d9431e62f1cf', gig: { id: 'g1', title: 'Logo and mini brand kit' },
    client: { id: 'c1', email: 'me@example.com' }, freelancer: { id: 'f1', email: 'thando@example.com' },
    price: 850, status: 'confirmed', createdAt: '2026-10-07T10:00:00Z',
    transaction: { id: '6ac93cf37892d9431e62f1d0', status: 'simulated-paid' },
  },
  {
    id: '6ac93cf37892d9431e62a001', gig: { id: 'g2', title: 'Short-form video edit' },
    client: { id: 'c1', email: 'me@example.com' }, freelancer: { id: 'f2', email: 'aisha@example.com' },
    price: 299.99, status: 'completed', createdAt: '2026-10-02T10:00:00Z',
    transaction: { id: '6ac93cf37892d9431e62a002', status: 'simulated-paid' },
  },
]

const renderPage = () => render(<MemoryRouter><MyBookingsPage /></MemoryRouter>)

beforeEach(() => fetchBookings.mockReset())

describe('MyBookingsPage', () => {
  it('lists bookings with gig title, price, date, status and references', async () => {
    fetchBookings.mockResolvedValue({ bookings: BOOKINGS, total: 2 })
    renderPage()
    expect(await screen.findByText('Logo and mini brand kit')).toBeInTheDocument()
    expect(screen.getByText(/HH-62F1CF/)).toHaveTextContent('TX-62F1D0 · Booked 07 Oct 2026')
    expect(screen.getByText(/^R\s299,99$/)).toBeInTheDocument()
    expect(screen.getByText('thando@example.com')).toBeInTheDocument()
    expect(screen.getByText('Confirmed')).toBeInTheDocument()
    expect(screen.getByText('Completed')).toBeInTheDocument()
  })

  it('says when only the newest bookings are shown', async () => {
    fetchBookings.mockResolvedValue({ bookings: BOOKINGS, total: 60 })
    renderPage()
    expect(await screen.findByText('Showing your newest 2 of 60 bookings.')).toBeInTheDocument()
  })

  it('shows an empty state with a link to browse', async () => {
    fetchBookings.mockResolvedValue({ bookings: [], total: 0 })
    renderPage()
    expect(await screen.findByText('No bookings yet')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Browse gigs' })).toBeInTheDocument()
  })

  it('shows an error notice and retries', async () => {
    fetchBookings.mockRejectedValueOnce(new Error('boom')).mockResolvedValue({ bookings: BOOKINGS, total: 2 })
    renderPage()
    expect(await screen.findByRole('alert')).toHaveTextContent(/could not load your bookings/i)
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByText('Short-form video edit')).toBeInTheDocument()
  })
})
