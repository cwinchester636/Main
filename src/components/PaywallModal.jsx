import { FREE_COLLECTION_LIMIT, FREE_MAX_RADIUS_MILES } from '../utils/entitlements.js'

// Shown wherever a free-tier limit blocks an action (collection cap, radius
// cap, push notifications) — same modal every time, just a different
// `reason` line at the top explaining what triggered it. Purchasing isn't
// wired up yet (see README "Pro tier / paywall" and "Mobile app
// (Capacitor)") — deliberately not pretending otherwise with a button that
// doesn't work.
export default function PaywallModal({ reason, onClose }) {
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-header">
          <h2>⭐ SwapDeck Pro</h2>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close">×</button>
        </div>

        {reason && <p className="form-error">{reason}</p>}

        <ul className="paywall-perks">
          <li>Unlimited cards in Haves and Wants (free: {FREE_COLLECTION_LIMIT} each)</li>
          <li>Search any distance for matches (free: up to {FREE_MAX_RADIUS_MILES} miles)</li>
          <li>Push notifications for new matches, trades, and events</li>
          <li>A Pro badge on your profile and next to your name</li>
        </ul>

        <p className="section-hint">
          Purchasing isn't set up yet — check back soon.
        </p>
      </div>
    </div>
  )
}
