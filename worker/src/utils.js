const CORS_HEADERS = {
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

export function newId() {
  return crypto.randomUUID()
}

export function generateToken() {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export async function hashToken(token) {
  const data = new TextEncoder().encode(token)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export function matchKey(game, name) {
  return `${game}::${name.trim().toLowerCase()}`
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
