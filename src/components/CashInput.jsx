// A noted cash amount to sweeten a trade — never processed by the app,
// just recorded and shown alongside the cards (see README "Trades &
// verification"). Shared between proposing (MatchesView) and accepting
// (TradesView), since each side sets its own amount at its own step.
export default function CashInput({ value, onChange, label = 'Add cash (optional)' }) {
  return (
    <label className="cash-input">
      <span className="field-label">{label}</span>
      <span className="cash-input-row">
        <span className="cash-input-prefix">$</span>
        <input
          type="number"
          className="text-input"
          min="0"
          step="0.01"
          inputMode="decimal"
          placeholder="0.00"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </span>
    </label>
  )
}
