const TABS = [
  { id: 'home', label: 'Home', emoji: '🏠' },
  { id: 'collection', label: 'Collection', emoji: '🗂️' },
  { id: 'matches', label: 'Matches', emoji: '🤝' },
  { id: 'profile', label: 'Profile', emoji: '👤' },
]

export default function BottomNav({ active, onChange, matchBadge }) {
  return (
    <nav className="bottom-nav" aria-label="Main navigation">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={`bottom-nav-item${active === tab.id ? ' active' : ''}`}
          onClick={() => onChange(tab.id)}
        >
          <span className="bottom-nav-emoji" aria-hidden="true">
            {tab.emoji}
            {tab.id === 'matches' && matchBadge > 0 && (
              <span className="nav-badge">{matchBadge > 9 ? '9+' : matchBadge}</span>
            )}
          </span>
          <span className="bottom-nav-label">{tab.label}</span>
        </button>
      ))}
    </nav>
  )
}
