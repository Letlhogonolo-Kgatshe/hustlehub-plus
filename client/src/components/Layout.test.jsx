import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import Layout from './Layout'
import { AuthContext } from '../AuthContext'
import { api } from '../api'

vi.mock('../api', () => ({ api: vi.fn(() => Promise.resolve({ message: 'Logged out' })) }))

function renderLayout(user, logout = vi.fn()) {
  render(
    <AuthContext.Provider value={{ user, logout }}>
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<p>Page body</p>} />
            <Route path="/login" element={<p>Login page</p>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>
  )
  return logout
}

describe('Layout', () => {
  it('shows client links and hides freelancer links', () => {
    renderLayout({ id: '1', role: 'client', name: 'Sam' })
    expect(screen.getByRole('link', { name: 'Browse' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'My bookings' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'My gigs' })).not.toBeInTheDocument()
  })

  it('shows freelancer links and hides client links', () => {
    renderLayout({ id: '2', role: 'freelancer', name: 'Thando' })
    expect(screen.getByRole('link', { name: 'My gigs' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Bookings and income' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Browse' })).not.toBeInTheDocument()
  })

  it('shows log in and sign up links to guests', () => {
    renderLayout(null)
    expect(screen.getByRole('link', { name: 'Log in' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Sign up' })).toBeInTheDocument()
  })

  it('logs out and returns to the login page when Logout is clicked', async () => {
    const logout = renderLayout({ id: '1', role: 'client', name: 'Sam' })
    await userEvent.click(screen.getByRole('button', { name: 'Logout' }))
    expect(logout).toHaveBeenCalledTimes(1)
    expect(api).toHaveBeenCalledWith('/api/logout', { method: 'POST' })
    expect(screen.getByText('Login page')).toBeInTheDocument()
  })
})