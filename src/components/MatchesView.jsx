import { useState } from 'react'
import CardChip from './CardChip.jsx'
import AvatarIcon from './AvatarIcon.jsx'
import ValueDisparityModal from './ValueDisparityModal.jsx'
import PhotoViewerModal from './PhotoViewerModal.jsx'
import CashInput from './CashInput.jsx'
import RatingBadge from './RatingBadge.jsx'
import { distanceLabel } from '../utils/distance.js'
import { checkValueDisparity } from '../utils/tradeValue.js'

function MatchCard({ match, isProposed, onPropose, token, isSuspended }) {
  const [open, setOpen] = useState(false)
  const [proposing, setProposing] = useState(false)
  const [checkingValue, setCheckingValue] = useState(false)
  const [disparity, setDisparity] = useState(null)
  const [viewingPhotoId, setViewingPhotoId] = useState(null)
  const [cashInput, setCashInput] = useState('')
  const { account, theyHaveYouWant, youHaveTheyWant, isMutual } = match
  const proximityLabel = distanceLabel(match)
  const cashAmount = Number(cashInput) || 0

  const doPropose = async () => {
    setProposing(true)
    await onPropose(account.id, cashAmount)
    setProposing(false)
  }

  const handleProposeClick = async () => {
    setCheckingValue(true)
    const result = await checkValueDisparity(theyHaveYouWant, youHaveTheyWant, { yourCash: cashAmount })
    setCheckingValue(false)
    if (result?.imbalanced) setDisparity(result)
    else await doPropose()
  }

  return (
    <div className={`match-card${isMutual ? ' mutual' : ''}`}>
      <button type="button" className="match-card-summary" onClick={() => setOpen((v) => !v)}>
        <span className="match-avatar"><AvatarIcon value={account.avatar} size={36} /></span>
        <span className="match-summary-text">
          <span className="match-name-row">
            <strong>{account.username}</strong>
            <RatingBadge rating={account.rating} />
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
                  <CardChip key={card.id} card={card} compact onViewPhoto={setViewingPhotoId} />
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

          {isSuspended ? (
            <p className="form-error">
              Your account has been suspended by an admin — you can't propose new trades right now.
            </p>
          ) : (
            <>
              {!isProposed && (
                <CashInput
                  value={cashInput}
                  onChange={setCashInput}
                  label={`Add cash toward ${account.username}'s cards (optional)`}
                />
              )}

              <button
                type="button"
                className={`button ${isProposed ? 'secondary' : 'primary'} full`}
                disabled={isProposed || proposing || checkingValue}
                onClick={handleProposeClick}
              >
                {isProposed
                  ? '✓ Trade in progress — see Trades tab'
                  : checkingValue
                    ? 'Checking card values…'
                    : `Propose trade to ${account.username}`}
              </button>
            </>
          )}
        </div>
      )}

      {disparity && (
        <ValueDisparityModal
          theirLabel={`${account.username}'s cards`}
          yourLabel="Your cards"
          theirValue={disparity.theirValue}
          yourValue={disparity.yourValue}
          yourCash={cashAmount}
          disparity={disparity.disparity}
          onCancel={() => setDisparity(null)}
          onConfirm={async () => {
            setDisparity(null)
            await doPropose()
          }}
        />
      )}

      {viewingPhotoId && (
        <PhotoViewerModal token={token} itemId={viewingPhotoId} onClose={() => setViewingPhotoId(null)} />
      )}
    </div>
  )
}

export default function MatchesView({ matches, hasHaves, hasWants, proposedAccountIds, onPropose, token, isSuspended }) {
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
          : 'No matches yet — try adding more cards to your lists, widening your search radius in Profile, or check back once more collectors join.'}
      </p>

      <div className="match-list">
        {matches.map((match) => (
          <MatchCard
            key={match.account.id}
            match={match}
            token={token}
            isProposed={proposedAccountIds.includes(match.account.id)}
            onPropose={onPropose}
            isSuspended={isSuspended}
          />
        ))}
      </div>
    </div>
  )
}
