function formatWhen(ts) {
  return new Date(ts).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default function NotificationsModal({ notifications, onClose, onNavigate }) {
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-header">
          <h2>Notifications</h2>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close">×</button>
        </div>

        {notifications.length === 0 && <p className="section-hint">Nothing yet — you'll see activity here.</p>}

        {notifications.length > 0 && (
          <div className="notifications-list">
            {notifications.map((n) => {
              const Tag = n.linkTab ? 'button' : 'div'
              return (
                <Tag
                  key={n.id}
                  type={n.linkTab ? 'button' : undefined}
                  className={`notification-item${n.read ? '' : ' notification-unread'}`}
                  onClick={
                    n.linkTab
                      ? () => {
                          onNavigate(n.linkTab)
                          onClose()
                        }
                      : undefined
                  }
                >
                  <p className="notification-title">{n.title}</p>
                  <p className="notification-body">{n.body}</p>
                  <p className="section-hint">{formatWhen(n.createdAt)}</p>
                </Tag>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
