import { useState } from 'react'
import CardChip from './CardChip.jsx'
import AvatarIcon from './AvatarIcon.jsx'

const PROXIMITY_LABEL = ['Same ZIP code', 'Nearby (same area)', null]

function MatchCard({ match, isProposed, onPropose }) {
  const [open, setOpen] = useState(false)
  const [proposing, setProposing] = useState(false)
  const { account, theyHaveYouWant, youHaveTheyWant, isMutual, proximity } = match
  const proximityLabel = PROXIMITY_LABEL[proximity]

  return (
    <div className={`match-card${isMutual ? ' mutual' : ''}`}>
      <button type="button" className="match-card-summary" onClick={() => setOpen((v) => !v)}>
        <span className="match-avatar"><AvatarIcon value={account.avatar} size={36} /></span>
        <span className="match-summary-text">
          <span className="match-name-row">
            <strong>{account.username}</strong>
            {proximityLabel && <span className="match-distance">{proximityLabel}</span>}
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
            disabled={isProposed || proposing}
            onClick={async () => {
              setProposing(true)
              await onPropose(account.id)
              setProposing(false)
            }}
          >
            {isProposed ? '✓ Trade in progress — see Trades tab' : `Propose trade to ${account.username}`}
          </button>
        </div>
      )}
    </div>
  )
}

export default function MatchesView({ matches, hasHaves, hasWants, proposedAccountIds, onPropose }) {
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
          ? `${matches.length} collector${matches.length === 1 ? '' : 's'} match your lists.`
          : 'No matches yet — try adding more cards to your lists, or check back once more collectors join.'}
      </p>

      <div className="match-list">
        {matches.map((match) => (
          <MatchCard
            key={match.account.id}
            match={match}
            isProposed={proposedAccountIds.includes(match.account.id)}
            onPropose={onPropose}
          />
        ))}
      </div>
    </div>
  )
}
