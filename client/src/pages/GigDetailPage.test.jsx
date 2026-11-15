import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import GigDetailPage from './GigDetailPage'
import { fetchGig, bookGig } from '../gigsApi'

vi.mock('../gigsApi', () => ({ fetchGig: vi.fn(), bookGig: vi.fn() }))

const GIG = { id: 'g1', title: 'Logo and mini brand kit', description: 'Three logo directions.', price: 850, category: 'Design', freelancer: 'Thando M.' }

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/gigs/g1']}>
      <Routes>
        <Route path="/gigs/:id" element={<GigDetailPage />} />
      </Routes>
    </MemoryRouter>
  )
}

beforeEach(() => {
  fetchGig.mockReset()
  bookGig.mockReset()
})

describe('GigDetailPage', () => {
  it('shows the gig details', async () => {
    fetchGig.mockResolvedValue(GIG)
    renderPage()
    expect(await screen.findByRole('heading', { name: 'Logo and mini brand kit' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Book this gig' })).toBeInTheDocument()
  })

  it('shows a confirmation with the transaction reference after booking', async () => {
    fetchGig.mockResolvedValue(GIG)
    bookGig.mockResolvedValue({ reference: 'HH-0042', transactionId: 'TX-0042' })
    renderPage()

    await userEvent.click(await screen.findByRole('button', { name: 'Book this gig' }))

    expect(await screen.findByText('HH-0042')).toBeInTheDocument()
    expect(screen.getByText('TX-0042')).toBeInTheDocument()
    expect(screen.getByText(/booking confirmed/i)).toBeInTheDocument()
    expect(bookGig).toHaveBeenCalledWith('g1')
  })

  it('shows a clear message when the booking is rate limited', async () => {
    fetchGig.mockResolvedValue(GIG)
    bookGig.mockRejectedValue(Object.assign(new Error('x'), { status: 429 }))
    renderPage()

    await userEvent.click(await screen.findByRole('button', { name: 'Book this gig' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/too many booking attempts/i)
  })

  it('shows a not found notice for an unknown gig', async () => {
    fetchGig.mockRejectedValue(Object.assign(new Error('nope'), { status: 404 }))
    renderPage()
    expect(await screen.findByRole('alert')).toHaveTextContent(/could not find that gig/i)
  })
})