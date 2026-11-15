// Keys match the API's categories (api/src/models/Gig.js), which are lowercase.
const STYLES = {
  design: { bg: '#e4ddff', ink: '#cfc4ff' },
  video: { bg: '#ffd8c9', ink: '#ffc2ab' },
  tutoring: { bg: '#cfe9ff', ink: '#b5dbfa' },
  marketing: { bg: '#e6f9a8', ink: '#d6f27a' },
  development: { bg: '#cfe9ff', ink: '#b5dbfa' },
  writing: { bg: '#ffd8c9', ink: '#ffc2ab' },
  music: { bg: '#e4ddff', ink: '#cfc4ff' },
  other: { bg: '#eae5fb', ink: '#d9d2f2' },
}

export const CATEGORIES = Object.keys(STYLES)

export const styleFor = (category) =>
  STYLES[String(category).toLowerCase()] ?? STYLES.other