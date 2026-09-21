// SwapDeck's service worker: exists solely to receive Web Push events and
// show a notification (see src/utils/push.js for registration/subscribe,
// worker/src/push.js for what's actually sent). No caching, no offline
// support — a bare service worker is the minimum needed to receive push
// while the tab/app is closed.

self.addEventListener('push', (event) => {
  let payload = { title: 'SwapDeck', body: '' }
  try {
    payload = event.data.json()
  } catch {
    // Non-JSON push payload (shouldn't happen — worker/src/push.js always
    // sends JSON) — fall back to the default above rather than throwing.
  }

  event.waitUntil(
    self.registration.showNotification(payload.title || 'SwapDeck', {
      body: payload.body || '',
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      tag: payload.tag,
      data: { url: '/' },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = event.notification.data?.url || '/'

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      const existing = windows.find((w) => new URL(w.url).origin === self.location.origin)
      if (existing) {
        existing.focus()
        return
      }
      await self.clients.openWindow(targetUrl)
    })(),
  )
})
