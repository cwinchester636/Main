export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  })
}

export function error(message, status = 400) {
  return json({ error: message }, status)
}

export function handleOptions() {
  return new Response(null, { status: 204, headers: CORS_HEADERS })
}

// A suspended account (accounts.suspended_at, set only by an admin — see
// migrations/0012_ratings_and_suspension.sql) can still log in and manage
// their own collection; this is the specific gate the handful of routes
// that could do more harm (proposing/responding to/confirming a trade,
// sending a chat message) each call before doing anything else. Not
// enforced in authenticate() itself, deliberately — suspension blocks
// specific actions, not the account.
export function requireNotSuspended(account) {
  return account.suspended_at
    ? error(
        'your account has been suspended by an admin — you can still log in and manage your collection, but can’t trade or message other users',
        403,
      )
    : null
}

// Nullable timestamp, same convention as suspended_at above: null means
// never/no-longer Pro, a future timestamp means active Pro until then (past
// means it lapsed — no separate cleanup needed, this check alone handles
// expiry). See README "Pro tier / paywall".
export function isPro(row) {
  return !!row.pro_until && row.pro_until > Date.now()
}

// Free-tier limits enforced server-side wherever they matter — see
// addCollectionItem (collection.js), updateMe (accounts.js), and subscribe
// (push.js). Never trust a client-side check alone for these.
export const FREE_COLLECTION_LIMIT = 25
export const FREE_MAX_RADIUS_MILES = 5

// See worker/src/routes/accounts.js (recording a referral) and
// worker/src/routes/ratings.js (granting the reward). REFERRAL_REWARD_CAP
// bounds a single referrer's total lifetime payout even from real,
// distinct referred accounts -- a ceiling on worst-case abuse, not a
// substitute for the fraud checks at signup time.
export const REFERRAL_REWARD_DAYS = 30
export const REFERRAL_REWARD_CAP = 12

// Gmail (and Google Workspace's own googlemail.com alias) ignores dots in
// the local part and anything after a `+`, so "name@gmail.com",
// "n.a.me@gmail.com", and "name+ref2@gmail.com" all deliver to the same
// real inbox -- a well-known trick for making one person's signups look
// like distinct "friends" to a referral system. Deliberately gmail-only:
// other providers don't reliably share either convention, and normalizing
// a provider that treats dots as significant would falsely collide two
// real different mailboxes. Used only for the referral fraud check below,
// never for login/uniqueness -- two accounts with dot-variant Gmail
// addresses are still two genuinely separate accounts for every other
// purpose in this app.
export function normalizeEmailForFraudCheck(email) {
  const [local, domain] = email.toLowerCase().split('@')
  if (domain !== 'gmail.com' && domain !== 'googlemail.com') return email.toLowerCase()
  return `${local.split('+')[0].replace(/\./g, '')}@gmail.com`
}

export function newId() {
  return crypto.randomUUID()
}

export function generateToken() {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')
}

function bytesToHex(bytes) {
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')
}

function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.substr(i * 2, 2), 16)
  return bytes
}

export async function hashToken(token) {
  const data = new TextEncoder().encode(token)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return bytesToHex(new Uint8Array(digest))
}

// PBKDF2, not a plain digest — unlike the 256-bit random session token
// above, a password has real-world-guessable entropy, so it needs a slow,
// salted KDF rather than a fast hash. 100k iterations matches OWASP's
// current PBKDF2-SHA256 baseline.
const PBKDF2_ITERATIONS = 100_000

export async function hashPassword(password, saltHex) {
  const salt = saltHex ? hexToBytes(saltHex) : crypto.getRandomValues(new Uint8Array(16))
  const keyMaterial = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, [
    'deriveBits',
  ])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    256,
  )
  return { hash: bytesToHex(new Uint8Array(bits)), salt: bytesToHex(salt) }
}

// Constant-time comparison — a hash mismatch found via early-exit ===
// leaks how many leading hex characters matched, timing-attack territory
// for something derived from a secret.
export function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

export async function verifyPassword(password, saltHex, expectedHashHex) {
  const { hash } = await hashPassword(password, saltHex)
  return timingSafeEqual(hash, expectedHashHex)
}

export function matchKey(game, name) {
  return `${game}::${name.trim().toLowerCase()}`
}

// Shared by every route that serves a verification photo (a live
// collection item, or a trade's snapshot copy) once that route has
// already decided the requester is allowed to see it — this only handles
// the KV read and Response shape, never the authorization itself.
export async function servePhoto(env, photoKey) {
  if (!photoKey) return error('not found', 404)

  const object = await env.PHOTOS.getWithMetadata(photoKey, 'arrayBuffer')
  if (!object?.value) return error('photo not found', 404)

  return new Response(object.value, {
    headers: {
      'Content-Type': object.metadata?.contentType || 'image/jpeg',
      'Cache-Control': 'private, max-age=3600',
      ...CORS_HEADERS,
    },
  })
}

// Coarse, privacy-friendly proximity: no real geodistance, just how much of
// the zip code matches. 0 = same zip, 1 = same 3-digit prefix (same region),
// 2 = unknown or no overlap. Used as a fallback label when one or both
// accounts don't have a geocoded lat/lng yet — see haversineMiles below.
export function zipProximity(zipA, zipB) {
  if (!zipA || !zipB) return 2
  if (zipA === zipB) return 0
  if (zipA.slice(0, 3) === zipB.slice(0, 3)) return 1
  return 2
}

const EARTH_RADIUS_MILES = 3958.8

// Real great-circle distance in miles, when both accounts have a geocoded
// ZIP centroid. Returns null if either is missing lat/lng (unranked ZIP
// input, or geocoding never succeeded) — callers fall back to zipProximity.
export function haversineMiles(latA, lngA, latB, lngB) {
  if (latA == null || lngA == null || latB == null || lngB == null) return null

  const toRad = (deg) => (deg * Math.PI) / 180
  const dLat = toRad(latB - latA)
  const dLng = toRad(lngB - lngA)
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(latA)) * Math.cos(toRad(latB)) * Math.sin(dLng / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return EARTH_RADIUS_MILES * c
}
