import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import Home from './Home'
import { AuthContext } from '../AuthContext'

vi.mock('./BrowsePage', () => ({ default: () => <p>Browse page</p> }))

function renderHome(user) {
  return render(
    <AuthContext.Provider value={{ user }}>
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/my-gigs" element={<p>My gigs page</p>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>
  )
}

describe('Home', () => {
  it('shows the welcome page to visitors who are not logged in', () => {
    renderHome(null)
    expect(screen.getByRole('link', { name: 'Create an account' })).toBeInTheDocument()
  })

  it('sends freelancers to their gigs', () => {
    renderHome({ id: '1', role: 'freelancer' })
    expect(screen.getByText('My gigs page')).toBeInTheDocument()
  })

  it('shows Browse to clients', () => {
    renderHome({ id: '1', role: 'client' })
    expect(screen.getByText('Browse page')).toBeInTheDocument()
  })
})