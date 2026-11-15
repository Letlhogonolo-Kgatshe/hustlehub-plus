import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import Register from './Register'
import Login from './Login'
import { AuthContext } from '../AuthContext'
import { api } from '../api'

vi.mock('../api', () => ({ api: vi.fn() }))

// meets every rule: 12+ characters, upper, lower, number, symbol
const STRONG = 'Passw0rd!xyz12'

function renderRegister() {
  return render(
    <AuthContext.Provider value={{ user: null, login: vi.fn() }}>
      <MemoryRouter initialEntries={['/register']}>
        <Routes>
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>
  )
}

describe('Register page', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('blocks a weak password and a missing role without calling the API', async () => {
    renderRegister()
    await userEvent.type(screen.getByLabelText('Email'), 'a@x.com')
    await userEvent.type(screen.getByLabelText('Password'), 'weak')
    await userEvent.type(screen.getByLabelText('Confirm password'), 'weak')
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }))

    expect(await screen.findByText('Password needs: at least 12 characters.')).toBeInTheDocument()
    expect(screen.getByText('Choose client or freelancer.')).toBeInTheDocument()
    expect(api).not.toHaveBeenCalled()
  })

  it('registers with the chosen role and then shows the login page', async () => {
    api.mockResolvedValueOnce({ message: 'Registration successful' })
    renderRegister()
    await userEvent.type(screen.getByLabelText('Email'), 'a@x.com')
    await userEvent.type(screen.getByLabelText('Password'), STRONG)
    await userEvent.type(screen.getByLabelText('Confirm password'), STRONG)
    await userEvent.click(screen.getByLabelText('Freelancer'))
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }))

    await waitFor(() => expect(screen.getByText('Account created. Please log in.')).toBeInTheDocument())
    expect(api).toHaveBeenCalledWith('/api/register', {
      method: 'POST',
      body: { email: 'a@x.com', password: STRONG, role: 'freelancer' },
    })
  })

  it('shows the API message when the email is already taken', async () => {
    api.mockRejectedValueOnce(Object.assign(new Error('An account with this email already exists'), { status: 409 }))
    renderRegister()
    await userEvent.type(screen.getByLabelText('Email'), 'a@x.com')
    await userEvent.type(screen.getByLabelText('Password'), STRONG)
    await userEvent.type(screen.getByLabelText('Confirm password'), STRONG)
    await userEvent.click(screen.getByLabelText('Client'))
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('An account with this email already exists')
  })
})