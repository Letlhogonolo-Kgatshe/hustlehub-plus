import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import Login from './Login'
import { AuthContext } from '../AuthContext'
import { api } from '../api'

vi.mock('../api', () => ({ api: vi.fn() }))

const loginSpy = vi.fn()

function renderLogin() {
  return render(
    <AuthContext.Provider value={{ user: null, login: loginSpy }}>
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<h1>Browse page</h1>} />
          <Route path="/my-gigs" element={<h1>My gigs page</h1>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>
  )
}

describe('Login page', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('renders the email and password fields and a log in button', () => {
    renderLogin()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Log in' })).toBeInTheDocument()
  })

  it('shows a readable message and does not log in when the credentials are wrong', async () => {
    const err = Object.assign(new Error('Invalid email or password'), { status: 401 })
    api.mockRejectedValueOnce(err)
    renderLogin()

    await userEvent.type(screen.getByLabelText('Email'), 'a@x.com')
    await userEvent.type(screen.getByLabelText('Password'), 'wrong')
    await userEvent.click(screen.getByRole('button', { name: 'Log in' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password')
    expect(loginSpy).not.toHaveBeenCalled()
  })

  it('sends a freelancer to My gigs after a successful login', async () => {
    api.mockResolvedValueOnce({ token: 't', user: { id: '1', email: 'f@x.com', role: 'freelancer' } })
    renderLogin()

    await userEvent.type(screen.getByLabelText('Email'), 'f@x.com')
    await userEvent.type(screen.getByLabelText('Password'), 'Passw0rd!x')
    await userEvent.click(screen.getByRole('button', { name: 'Log in' }))

    await waitFor(() => expect(screen.getByText('My gigs page')).toBeInTheDocument())
    expect(loginSpy).toHaveBeenCalledWith('t', expect.objectContaining({ role: 'freelancer' }))
  })
})