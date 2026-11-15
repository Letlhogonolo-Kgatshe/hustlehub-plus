import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import WelcomePage from './WelcomePage'

describe('WelcomePage', () => {
  it('explains the app and offers sign up and login', () => {
    render(<MemoryRouter><WelcomePage /></MemoryRouter>)
    expect(screen.getByRole('heading', { name: /find someone who gets it done/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Create an account' })).toHaveAttribute('href', '/register')
    expect(screen.getByRole('link', { name: 'Log in' })).toHaveAttribute('href', '/login')
  })
})