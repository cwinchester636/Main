import { useEffect, useState } from 'react'
import { api, ApiError } from '../api/client.js'

function formatDate(ts) {
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function RatingsListModal({ token, accountId, username, onClose }) {
  const [ratings, setRatings] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .getAccountRatings(token, accountId)
      .then(({ ratings: list }) => setRatings(list))
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load ratings.'))
  }, [token, accountId])

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-header">
          <h2>{username}'s ratings</h2>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close">×</button>
        </div>

        {error && <p className="form-error">{error}</p>}
        {!error && !ratings && <p className="section-hint">Loading…</p>}
        {ratings && ratings.length === 0 && <p className="section-hint">No ratings yet.</p>}

        {ratings && ratings.length > 0 && (
          <div className="ratings-list">
            {ratings.map((r, i) => (
              <div key={i} className="ratings-list-item">
                <p className="ratings-list-meta">
                  <strong>{r.thumbsUp ? '👍 Good trade' : '👎 Bad trade'}</strong>
                  <span className="section-hint"> — {r.raterUsername} · {formatDate(r.createdAt)}</span>
                </p>
                {r.comment && <p className="ratings-list-comment">{r.comment}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
