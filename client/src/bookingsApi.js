import { api } from './api'

// The server decides from the token which bookings come back:
// a client gets their own, a freelancer gets the ones on their gigs.
export async function fetchBookings() {
  const { bookings, total } = await api('/api/bookings?limit=50')
  return { bookings, total }
}

// The server calculates the totals from the transaction records.
// The client only displays them and never adds anything up itself.
export function fetchIncome() {
  return api('/api/income')
}
