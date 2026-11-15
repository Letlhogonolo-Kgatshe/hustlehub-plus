import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import ProtectedRoute from './ProtectedRoute'
import { AuthContext } from './AuthContext'

function renderAt(user, allowedRoles) {
  return render(
    <AuthContext.Provider value={{ user }}>
      <MemoryRouter initialEntries={['/secret']}>
        <Routes>
          <Route path="/login" element={<h1>Login page</h1>} />
          <Route path="/forbidden" element={<h1>Access denied</h1>} />
          <Route element={<ProtectedRoute allowedRoles={allowedRoles} />}>
            <Route path="/secret" element={<h1>Secret page</h1>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>
  )
}

describe('ProtectedRoute', () => {
  it('sends logged-out visitors to login', () => {
    renderAt(null, ['client'])
    expect(screen.getByText('Login page')).toBeInTheDocument()
  })

  it('sends the wrong role to the access denied page', () => {
    renderAt({ id: '1', role: 'client' }, ['freelancer'])
    expect(screen.getByText('Access denied')).toBeInTheDocument()
  })

  it('lets the right role through', () => {
    renderAt({ id: '1', role: 'freelancer' }, ['freelancer'])
    expect(screen.getByText('Secret page')).toBeInTheDocument()
  })
})