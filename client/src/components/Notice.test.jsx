import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import Notice from './Notice'

describe('Notice', () => {
  it('announces errors with the alert role', () => {
    render(<Notice kind="error">Email or password is incorrect.</Notice>)
    expect(screen.getByRole('alert')).toHaveTextContent('Email or password is incorrect.')
  })

  it('uses the status role for success messages', () => {
    render(<Notice kind="success">Your booking is confirmed.</Notice>)
    expect(screen.getByRole('status')).toHaveTextContent('Your booking is confirmed.')
  })

  it('shows markup as plain text instead of rendering it', () => {
    render(<Notice kind="info">{'<b>hi</b>'}</Notice>)
    expect(screen.getByText('<b>hi</b>')).toBeInTheDocument()
  })
})