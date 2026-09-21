import { useState } from 'react'
import { api, ApiError } from '../api/client.js'

// datetime-local gives "YYYY-MM-DDTHH:mm" in the browser's local time with
// no timezone info — Date parses that as local time too, so the round trip
// is consistent without any manual timezone math.
function toTimestamp(datetimeLocal) {
  const ms = new Date(datetimeLocal).getTime()
  return Number.isFinite(ms) ? ms : null
}

export default function AddEventModal({ token, onClose, onCreated }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [locationName, setLocationName] = useState('')
  const [zip, setZip] = useState('')
  const [eventDatetime, setEventDatetime] = useState('')
  const [link, setLink] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const eventAt = toTimestamp(eventDatetime)
  // Not also checking eventAt is in the future here — Date.now() is impure
  // to call during render, and time passing while someone's mid-form isn't
  // worth guarding against client-side anyway. The server rejects a past
  // date/time either way (see worker/src/routes/events.js) and that error
  // surfaces the normal way below.
  const canSubmit = title.trim() && zip.trim() && eventAt

  const handleSubmit = async () => {
    if (!canSubmit) return
    setSubmitting(true)
    setError('')
    try {
      const { event } = await api.createEvent(token, {
        title: title.trim(),
        description: description.trim() || undefined,
        locationName: locationName.trim() || undefined,
        zip: zip.trim(),
        eventAt,
        link: link.trim() || undefined,
      })
      onCreated(event)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not post this event.')
      setSubmitting(false)
    }
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-header">
          <h2>Post a local event</h2>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close">×</button>
        </div>

        <p className="section-hint">
          Visible to every collector, and anyone nearby with notifications on gets an alert the moment you post it.
        </p>

        <label className="field-label" htmlFor="event-title">Title</label>
        <input
          id="event-title"
          type="text"
          className="text-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Friday Night Standard Tournament"
        />

        <label className="field-label" htmlFor="event-location">Location name (optional)</label>
        <input
          id="event-location"
          type="text"
          className="text-input"
          value={locationName}
          onChange={(e) => setLocationName(e.target.value)}
          placeholder="Joe's Card Shop"
        />

        <label className="field-label" htmlFor="event-zip">ZIP code</label>
        <input
          id="event-zip"
          type="text"
          className="text-input"
          value={zip}
          onChange={(e) => setZip(e.target.value)}
          placeholder="Used to show how far away this is"
        />

        <label className="field-label" htmlFor="event-datetime">Date &amp; time</label>
        <input
          id="event-datetime"
          type="datetime-local"
          className="text-input"
          value={eventDatetime}
          onChange={(e) => setEventDatetime(e.target.value)}
        />

        <label className="field-label" htmlFor="event-description">Details (optional)</label>
        <textarea
          id="event-description"
          className="text-input textarea"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Format, entry fee, anything worth knowing…"
        />

        <label className="field-label" htmlFor="event-link">Link (optional)</label>
        <input
          id="event-link"
          type="text"
          className="text-input"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder="https://…"
        />

        {error && <p className="form-error">{error}</p>}

        <button type="button" className="button primary full" disabled={!canSubmit || submitting} onClick={handleSubmit}>
          {submitting ? 'Posting…' : 'Post event'}
        </button>
      </div>
    </div>
  )
}
