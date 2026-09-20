// Best-effort ZIP -> lat/lng lookup via Zippopotam.us (free, keyless,
// long-standing public service — same "free API, no key" pattern as the
// card search providers on the frontend). Never throws: geocoding failing
// (bad zip, service down, timeout) just means that account has no
// coordinates yet, and distance-based matching quietly falls back to the
// coarse ZIP-prefix proximity instead. See README "Matching & proximity".
const TIMEOUT_MS = 3000

export async function geocodeZip(zip) {
  if (!zip) return null

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(`https://api.zippopotam.us/us/${encodeURIComponent(zip)}`, {
      signal: controller.signal,
    })
    if (!res.ok) return null

    const data = await res.json()
    const place = data.places?.[0]
    if (!place) return null

    const lat = parseFloat(place.latitude)
    const lng = parseFloat(place.longitude)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null

    return { lat, lng }
  } catch {
    return null
  } finally {
    clearTimeout(timeout)
  }
}
