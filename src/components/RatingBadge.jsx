// Compact "trustworthy at a glance" signal — positive-rating percentage
// plus how many ratings it's based on, shown wherever a username shows
// (Matches, Trades, Admin). `rating` is { positivePct, count } as returned
// by the API; count === 0 means nobody's rated this account yet.
//
// Pass onClick to make a non-empty badge a button that opens the full list
// of ratings/comments behind the number (see RatingsListModal.jsx) — every
// call site so far reuses the same "view reviews on request" pattern
// rather than showing comments inline everywhere the badge appears.
export default function RatingBadge({ rating, onClick }) {
  if (!rating || rating.count === 0) {
    return <span className="rating-badge rating-badge-empty">No ratings yet</span>
  }
  const label = `${rating.positivePct >= 50 ? '👍' : '👎'} ${rating.positivePct}% (${rating.count})`
  const className = `rating-badge${rating.positivePct < 50 ? ' rating-badge-low' : ''}`

  if (onClick) {
    return (
      <button type="button" className={`${className} rating-badge-button`} onClick={onClick}>
        {label}
      </button>
    )
  }
  return <span className={className}>{label}</span>
}
