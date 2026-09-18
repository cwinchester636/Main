import { useState } from 'react'
import CardChip from './CardChip.jsx'

function MatchCard({ match, isProposed, onPropose }) {
  const [open, setOpen] = useState(false)
  const { collector, theyHaveYouWant, youHaveTheyWant, isMutual } = match

  return (
    <div className={`match-card${isMutual ? ' mutual' : ''}`}>
      <button type="button" className="match-card-summary" onClick={() => setOpen((v) => !v)}>
        <span className="match-avatar" aria-hidden="true">{collector.avatar}</span>
        <span className="match-summary-text">
          <span className="match-name-row">
            <strong>{collector.name}</strong>
            <span className="match-distance">{collector.distanceMi} mi</span>
          </span>
          <span className={`match-badge ${isMutual ? 'badge-mutual' : 'badge-partial'}`}>
            {isMutual ? '🤝 Perfect trade match' : theyHaveYouWant.length > 0 ? 'Has cards you want' : 'Wants cards you have'}
          </span>
        </span>
        <span className="match-chevron" aria-hidden="true">{open ? '︿' : '﹀'}</span>
      </button>

      {open && (
        <div className="match-detail">
          {theyHaveYouWant.length > 0 && (
            <div className="match-detail-col">
              <h3>They have (you want)</h3>
              <div className="card-chip-list">
                {theyHaveYouWant.map((card) => (
                  <CardChip key={card.id} card={card} compact />
                ))}
              </div>
            </div>
          )}
          {youHaveTheyWant.length > 0 && (
            <div className="match-detail-col">
              <h3>You have (they want)</h3>
              <div className="card-chip-list">
                {youHaveTheyWant.map((card) => (
                  <CardChip key={card.id} card={card} compact />
                ))}
              </div>
            </div>
          )}

          <button
            type="button"
            className={`button ${isProposed ? 'secondary' : 'primary'} full`}
            disabled={isProposed}
            onClick={() => onPropose(collector.id)}
          >
            {isProposed ? '✓ Trade proposal sent' : `Propose trade to ${collector.name.split(' ')[0]}`}
          </button>
        </div>
      )}
    </div>
  )
}

export default function MatchesView({ matches, hasHaves, hasWants, proposedIds, onPropose }) {
  if (!hasHaves || !hasWants) {
    return (
      <div className="view">
        <h1>Matches</h1>
        <div className="empty-state">
          <span className="empty-state-emoji">🃏</span>
          <p>Add at least one card to both your <strong>Haves</strong> and <strong>Wants</strong> lists to see trade matches from nearby collectors.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="view">
      <h1>Matches</h1>
      <p className="view-subtitle">
        {matches.length > 0
          ? `${matches.length} nearby collector${matches.length === 1 ? '' : 's'} match your lists.`
          : 'No matches yet — try adding more cards to your lists.'}
      </p>

      <div className="match-list">
        {matches.map((match) => (
          <MatchCard
            key={match.collector.id}
            match={match}
            isProposed={proposedIds.includes(match.collector.id)}
            onPropose={onPropose}
          />
        ))}
      </div>
    </div>
  )
}
