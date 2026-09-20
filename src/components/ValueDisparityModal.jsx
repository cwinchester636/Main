import { formatUSD } from '../utils/currency.js'

export default function ValueDisparityModal({ theirLabel, yourLabel, theirValue, yourValue, disparity, onCancel, onConfirm }) {
  return (
    <div className="sheet-backdrop" onClick={onCancel}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-header">
          <h2>⚠️ Value mismatch</h2>
          <button type="button" className="icon-button" onClick={onCancel} aria-label="Close">×</button>
        </div>

        <p>These two sides aren't close in value — about {Math.round(disparity * 100)}% apart.</p>

        <div className="disparity-row">
          <span>{theirLabel}</span>
          <strong>{formatUSD(theirValue)}</strong>
        </div>
        <div className="disparity-row">
          <span>{yourLabel}</span>
          <strong>{formatUSD(yourValue)}</strong>
        </div>

        <p className="section-hint">
          Based on current market prices for cards with a known live price — cards without one aren't counted, so the
          real gap could be smaller (or larger) than this.
        </p>

        <div className="trade-actions">
          <button type="button" className="button secondary" onClick={onCancel}>Cancel</button>
          <button type="button" className="button primary" onClick={onConfirm}>Proceed anyway</button>
        </div>
      </div>
    </div>
  )
}
