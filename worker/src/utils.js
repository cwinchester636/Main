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
// 2 = unknown or no overlap. See README for why this simplification exists.
export function zipProximity(zipA, zipB) {
  if (!zipA || !zipB) return 2
  if (zipA === zipB) return 0
  if (zipA.slice(0, 3) === zipB.slice(0, 3)) return 1
  return 2
}
