export default function StatusChip({ status }) {
  const confirmed = status === 'Confirmed'
  const cancelled = status === 'Cancelled'
  return (
    <span className={`status-chip ${confirmed ? 'status-confirmed' : ''}`}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#17142B"
           strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {confirmed && <path d="M5 12.5l4.5 4.5L19 7.5" />}
        {cancelled && <path d="M6 6l12 12M18 6L6 18" />}
        {!confirmed && !cancelled && (
          <>
            <circle cx="12" cy="12" r="9" />
            <path d="M8 12.5l3 3 5-6" />
          </>
        )}
      </svg>
      {status}
    </span>
  )
}