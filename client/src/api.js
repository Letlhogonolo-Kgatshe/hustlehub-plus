const BASE_URL = import.meta.env.VITE_API_URL || 'https://localhost:5000'

let token = null
let onUnauthorized = null

export function setToken(t) { token = t }
export function setUnauthorizedHandler(fn) { onUnauthorized = fn }

function pickMessage(data, status) {
  const text = typeof data?.message === 'string' ? data.message
    : typeof data?.error === 'string' ? data.error
    : null
  if (text) return text
  if (status === 429) return 'Too many attempts. Please wait and try again.'
  if (status === 403) return 'You do not have access to do that.'
  if (status === 409) return 'Conflict with an existing record.'
  return 'Something went wrong'
}

export async function api(path, { method = 'GET', body } = {}) {
  let res
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch {
    const err = new Error('Could not reach the server. Please try again.')
    err.status = 0
    throw err
  }

  let data = null
  try { data = await res.json() } catch { /* empty or non-JSON body */ }

  if (res.status === 401 && onUnauthorized) onUnauthorized()

  if (!res.ok) {
    const err = new Error(pickMessage(data, res.status))
    // the API uses { message } for validation and { error } for auth failures
    err.status = res.status
    err.fieldErrors = Array.isArray(data?.errors) ? data.errors : null
    err.retryAfter = res.headers.get('Retry-After')
    throw err
  }
  return data
}