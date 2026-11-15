import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import IncomePage from './IncomePage'
import { fetchBookings, fetchIncome } from '../bookingsApi'

vi.mock('../bookingsApi', () => ({
  fetchBookings: vi.fn(),
  fetchIncome: vi.fn(),
}))

// same shapes as GET /api/bookings and GET /api/income
const BOOKINGS = [
  {
    id: '6ac93cf37892d9431e62f1cf', gig: { id: 'g1', title: 'Logo and mini brand kit' },
    client: { id: 'c1', email: 'sam@example.com' }, freelancer: { id: 'f1', email: 'me@example.com' },
    price: 850, status: 'confirmed', createdAt: '2026-10-07T10:00:00Z',
    transaction: { id: '6ac93cf37892d9431e62f1d0', status: 'simulated-paid' },
  },
  {
    id: '6ac93cf37892d9431e62a001', gig: { id: 'g2', title: 'Poster design for events' },
    client: { id: 'c2', email: 'zinhle@example.com' }, freelancer: { id: 'f1', email: 'me@example.com' },
    price: 400, status: 'confirmed', createdAt: '2026-10-05T10:00:00Z',
    transaction: { id: '6ac93cf37892d9431e62a002', status: 'simulated-paid' },
  },
]
const INCOME = { currency: 'ZAR', total: 1250, count: 2, recent: [] }

beforeEach(() => {
  fetchBookings.mockReset()
  fetchIncome.mockReset()
})

describe('IncomePage', () => {
  it('shows the server totals in rand and the bookings table', async () => {
    fetchBookings.mockResolvedValue({ bookings: BOOKINGS, total: 2 })
    fetchIncome.mockResolvedValue(INCOME)
    render(<IncomePage />)

    expect(await screen.findByText('Total earned')).toBeInTheDocument()
    expect(screen.getByText(/^R\s1\s250,00$/)).toBeInTheDocument()
    expect(screen.getByText('Logo and mini brand kit')).toBeInTheDocument()
    expect(screen.getByText('sam@example.com')).toBeInTheDocument()
    expect(screen.getByText('HH-62F1CF')).toBeInTheDocument()
    expect(screen.getByText('TX-62F1D0')).toBeInTheDocument()
    expect(screen.getByText('07 Oct 2026')).toBeInTheDocument()
    expect(screen.getAllByText('Confirmed')).toHaveLength(2)
    expect(screen.getByRole('columnheader', { name: 'Transaction' })).toBeInTheDocument()
  })

  it('shows the total from the server, not a sum of the rows', async () => {
    // only the newest booking is on this page, but the server total covers all of them
    fetchBookings.mockResolvedValue({ bookings: [BOOKINGS[0]], total: 3 })
    fetchIncome.mockResolvedValue({ ...INCOME, total: 1650, count: 3 })
    render(<IncomePage />)

    expect(await screen.findByText(/^R\s1\s650,00$/)).toBeInTheDocument()
    expect(screen.getByText('Showing the newest 1 of 3 bookings.')).toBeInTheDocument()
  })

  it('shows an empty state and R 0,00 before any booking', async () => {
    fetchBookings.mockResolvedValue({ bookings: [], total: 0 })
    fetchIncome.mockResolvedValue({ currency: 'ZAR', total: 0, count: 0, recent: [] })
    render(<IncomePage />)

    expect(await screen.findByText('No bookings yet')).toBeInTheDocument()
    expect(screen.getByText(/^R\s0,00$/)).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('shows an error notice and retries', async () => {
    fetchBookings.mockRejectedValueOnce(new Error('boom')).mockResolvedValue({ bookings: BOOKINGS, total: 2 })
    fetchIncome.mockResolvedValue(INCOME)
    render(<IncomePage />)

    expect(await screen.findByRole('alert')).toHaveTextContent(/could not load/i)
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByText('zinhle@example.com')).toBeInTheDocument()
  })
})

// GET /api/income with the tax fields. October is missing on purpose: no income that month.
const DASH = {
  currency: 'ZAR', total: 48900, count: 11, recent: [],
  taxYear: '2026/27', estimatedTax: 4890, net: 44010,
  monthly: [
    { month: '2026-08', total: 16900, count: 4 },
    { month: '2026-09', total: 25600, count: 6 },
    { month: '2026-11', total: 6400, count: 1 },
  ],
}

function renderDashboard(income = DASH) {
  fetchBookings.mockResolvedValue({ bookings: BOOKINGS, total: 2 })
  fetchIncome.mockResolvedValue(income)
  render(<IncomePage />)
}

describe('IncomePage dashboard', () => {
  // only the clock is faked, so the chart's "current month" is always November 2026
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-15T12:00:00Z'))
  })
  afterEach(() => vi.useRealTimers())

  it('shows the estimated tax and take-home from the server', async () => {
    renderDashboard()

    const summary = await screen.findByRole('region', { name: 'Income summary' })
    expect(within(summary).getByText('Estimated tax')).toBeInTheDocument()
    expect(within(summary).getByText(/^R\s4\s890,00$/)).toBeInTheDocument()
    expect(within(summary).getByText('Take-home')).toBeInTheDocument()
    expect(within(summary).getByText(/^R\s44\s010,00$/)).toBeInTheDocument()
    expect(within(summary).getByText('Estimate for the 2026/27 tax year')).toBeInTheDocument()
    expect(screen.getByText(/an estimate, not tax advice/)).toBeInTheDocument()
  })

  it('draws a column for every month, including a month with no income', async () => {
    renderDashboard()

    const columns = await screen.findAllByRole('listitem', { name: /2026:/ })
    expect(columns).toHaveLength(4)
    expect(columns[1]).toHaveAccessibleName(/^September 2026: R\s25\s600,00, 6 paid bookings$/)
    expect(columns[2]).toHaveAccessibleName(/^October 2026: R\s0,00, no paid bookings$/)
    expect(screen.getByText(/August 2026 to November 2026\. Best month: September 2026/)).toBeInTheDocument()
  })

  it("shows a month's total on hover and on keyboard focus", async () => {
    const user = userEvent.setup()
    renderDashboard()
    const columns = await screen.findAllByRole('listitem', { name: /2026:/ })

    await user.hover(columns[1])
    expect(screen.getByText('September 2026 · 6 paid bookings')).toBeInTheDocument()
    await user.unhover(columns[1])
    expect(screen.queryByText('September 2026 · 6 paid bookings')).not.toBeInTheDocument()

    await user.tab()
    expect(columns[0]).toHaveFocus()
    expect(screen.getByText('August 2026 · 4 paid bookings')).toBeInTheDocument()
  })

  it('splits what was earned into take-home and estimated tax', async () => {
    renderDashboard()

    expect(await screen.findByRole('listitem', { name: /^Take-home: R\s44\s010,00 \(90%\)$/ })).toBeInTheDocument()
    expect(screen.getByRole('listitem', { name: /^Estimated tax: R\s4\s890,00 \(10%\)$/ })).toBeInTheDocument()
    expect(screen.getByText('You keep 90% of what you earned. The server estimates 10% tax for the 2026/27 tax year.')).toBeInTheDocument()
    // the wide block prints its share; the narrow one leaves it to the hover and the legend
    expect(screen.getByText('90%')).toBeInTheDocument()
    expect(screen.queryByText('10%')).not.toBeInTheDocument()
  })

  it("measures the tax split against this tax year's income, not all-time income", async () => {
    // R 11 100 was earned before this tax year, so total is higher than the taxed income
    renderDashboard({ ...DASH, total: 60000, taxYearIncome: 48900 })

    expect(await screen.findByRole('listitem', { name: /^Take-home: R\s44\s010,00 \(90%\)$/ })).toBeInTheDocument()
    expect(screen.getByRole('listitem', { name: /^Estimated tax: R\s4\s890,00 \(10%\)$/ })).toBeInTheDocument()
    expect(screen.getByText('2026/27 income after estimated tax')).toBeInTheDocument()
  })

  it('leaves months that have not happened yet off the chart', async () => {
    const future = [
      { month: '2026-12', total: 0, count: 0 },
      { month: '2027-01', total: 0, count: 0 },
      { month: '2027-02', total: 0, count: 0 },
    ]
    renderDashboard({ ...DASH, monthly: [...DASH.monthly, ...future] })

    const columns = await screen.findAllByRole('listitem', { name: /20\d\d:/ })
    expect(columns).toHaveLength(4)
    expect(columns[3]).toHaveAccessibleName(/^November 2026:/)
  })

  it('says so when the server estimates no tax', async () => {
    renderDashboard({ ...DASH, estimatedTax: 0, net: 48900 })

    expect(await screen.findByText('No tax is estimated on your income so far for the 2026/27 tax year.')).toBeInTheDocument()
    expect(screen.getByRole('listitem', { name: /^Take-home: R\s48\s900,00 \(100%\)$/ })).toBeInTheDocument()
    expect(screen.queryByRole('listitem', { name: /^Estimated tax/ })).not.toBeInTheDocument()
  })

  it('lists the chart numbers in a table', async () => {
    const user = userEvent.setup()
    renderDashboard()

    await user.click(await screen.findByText('Show the numbers'))
    const table = screen.getByRole('table', { name: 'Income per month' })
    expect(within(table).getAllByRole('row')).toHaveLength(5)
    expect(within(table).getByRole('rowheader', { name: 'October 2026' })).toBeInTheDocument()
  })

  it('shows an empty state instead of charts before any paid booking', async () => {
    renderDashboard({ ...DASH, total: 0, count: 0, estimatedTax: 0, net: 0, monthly: [] })

    expect(await screen.findByText('No income yet')).toBeInTheDocument()
    expect(screen.queryByRole('list', { name: 'Income per month' })).not.toBeInTheDocument()
    expect(screen.queryByRole('list', { name: 'Income against tax' })).not.toBeInTheDocument()
  })

  it('shows the totals only when the server sends no tax fields', async () => {
    renderDashboard(INCOME)

    expect(await screen.findByText('Total earned')).toBeInTheDocument()
    expect(screen.queryByText('Estimated tax')).not.toBeInTheDocument()
    expect(screen.queryByText('Take-home')).not.toBeInTheDocument()
    expect(screen.queryByText('No income yet')).not.toBeInTheDocument()
    expect(screen.queryByRole('list', { name: 'Income per month' })).not.toBeInTheDocument()
  })
})
