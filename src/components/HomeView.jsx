import AvatarIcon from './AvatarIcon.jsx'
import { distanceLabel } from '../utils/distance.js'

export default function HomeView({ account, haves, wants, matches, onNavigate }) {
  const mutualCount = matches.filter((m) => m.isMutual).length
  const topMatches = matches.slice(0, 3)

  return (
    <div className="view">
      <h1 className="home-heading">
        <span>Hey {account.username}</span>
        <AvatarIcon value={account.avatar} size={28} />
      </h1>
      <p className="view-subtitle">Here's what's happening with your trade circle today.</p>

      <div className="stat-row">
        <div className="stat-tile">
          <span className="stat-number">{haves.length}</span>
          <span className="stat-label">Haves</span>
        </div>
        <div className="stat-tile">
          <span className="stat-number">{wants.length}</span>
          <span className="stat-label">Wants</span>
        </div>
        <div className="stat-tile highlight">
          <span className="stat-number">{mutualCount}</span>
          <span className="stat-label">Perfect matches</span>
        </div>
      </div>

      {(haves.length === 0 || wants.length === 0) && (
        <div className="callout">
          <p>Add cards to both your <strong>Have</strong> and <strong>Want</strong> lists to start matching with other collectors.</p>
          <button type="button" className="button primary" onClick={() => onNavigate('collection')}>
            Build my collection
          </button>
        </div>
      )}

      {topMatches.length > 0 && (
        <section>
          <div className="section-title-row">
            <h2>Top matches</h2>
            <button type="button" className="link-button" onClick={() => onNavigate('matches')}>See all</button>
          </div>
          <div className="preview-list">
            {topMatches.map((match) => (
              <button
                key={match.account.id}
                type="button"
                className="preview-row"
                onClick={() => onNavigate('matches')}
              >
                <span className="match-avatar"><AvatarIcon value={match.account.avatar} size={32} /></span>
                <span className="preview-row-text">
                  <strong>{match.account.username}</strong>
                  {distanceLabel(match) && <span className="match-distance">{distanceLabel(match)}</span>}
                </span>
                {match.isMutual && <span className="badge-mutual small">🤝 Match</span>}
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
