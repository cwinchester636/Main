// Only ever called from the report-a-trade form, at the moment someone
// submits it — never ambiently for ordinary trades (see README "Trade
// reports & chat"). Always resolves, never rejects: a denied permission,
// an unsupported browser, or a timeout all just mean "no location" rather
// than blocking the report from going through.
//
// Races the browser's own `timeout` option against an independent timer
// rather than trusting that option alone — confirmed in testing that
// getCurrentPosition can hang well past its stated timeout (observed
// consistently in a headless/sandboxed environment; nothing guarantees a
// real device's location provider always behaves either). Without this,
// a stuck location lookup would leave the whole report submission stuck
// with it, which is worse than just not having a location.
export function getCurrentLocation({ timeoutMs = 8000 } = {}) {
  const geolocationPromise = new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracyMeters: pos.coords.accuracy }),
      () => resolve(null),
      { timeout: timeoutMs, maximumAge: 0 },
    )
  })
  const fallbackTimeout = new Promise((resolve) => setTimeout(() => resolve(null), timeoutMs))

  return Promise.race([geolocationPromise, fallbackTimeout])
}
