// Where each role lands after logging in. Roles with no web page return null.
export function landingPath(role) {
  if (role === 'client') return '/'
  if (role === 'freelancer') return '/my-gigs'
  return null
}

// Turns an error from api() into one safe sentence for the user.
// Only the message the API chose to send is shown: never a stack trace,
// status dump or raw response body.
export function friendlyError(err) {
  if (err.status === undefined) {
    return 'Cannot reach the server. Check your connection and that the API is running.'
  }
  if (err.status === 429) {
    const wait = err.retryAfter ? ` Try again in ${err.retryAfter} seconds.` : ''
    return `${err.message || 'Too many attempts.'}${wait}`
  }
  if (err.status >= 500) return 'Something went wrong on our side. Please try again later.'
  return err.fieldErrors?.[0]?.message || err.message
}