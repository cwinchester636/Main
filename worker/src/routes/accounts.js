import { error, json, newId, generateToken, hashToken } from '../utils.js'
import { publicAccount } from '../auth.js'
import { geocodeZip } from '../geocode.js'

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/
const RADIUS_OPTIONS = [5, 10, 25, 50, 100, 250]

// radiusMiles: absent -> unchanged (updateMe) / unset (createAccount), null
// -> explicitly "no limit", a value not in RADIUS_OPTIONS -> rejected. Keeps
// the DB from accumulating arbitrary user-supplied numbers.
function parseRadius(body, fallback) {
  if (!('radiusMiles' in body)) return fallback
  if (body.radiusMiles === null) return null
  if (RADIUS_OPTIONS.includes(body.radiusMiles)) return body.radiusMiles
  return undefined
}

export async function createAccount(request, env) {
  const body = await request.json().catch(() => null)
  if (!body || typeof body.username !== 'string') return error('username is required')

  const username = body.username.trim()
  if (!USERNAME_RE.test(username)) {
    return error('username must be 3-20 characters: letters, numbers, underscore')
  }

  const avatar = typeof body.avatar === 'string' && body.avatar ? body.avatar : '🙂'
  const zip = typeof body.zip === 'string' && body.zip.trim() ? body.zip.trim() : null
  const radiusMiles = parseRadius(body, null)
  if (radiusMiles === undefined) return error(`radiusMiles must be one of ${RADIUS_OPTIONS.join(', ')}, or null`)

  const existing = await env.DB.prepare('SELECT id FROM accounts WHERE username = ?').bind(username).first()
  if (existing) return error('that username is taken', 409)

  const id = newId()
  const token = generateToken()
  const tokenHash = await hashToken(token)
  const coords = await geocodeZip(zip)

  await env.DB.prepare(
    `INSERT INTO accounts (id, username, token_hash, avatar, zip, lat, lng, radius_miles, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(id, username, tokenHash, avatar, zip, coords?.lat ?? null, coords?.lng ?? null, radiusMiles, Date.now())
    .run()

  return json({ account: { id, username, avatar, zip, radiusMiles }, token }, 201)
}

export function getMe(account) {
  return json({ account: publicAccount(account) })
}

export async function updateMe(request, env, account) {
  const body = await request.json().catch(() => null)
  if (!body) return error('invalid body')

  const avatar = typeof body.avatar === 'string' && body.avatar ? body.avatar : account.avatar
  const zip = typeof body.zip === 'string' ? body.zip.trim() || null : account.zip
  const radiusMiles = parseRadius(body, account.radius_miles)
  if (radiusMiles === undefined) return error(`radiusMiles must be one of ${RADIUS_OPTIONS.join(', ')}, or null`)

  // Only re-geocode when the ZIP actually changed — avoids an external call
  // (and its latency/failure risk) on every unrelated profile save.
  const zipChanged = zip !== account.zip
  const coords = zipChanged ? await geocodeZip(zip) : { lat: account.lat, lng: account.lng }

  await env.DB.prepare('UPDATE accounts SET avatar = ?, zip = ?, lat = ?, lng = ?, radius_miles = ? WHERE id = ?')
    .bind(avatar, zip, coords?.lat ?? null, coords?.lng ?? null, radiusMiles, account.id)
    .run()

  return json({ account: { id: account.id, username: account.username, avatar, zip, radiusMiles } })
}
