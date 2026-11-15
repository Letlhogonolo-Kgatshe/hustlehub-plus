const CONFIG = {
  success: { title: 'Success', role: 'status', icon: 'M5 12.5l4.5 4.5L19 7.5' },
  error: { title: 'Something went wrong', role: 'alert', icon: 'M12 6v8M12 18.5v.5' },
  info: { title: 'Heads up', role: 'status', icon: 'M12 11v7M12 6v.5' },
}

export default function Notice({ kind = 'info', title, children }) {
  const config = CONFIG[kind] ?? CONFIG.info
  return (
    <div className={`notice notice-${kind}`} role={config.role}>
      <span className="notice-icon" aria-hidden="true">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff"
             strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d={config.icon} />
        </svg>
      </span>
      <div>
        <span className="notice-title">{title ?? config.title}</span>
        <span className="notice-message">{children}</span>
      </div>
    </div>
  )
}