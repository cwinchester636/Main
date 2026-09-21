import { useState } from 'react'
import AddEventModal from './AddEventModal.jsx'
import { distanceLabel } from '../utils/distance.js'
import { api, ApiError } from '../api/client.js'

function formatEventDate(ts) {
  return new Date(ts).toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function EventCard({ event, canDelete, token, onDeleted }) {
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const [rsvpBusy, setRsvpBusy] = useState(false)
  const [going, setGoing] = useState(event.going)
  const [rsvpCount, setRsvpCount] = useState(event.rsvpCount)
  const proximityLabel = distanceLabel(event)

  const handleDelete = async () => {
    if (!window.confirm(`Remove "${event.title}"?`)) return
    setDeleting(true)
    setError('')
    try {
      await api.deleteEvent(token, event.id)
      onDeleted(event.id)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not remove this event.')
      setDeleting(false)
    }
  }

  const handleToggleRsvp = async () => {
    setRsvpBusy(true)
    setError('')
    try {
      const result = await api.rsvpToEvent(token, event.id)
      setGoing(result.going)
      setRsvpCount(result.rsvpCount)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not update your RSVP.')
    } finally {
      setRsvpBusy(false)
    }
  }

  return (
    <div className="event-card">
      <div className="event-card-header">
        <div>
          <strong>{event.title}</strong>
          <p className="section-hint">
            {formatEventDate(event.eventAt)}
            {event.locationName ? ` · ${event.locationName}` : ''}
            {proximityLabel ? ` · ${proximityLabel}` : ''}
          </p>
        </div>
      </div>

      {event.description && <p className="event-description">{event.description}</p>}

      <p className="section-hint">
        Posted by {event.createdBy.username}
        {event.link && (
          <>
            {' · '}
            <a href={event.link} target="_blank" rel="noreferrer">Event link</a>
          </>
        )}
      </p>

      {error && <p className="form-error">{error}</p>}

      <div className="event-footer-actions">
        <button
          type="button"
          className={`button small ${going ? 'secondary' : 'primary'}`}
          disabled={rsvpBusy}
          onClick={handleToggleRsvp}
        >
          {going ? '✓ Going' : "I'm going"}
        </button>
        <span className="section-hint">
          {rsvpCount} going
        </span>
        {canDelete && (
          <button type="button" className="link-button danger" disabled={deleting} onClick={handleDelete}>
            {deleting ? 'Removing…' : 'Remove event'}
          </button>
        )}
      </div>
    </div>
  )
}

export default function EventsView({ events, token, currentAccountId, isAdmin, onCreated, onDeleted }) {
  const [addOpen, setAddOpen] = useState(false)

  return (
    <div className="view">
      <h1>Events</h1>
      <p className="view-subtitle">
        {events.length > 0
          ? `${events.length} upcoming event${events.length === 1 ? '' : 's'} near you.`
          : 'No upcoming events near you yet — be the first to post one.'}
      </p>

      <button type="button" className="button primary full" onClick={() => setAddOpen(true)}>
        + Post a local event
      </button>

      {events.length > 0 && (
        <div className="event-list">
          {events.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              token={token}
              canDelete={isAdmin || event.createdBy.id === currentAccountId}
              onDeleted={onDeleted}
            />
          ))}
        </div>
      )}

      {addOpen && (
        <AddEventModal
          token={token}
          onClose={() => setAddOpen(false)}
          onCreated={(event) => {
            setAddOpen(false)
            onCreated(event)
          }}
        />
      )}
    </div>
  )
}
