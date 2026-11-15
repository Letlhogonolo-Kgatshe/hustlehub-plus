import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MyGigs from './Mygigs'
import { api } from '../api'

vi.mock('../api', () => ({ api: vi.fn() }))

const gig = { id: 'g1', title: 'Logo design', description: 'I will design a logo for you', price: 250, category: 'design' }

beforeEach(() => { vi.clearAllMocks() })

describe('My gigs page', () => {
  it('shows an empty state before the freelancer has any gigs', async () => {
    api.mockResolvedValueOnce({ gigs: [] })
    render(<MyGigs />)
    expect(await screen.findByText(/You have no gigs yet/)).toBeInTheDocument()
  })

  it('lists the freelancer\'s gigs from the API', async () => {
    api.mockResolvedValueOnce({ gigs: [gig] })
    render(<MyGigs />)
    expect(await screen.findByText('Logo design')).toBeInTheDocument()
    expect(screen.getByText(/250/)).toBeInTheDocument()
    expect(api).toHaveBeenCalledWith('/api/gigs/mine')
  })

  it('creates a gig and shows it in the list', async () => {
    api.mockResolvedValueOnce({ gigs: [] })
    render(<MyGigs />)
    await screen.findByText(/You have no gigs yet/)

    await userEvent.click(screen.getByRole('button', { name: 'New gig' }))
    await userEvent.type(screen.getByLabelText('Title'), gig.title)
    await userEvent.type(screen.getByLabelText('Description'), gig.description)
    await userEvent.type(screen.getByLabelText('Price (R)'), '250')
    await userEvent.selectOptions(screen.getByLabelText('Category'), 'design')

    api.mockResolvedValueOnce({ message: 'Gig created', gig })
    await userEvent.click(screen.getByRole('button', { name: 'Save gig' }))

    expect(await screen.findByText('Gig created.')).toBeInTheDocument()
    expect(screen.getByText('Logo design')).toBeInTheDocument()
    expect(api).toHaveBeenLastCalledWith('/api/gigs', {
      method: 'POST',
      body: { title: gig.title, description: gig.description, price: 250, category: 'design' },
    })
  })

  it('does not call the API when the form is invalid', async () => {
    api.mockResolvedValueOnce({ gigs: [] })
    render(<MyGigs />)
    await screen.findByText(/You have no gigs yet/)
    await userEvent.click(screen.getByRole('button', { name: 'New gig' }))
    await userEvent.click(screen.getByRole('button', { name: 'Save gig' }))

    expect(await screen.findByText(/Title must be 3 to 100 characters/)).toBeInTheDocument()
    expect(api).toHaveBeenCalledTimes(1) // only the initial list load
  })

  it('edits a gig and updates the list', async () => {
    api.mockResolvedValueOnce({ gigs: [gig] })
    render(<MyGigs />)
    await userEvent.click(await screen.findByRole('button', { name: 'Edit Logo design' }))

    const title = screen.getByLabelText('Title')
    await userEvent.clear(title)
    await userEvent.type(title, 'Better logo')

    api.mockResolvedValueOnce({ message: 'Gig updated', gig: { ...gig, title: 'Better logo' } })
    await userEvent.click(screen.getByRole('button', { name: 'Save gig' }))

    expect(await screen.findByText('Better logo')).toBeInTheDocument()
    expect(screen.queryByText('Logo design')).not.toBeInTheDocument()
    expect(api).toHaveBeenLastCalledWith('/api/gigs/g1', expect.objectContaining({ method: 'PUT' }))
  })

  it('asks before deleting, then removes the gig', async () => {
    api.mockResolvedValueOnce({ gigs: [gig] })
    render(<MyGigs />)
    await userEvent.click(await screen.findByRole('button', { name: 'Delete Logo design' }))

    const confirm = screen.getByRole('group', { name: /Confirm delete/ })
    api.mockResolvedValueOnce({ message: 'Gig deleted' })
    await userEvent.click(within(confirm).getByRole('button', { name: 'Yes, delete' }))

    expect(await screen.findByText('Gig deleted.')).toBeInTheDocument()
    expect(screen.queryByText('Logo design')).not.toBeInTheDocument()
    expect(api).toHaveBeenLastCalledWith('/api/gigs/g1', { method: 'DELETE' })
  })

  it('shows a readable message if the gigs cannot be loaded', async () => {
    api.mockRejectedValueOnce(Object.assign(new Error('x'), { status: 500 }))
    render(<MyGigs />)
    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong on our side')
  })
})