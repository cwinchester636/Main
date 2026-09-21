import { buildPushPayload } from '@block65/webcrypto-web-push'
import { error, json, newId } from './utils.js'

// Notifications are best-effort, never load-bearing -- every trigger site
// wraps this in ctx.waitUntil() and nothing here ever throws back into the
// request that triggered it (see notifyAccount below). If the VAPID secret
// hasn't been configured yet (one-time `wrangler secret put`, see README
// "Push notifications"), sending is a silent no-op rather than a 500 on
// every trade action.
function vapidKeys(env) {
  if (!env.VAPID_PRIVATE_KEY || !env.VAPID_PUBLIC_KEY) return null
  return { subject: env.VAPID_SUBJECT, publicKey: env.VAPID_PUBLIC_KEY, privateKey: env.VAPID_PRIVATE_KEY }
}

export async function subscribe(request, env, account) {
  const body = await request.json().catch(() => null)
  const endpoint = typeof body?.endpoint === 'string' ? body.endpoint : ''
  const p256dh = typeof body?.keys?.p256dh === 'string' ? body.keys.p256dh : ''
  const auth = typeof body?.keys?.auth === 'string' ? body.keys.auth : ''
  if (!endpoint || !p256dh || !auth) return error('endpoint and keys.p256dh/keys.auth are required')

  await env.DB.prepare(
    `INSERT INTO push_subscriptions (id, account_id, endpoint, p256dh, auth, created_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(endpoint) DO UPDATE SET account_id = excluded.account_id, p256dh = excluded.p256dh, auth = excluded.auth`,
  )
    .bind(newId(), account.id, endpoint, p256dh, auth, Date.now())
    .run()

  return json({ subscribed: true }, 201)
}

// Scoped to the caller's own subscriptions -- you can only unsubscribe a
// browser signed in as you, not guess someone else's endpoint to drop them.
export async function unsubscribe(request, env, account) {
  const body = await request.json().catch(() => null)
  const endpoint = typeof body?.endpoint === 'string' ? body.endpoint : ''
  if (!endpoint) return error('endpoint is required')

  await env.DB.prepare('DELETE FROM push_subscriptions WHERE endpoint = ? AND account_id = ?')
    .bind(endpoint, account.id)
    .run()

  return json({ unsubscribed: true })
}

// Fire-and-forget notify for one account across every browser they've
// subscribed from. A 404/410 from the push service means that endpoint is
// gone for good (uninstalled, permission revoked, etc. -- RFC 8030 §7.3),
// so that row is deleted rather than left to fail forever on every future
// trigger. Every other outcome (including a network error) is just logged
// -- one broken subscription, or the whole push service being unreachable,
// must never take down the trade/message/rating action that triggered it.
export async function notifyAccount(env, accountId, { title, body, tag }) {
  const vapid = vapidKeys(env)
  if (!vapid) return

  const subs = await env.DB.prepare('SELECT * FROM push_subscriptions WHERE account_id = ?').bind(accountId).all()
  if (subs.results.length === 0) return

  const message = {
    data: JSON.stringify({ title, body, tag }),
    options: { ttl: 60 * 60 * 24 },
  }

  await Promise.allSettled(
    subs.results.map(async (sub) => {
      const subscription = {
        endpoint: sub.endpoint,
        expirationTime: null,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      }
      try {
        const payload = await buildPushPayload(message, subscription, vapid)
        // A push service is expected to respond in milliseconds, but nothing
        // guarantees it always does (confirmed in testing: an unreachable
        // endpoint can hang far longer than that rather than failing fast,
        // the same failure mode already hit and fixed for Geolocation — see
        // src/utils/geolocation.js). One slow/dead subscription must never
        // hold this whole notifyAccount call, and by extension the
        // ctx.waitUntil() it runs under, open indefinitely.
        const res = await fetch(sub.endpoint, { ...payload, signal: AbortSignal.timeout(10_000) })
        if (res.status === 404 || res.status === 410) {
          await env.DB.prepare('DELETE FROM push_subscriptions WHERE id = ?').bind(sub.id).run()
        } else if (!res.ok) {
          console.error('push send failed', sub.endpoint, res.status, await res.text().catch(() => ''))
        }
      } catch (err) {
        console.error('push send error', sub.endpoint, err)
      }
    }),
  )
}
