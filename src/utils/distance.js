const PROXIMITY_LABEL = ['Same ZIP code', 'Nearby (same area)', null]

// Prefers the real geodistance when the backend could compute one (both
// accounts geocoded); falls back to the coarse ZIP-prefix bucket otherwise.
export function distanceLabel({ distanceMiles, proximity }) {
  if (distanceMiles != null) {
    return distanceMiles < 1 ? '<1 mile away' : `${distanceMiles} mi away`
  }
  return PROXIMITY_LABEL[proximity] ?? null
}
