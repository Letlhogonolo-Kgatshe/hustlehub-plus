const RAND = new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' })
const DAY = new Intl.DateTimeFormat('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })

// e.g. R 1 230,30
export const formatPrice = (n) => RAND.format(Number(n))

// e.g. 09 Oct 2026
export const formatDate = (iso) => DAY.format(new Date(iso))

// short code for showing a database id, e.g. HH-3A9F1C
export const shortRef = (prefix, id) => `${prefix}-${String(id).slice(-6).toUpperCase()}`

// confirmed -> Confirmed
export const statusLabel = (status) => status.charAt(0).toUpperCase() + status.slice(1)
