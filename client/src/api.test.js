import { describe, it, expect, vi, afterEach } from 'vitest'
import { api } from './api'

function mockFetch(status, body, headers = {}) {
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (k) => headers[k] ?? null },
    json: async () => body,
  })
}

afterEach(() => vi.restoreAllMocks())

describe('api', () => {
  it('shows the message key from the server', async () => {
    mockFetch(400, { message: 'Bad input' })
    await expect(api('/x')).rejects.toThrow('Bad input')
  })

  it('shows the error key from the server', async () => {
    mockFetch(401, { error: 'Invalid credentials' })
    await expect(api('/x')).rejects.toThrow('Invalid credentials')
  })

  it('exposes the status and Retry-After on a 429', async () => {
    mockFetch(429, {}, { 'Retry-After': '60' })
    await expect(api('/x')).rejects.toMatchObject({ status: 429, retryAfter: '60' })
  })

  it('gives a friendly message when the server is unreachable', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
    await expect(api('/x')).rejects.toThrow('Could not reach the server')
  })
})