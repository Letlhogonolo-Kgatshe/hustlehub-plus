import { describe, it, expect, vi, afterEach } from 'vitest'
import { api } from './api'
import { fetchIncome } from './bookingsApi'

vi.mock('./api', () => ({ api: vi.fn() }))

afterEach(() => api.mockReset())

describe('fetchIncome', () => {
  it('asks the server', async () => {
    api.mockResolvedValue({ total: 10 })
    await expect(fetchIncome()).resolves.toEqual({ total: 10 })
    expect(api).toHaveBeenCalledWith('/api/income')
  })
})
