import { error, json, newId, haversineMiles, zipProximity } from '../utils.js'
import { geocodeZip } from '../geocode.js'
import { isAdminUsername } from '../admin.js'
import { notifyAccount } from '../push.js'

const MAX_TITLE_LENGTH = 120
const MAX_DESCRIPTION_LENGTH = 1000
const MAX_LOCATION_LENGTH = 120
const MAX_GAME_LENGTH = 40

// A person who left radiusMiles at "any distance" for card matching (where
// shipping makes distance mostly irrelevant) almost certainly didn't mean
// "wake me up for an event on the other side of the country" — physically
// showing up is the whole point of an event. So unlike matches.js, which
// treats a null radius as truly unlimited, the *notification* trigger below
// caps it at this default instead. Browsing the Events list itself still
// respects an explicit "any distance" setting with no cap — see listEvents.
const DEFAULT_NOTIFY_RADIUS_MILES = 50

function serializeEvent(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    game: row.game,
    locationName: row.location_name,
    zip: row.zip,
    eventAt: row.event_at,
    link: row.link,
    createdAt: row.created_at,
    createdBy: { id: row.created_by_account_id, username: row.creator_username },
  }
}

// Upcoming events near the caller, same distance-filtering rule as
// getMatches: a radius only ever narrows results for events we could
// actually measure -- one with no geocoded lat/lng (zip didn't resolve) or
// belonging to a caller with no geocoded lat/lng is never hidden just
// because we can't confirm it's outside the radius.
export async function listEvents(env, account) {
  const rows = await env.DB.prepare(
    `SELECT le.*, a.username AS creator_username
     FROM local_events le
     JOIN accounts a ON a.id = le.created_by_account_id
     WHERE le.event_at >= ?
     ORDER BY le.event_at ASC`,
  )
    .bind(Date.now())
    .all()

  const events = rows.results
    .map((row) => {
      const distanceMiles = haversineMiles(account.lat, account.lng, row.lat, row.lng)
      return {
        ...serializeEvent(row),
        distanceMiles: distanceMiles === null ? null : Math.round(distanceMiles * 10) / 10,
        proximity: zipProximity(account.zip, row.zip),
      }
    })
    .filter((e) => account.radius_miles == null || e.distanceMiles == null || e.distanceMiles <= account.radius_miles)
    .sort((a, b) => a.eventAt - b.eventAt)

  return json({ events })
}

export async function createEvent(request, env, account, ctx) {
  const body = await request.json().catch(() => null)
  if (!body) return error('malformed request')

  const title = typeof body.title === 'string' ? body.title.trim() : ''
  if (!title) return error('title is required')
  if (title.length > MAX_TITLE_LENGTH) return error(`title must be ${MAX_TITLE_LENGTH} characters or fewer`)

  const zip = typeof body.zip === 'string' ? body.zip.trim() : ''
  if (!zip) return error('zip is required')

  const eventAt = Number(body.eventAt)
  if (!Number.isFinite(eventAt) || eventAt < Date.now()) {
    return error('eventAt must be a valid future date/time')
  }

  const description =
    typeof body.description === 'string' ? body.description.trim().slice(0, MAX_DESCRIPTION_LENGTH) || null : null
  const locationName =
    typeof body.locationName === 'string' ? body.locationName.trim().slice(0, MAX_LOCATION_LENGTH) || null : null
  const game = typeof body.game === 'string' ? body.game.trim().slice(0, MAX_GAME_LENGTH) || null : null

  let link = typeof body.link === 'string' ? body.link.trim() : ''
  if (link && !/^https?:\/\//i.test(link)) return error('link must start with http:// or https://')
  link = link || null

  const coords = await geocodeZip(zip)
  const id = newId()
  const createdAt = Date.now()

  await env.DB.prepare(
    `INSERT INTO local_events
       (id, created_by_account_id, title, description, game, location_name, zip, lat, lng, event_at, link, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      id,
      account.id,
      title,
      description,
      game,
      locationName,
      zip,
      coords?.lat ?? null,
      coords?.lng ?? null,
      eventAt,
      link,
      createdAt,
    )
    .run()

  const event = {
    id,
    title,
    description,
    game,
    locationName,
    zip,
    eventAt,
    link,
    createdAt,
    createdBy: { id: account.id, username: account.username },
  }

  // Only fires when the event itself resolved to real coordinates -- with
  // no location to measure from, there's no way to confirm anyone's
  // actually "in the area", and guessing wrong means spamming people with
  // an irrelevant alert. The event still gets saved either way; it just
  // won't proactively notify anyone, though it can still be found by
  // browsing (zip-prefix proximity still works without lat/lng).
  if (coords) {
    ctx?.waitUntil(notifyNearbyAccounts(env, account, { ...event, lat: coords.lat, lng: coords.lng }))
  }

  return json({ event }, 201)
}

async function notifyNearbyAccounts(env, creator, event) {
  try {
    const rows = await env.DB.prepare(
      `SELECT id, lat, lng, radius_miles FROM accounts
       WHERE id != ? AND lat IS NOT NULL AND lng IS NOT NULL`,
    )
      .bind(creator.id)
      .all()

    const nearby = rows.results.filter((row) => {
      const distance = haversineMiles(row.lat, row.lng, event.lat, event.lng)
      if (distance === null) return false
      const radius = row.radius_miles ?? DEFAULT_NOTIFY_RADIUS_MILES
      return distance <= radius
    })

    await Promise.all(
      nearby.map((row) =>
        notifyAccount(env, row.id, {
          title: 'New local event',
          body: `${creator.username} posted "${event.title}"${event.locationName ? ` at ${event.locationName}` : ''}`,
          tag: `event-${event.id}`,
        }),
      ),
    )
  } catch (err) {
    console.error('notifyNearbyAccounts failed', err)
  }
}

export async function deleteEvent(env, account, eventId) {
  const row = await env.DB.prepare('SELECT created_by_account_id FROM local_events WHERE id = ?')
    .bind(eventId)
    .first()
  if (!row) return error('not found', 404)

  const isOwner = row.created_by_account_id === account.id
  if (!isOwner && !isAdminUsername(account.username, env)) {
    return error('only the event’s creator or an admin can delete it', 403)
  }

  await env.DB.prepare('DELETE FROM local_events WHERE id = ?').bind(eventId).run()
  return json({ deleted: eventId })
}
