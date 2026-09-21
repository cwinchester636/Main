import { api } from '../api/client.js'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY

export function isPushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window && !!VAPID_PUBLIC_KEY
}

// PushManager wants the VAPID key as a Uint8Array, but it's handed around
// everywhere else (wrangler.toml, .env) as the base64url string the Web
// Push spec actually uses — this is the one conversion point.
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  return Uint8Array.from([...raw].map((char) => char.charCodeAt(0)))
}

const SUBSCRIBE_TIMEOUT_MS = 15000

function withTimeout(promise, ms, message) {
  const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error(message)), ms))
  return Promise.race([promise, timeout])
}

export async function getExistingSubscription() {
  if (!isPushSupported()) return null
  const registration = await navigator.serviceWorker.getRegistration()
  if (!registration) return null
  return registration.pushManager.getSubscription()
}

// Registers the service worker if it isn't already, asks for Notification
// permission (a no-op if already granted/denied — the browser only ever
// prompts once), then subscribes and hands the subscription to the backend.
// Throws on denial/failure rather than swallowing it — the caller (the
// Profile toggle) is what surfaces that to the person, this just does the
// work.
//
// pushManager.subscribe() talks to the browser's push service (FCM for
// Chrome, etc.) to register the endpoint, and confirmed in testing it can
// hang indefinitely rather than reject if that service is unreachable —
// the same failure mode already hit for Geolocation and the server-side
// send (see README "Push notifications"). Racing it against a timeout
// keeps a person from being stuck on "Enabling…" forever with no way out.
export async function subscribeToPush(token) {
  if (!isPushSupported()) throw new Error('Push notifications aren’t supported in this browser.')

  const registration = await navigator.serviceWorker.register('/sw.js')
  await navigator.serviceWorker.ready

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new Error('Notification permission was not granted.')

  let subscription = await registration.pushManager.getSubscription()
  if (!subscription) {
    subscription = await withTimeout(
      registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      }),
      SUBSCRIBE_TIMEOUT_MS,
      'Timed out reaching the push service. Check your connection and try again.',
    )
  }

  const json = subscription.toJSON()
  await api.pushSubscribe(token, { endpoint: json.endpoint, keys: json.keys })
  return subscription
}

export async function unsubscribeFromPush(token) {
  const subscription = await getExistingSubscription()
  if (!subscription) return
  const endpoint = subscription.endpoint
  await withTimeout(subscription.unsubscribe(), SUBSCRIBE_TIMEOUT_MS, 'Timed out reaching the push service. Try again.')
  await api.pushUnsubscribe(token, endpoint)
}
