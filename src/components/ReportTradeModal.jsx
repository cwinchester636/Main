import { useState } from 'react'
import { api, ApiError } from '../api/client.js'
import { getCurrentLocation } from '../utils/geolocation.js'

const REASONS = [
  { id: 'not_received', label: "Never received the card" },
  { id: 'not_as_described', label: 'Card not as described' },
  { id: 'no_show', label: "Other person didn't show/respond" },
  { id: 'payment_dispute', label: "Cash wasn't paid as agreed" },
  { id: 'other', label: 'Something else' },
]

export default function ReportTradeModal({ token, tradeId, onClose, onSubmitted }) {
  const [reason, setReason] = useState(null)
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [locationStatus, setLocationStatus] = useState('idle') // idle | requesting | granted | unavailable

  const handleSubmit = async () => {
    if (!reason) return
    setSubmitting(true)
    setError('')
    setLocationStatus('requesting')

    const location = await getCurrentLocation()
    setLocationStatus(location ? 'granted' : 'unavailable')

    try {
      await api.reportTrade(token, tradeId, {
        reason,
        description: description.trim() || undefined,
        lat: location?.lat,
        lng: location?.lng,
        accuracyMeters: location?.accuracyMeters,
      })
      onSubmitted()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not submit the report.')
      setSubmitting(false)
    }
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-header">
          <h2>Report an issue</h2>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close">×</button>
        </div>

        <p className="section-hint">
          This goes to SwapDeck admins for review — it won't notify the other person. If your browser asks for your
          location when you submit, that's to help admins verify what happened; you can decline and the report still
          goes through.
        </p>

        <p className="field-label">What happened?</p>
        <div className="pill-row report-reason-row" role="group" aria-label="Report reason">
          {REASONS.map((r) => (
            <button
              key={r.id}
              type="button"
              className={`pill${reason === r.id ? ' active' : ''}`}
              onClick={() => setReason(r.id)}
            >
              {r.label}
            </button>
          ))}
        </div>

        <label className="field-label" htmlFor="report-description">Details (optional)</label>
        <textarea
          id="report-description"
          className="text-input textarea"
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Anything that would help admins understand what happened…"
        />

        {locationStatus === 'requesting' && (
          <p className="picker-status">Requesting your location (you can decline)…</p>
        )}
        {error && <p className="form-error">{error}</p>}

        <button type="button" className="button primary full" disabled={!reason || submitting} onClick={handleSubmit}>
          {submitting ? 'Submitting…' : 'Submit report'}
        </button>
      </div>
    </div>
  )
}
