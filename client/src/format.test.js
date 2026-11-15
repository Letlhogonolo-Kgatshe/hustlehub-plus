import { describe, it, expect } from 'vitest'
import { formatPrice, formatDate, shortRef, statusLabel } from './format'

describe('format', () => {
  it('formats money as South African rand', () => {
    // Intl uses non-breaking spaces, which \s matches
    expect(formatPrice(1230.3)).toMatch(/^R\s1\s230,30$/)
    expect(formatPrice(0)).toMatch(/^R\s0,00$/)
  })

  it('formats dates, short references and statuses for display', () => {
    expect(formatDate('2026-10-09T10:00:00Z')).toBe('09 Oct 2026')
    expect(shortRef('HH', '6ac93cf37892d9431e62f1cf')).toBe('HH-62F1CF')
    expect(statusLabel('confirmed')).toBe('Confirmed')
  })
})
