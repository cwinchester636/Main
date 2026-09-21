// Compact "trustworthy at a glance" signal — positive-rating percentage
// plus how many ratings it's based on, shown wherever a username shows
// (Matches, Trades, Admin). `rating` is { positivePct, count } as returned
// by the API; count === 0 means nobody's rated this account yet.
export default function RatingBadge({ rating }) {
  if (!rating || rating.count === 0) {
    return <span className="rating-badge rating-badge-empty">No ratings yet</span>
  }
  return (
    <span className={`rating-badge${rating.positivePct < 50 ? ' rating-badge-low' : ''}`}>
      {rating.positivePct >= 50 ? '👍' : '👎'} {rating.positivePct}% ({rating.count})
    </span>
  )
}
