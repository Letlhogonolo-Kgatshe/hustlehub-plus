import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import BrowsePage from './BrowsePage'
import { fetchGigs } from '../gigsApi'

vi.mock('../gigsApi', () => ({ fetchGigs: vi.fn() }))

const SAMPLE = [
  { id: 'g1', title: 'Logo and mini brand kit', description: 'Three logo directions.', price: 850, category: 'Design', freelancer: 'Thando M.' },
  { id: 'g2', title: 'Short-form video edit', description: 'Cuts and captions.', price: 450, category: 'Video', freelancer: 'Aisha K.' },
]

function renderPage() {
  return render(<MemoryRouter><BrowsePage /></MemoryRouter>)
}

beforeEach(() => {
  fetchGigs.mockReset()
})

describe('BrowsePage', () => {
  it('shows a loading state, then the gigs', async () => {
    fetchGigs.mockResolvedValue(SAMPLE)
    renderPage()
    expect(screen.getByText('Loading gigs...')).toBeInTheDocument()
    expect(await screen.findByText('Logo and mini brand kit')).toBeInTheDocument()
    expect(screen.getByText('Short-form video edit')).toBeInTheDocument()
  })

  it('filters the list when the user types in the search box', async () => {
    fetchGigs.mockImplementation(async (q) =>
      SAMPLE.filter((g) => g.title.toLowerCase().includes(q.toLowerCase()))
    )
    renderPage()
    await screen.findByText('Short-form video edit')

    await userEvent.type(screen.getByLabelText('Search gigs'), 'logo')

    await waitFor(() =>
      expect(screen.queryByText('Short-form video edit')).not.toBeInTheDocument()
    )
    expect(screen.getByText('Logo and mini brand kit')).toBeInTheDocument()
    expect(fetchGigs).toHaveBeenLastCalledWith('logo')
  })

  it('shows the empty state and recovers with Clear search', async () => {
    fetchGigs.mockResolvedValueOnce([]).mockResolvedValue(SAMPLE)
    renderPage()
    expect(await screen.findByText('Nothing here yet')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Clear search' }))
    expect(await screen.findByText('Logo and mini brand kit')).toBeInTheDocument()
  })

  it('shows an error notice and retries', async () => {
    fetchGigs.mockRejectedValueOnce(new Error('boom')).mockResolvedValue(SAMPLE)
    renderPage()
    expect(await screen.findByRole('alert')).toHaveTextContent(/could not load the gigs/i)

    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByText('Logo and mini brand kit')).toBeInTheDocument()
  })

  it('renders gig text as plain text, never as HTML', async () => {
    fetchGigs.mockResolvedValue([
      { id: 'x', title: '<img src=x onerror=alert(1)>', description: 'test', price: 100, category: 'Design', freelancer: 'Eve' },
    ])
    const { container } = renderPage()
    expect(await screen.findByText('<img src=x onerror=alert(1)>')).toBeInTheDocument()
    expect(container.querySelector('img')).toBeNull()
  })
})