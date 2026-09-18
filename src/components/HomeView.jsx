import { getCardPrice } from '../data/pricing/mockTcgplayerPricing.js'

function estimatedValue(cards) {
  return cards.reduce((sum, card) => sum + (getCardPrice(card.id)?.marketPrice ?? 0), 0)
}

export default function HomeView({ profile, haves, wants, matches, onNavigate }) {
  const mutualCount = matches.filter((m) => m.isMutual).length
  const topMatches = matches.slice(0, 3)
  const havesValue = estimatedValue(haves)

  return (
    <div className="view">
      <h1>Hey {profile.name || 'there'} {profile.avatar}</h1>
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

      {havesValue > 0 && (
        <p className="value-note" title="Estimated value — demo pricing, not live TCGplayer data">
          💰 Your Haves are worth an estimated <strong>${havesValue.toFixed(2)}</strong>
        </p>
      )}

      {(haves.length === 0 || wants.length === 0) && (
        <div className="callout">
          <p>Add cards to both your <strong>Have</strong> and <strong>Want</strong> lists to start matching with nearby collectors.</p>
          <button type="button" className="button primary" onClick={() => onNavigate('collection')}>
            Build my collection
          </button>
        </div>
      )}

      {topMatches.length > 0 && (
        <section>
          <div className="section-title-row">
            <h2>Top matches near you</h2>
            <button type="button" className="link-button" onClick={() => onNavigate('matches')}>See all</button>
          </div>
          <div className="preview-list">
            {topMatches.map((match) => (
              <button
                key={match.collector.id}
                type="button"
                className="preview-row"
                onClick={() => onNavigate('matches')}
              >
                <span className="match-avatar" aria-hidden="true">{match.collector.avatar}</span>
                <span className="preview-row-text">
                  <strong>{match.collector.name}</strong>
                  <span className="match-distance">{match.collector.distanceMi} mi away</span>
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
