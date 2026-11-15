// Keep MIN_LENGTH equal to the minimum enforced in api/src/middleware/validators.js
export const MIN_LENGTH = 12
export const MAX_BYTES = 72

export const PASSWORD_RULES = [
  { id: 'length', label: `At least ${MIN_LENGTH} characters`, test: (p) => p.length >= MIN_LENGTH },
  { id: 'lower', label: 'A lowercase letter', test: (p) => /[a-z]/.test(p) },
  { id: 'upper', label: 'An uppercase letter', test: (p) => /[A-Z]/.test(p) },
  { id: 'number', label: 'A number', test: (p) => /\d/.test(p) },
  { id: 'symbol', label: 'A symbol, such as ! or #', test: (p) => /[^A-Za-z0-9]/.test(p) },
]

export const passwordIsStrong = (p) =>
  PASSWORD_RULES.every((r) => r.test(p)) && new TextEncoder().encode(p).length <= MAX_BYTES