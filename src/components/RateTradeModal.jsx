import { useState } from 'react'
import { api, ApiError } from '../api/client.js'

export default function RateTradeModal({ token, tradeId, counterpartyUsername, existingRating, onClose, onRated }) {
  const [thumbsUp, setThumbsUp] = useState(existingRating ?? null)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (thumbsUp === null) return
    setSubmitting(true)
    setError('')
    try {
      await api.rateTrade(token, tradeId, thumbsUp, comment.trim() || undefined)
      onRated(thumbsUp)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not submit your rating.')
      setSubmitting(false)
    }
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-header">
          <h2>Rate {counterpartyUsername}</h2>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close">×</button>
        </div>

        <p className="section-hint">
          How did this trade go? This is visible on {counterpartyUsername}'s profile to help other collectors decide
          who to trade with.
        </p>

        <div className="rate-choice-row">
          <button
            type="button"
            className={`rate-choice${thumbsUp === true ? ' active-positive' : ''}`}
            onClick={() => setThumbsUp(true)}
          >
            👍 Good trade
          </button>
          <button
            type="button"
            className={`rate-choice${thumbsUp === false ? ' active-negative' : ''}`}
            onClick={() => setThumbsUp(false)}
          >
            👎 Bad trade
          </button>
        </div>

        <label className="field-label" htmlFor="rate-comment">Comment (optional)</label>
        <textarea
          id="rate-comment"
          className="text-input textarea"
          rows={3}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Anything else worth knowing about trading with this person…"
        />

        {error && <p className="form-error">{error}</p>}

        <button
          type="button"
          className="button primary full"
          disabled={thumbsUp === null || submitting}
          onClick={handleSubmit}
        >
          {submitting ? 'Submitting…' : 'Submit rating'}
        </button>
      </div>
    </div>
  )
}
