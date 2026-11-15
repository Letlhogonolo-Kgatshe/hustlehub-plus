import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import App from './App'
import { AuthContext } from './AuthContext'
import { fetchGigs } from './gigsApi'

vi.mock('./gigsApi', () => ({ fetchGigs: vi.fn(), fetchGig: vi.fn(), bookGig: vi.fn() }))

function renderBrowse(user) {
  fetchGigs.mockResolvedValue([])
  return render(
    <AuthContext.Provider value={{ user, logout: vi.fn() }}>
      <MemoryRouter initialEntries={['/browse']}>
        <App />
      </MemoryRouter>
    </AuthContext.Provider>
  )
}

describe('/browse', () => {
  it('sends logged-out visitors to the login page', () => {
    renderBrowse(null)
    expect(screen.getByRole('button', { name: /log in/i })).toBeInTheDocument()
    expect(fetchGigs).not.toHaveBeenCalled()
  })

  it('sends a freelancer to the access denied page', () => {
    fetchGigs.mockClear()
    renderBrowse({ id: 'f1', email: 'f@example.com', role: 'freelancer' })
    expect(screen.getByRole('heading', { name: /not for your account/i })).toBeInTheDocument()
    expect(fetchGigs).not.toHaveBeenCalled()
  })

  it('shows the page to a client', async () => {
    renderBrowse({ id: 'c1', email: 'c@example.com', role: 'client' })
    await vi.waitFor(() => expect(fetchGigs).toHaveBeenCalled())
    expect(screen.queryByRole('button', { name: /log in/i })).not.toBeInTheDocument()
  })
})
