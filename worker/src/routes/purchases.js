import { error, json } from '../utils.js'

// SwapDeck Pro is a one-time purchase (see README "Pro tier / paywall" and
// "In-app purchases"), so a granted entitlement never needs renewing --
// this is just a long-lived stand-in for "forever" on the same pro_until
// column the admin-grant path already uses, not a real subscription end
// date. 100 years comfortably outlives this app.
const LIFETIME_MS = 100 * 365 * 24 * 60 * 60 * 1000

// RevenueCat's own SDK on the client already knows the purchase succeeded
// (`customerInfo.entitlements.active`), but that's the client's own claim
// -- exactly the kind of thing this app never trusts alone (see every
// other server-side gate in worker/src/utils.js). This re-checks the
// purchase against RevenueCat's own server, using the secret API key
// (never the public one the client SDK uses), before ever setting
// pro_until. The RevenueCat "app user id" is configured client-side to be
// this exact account's id (see src/utils/purchases.js), so looking it up
// here needs no extra mapping table.
export async function verifyProPurchase(env, account) {
  if (!env.REVENUECAT_SECRET_KEY) {
    return error('Pro purchases are not fully configured yet -- try again later', 503)
  }

  const res = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(account.id)}`, {
    headers: { Authorization: `Bearer ${env.REVENUECAT_SECRET_KEY}` },
    signal: AbortSignal.timeout(10_000),
  }).catch(() => null)

  if (!res || !res.ok) {
    return error('could not verify your purchase with the app store right now -- try again in a moment', 502)
  }

  const data = await res.json().catch(() => null)
  const entitlement = data?.subscriber?.entitlements?.[env.REVENUECAT_PRO_ENTITLEMENT_ID ?? 'pro']
  // expires_date is null for a non-expiring (lifetime) entitlement, which
  // is exactly what a one-time purchase grants -- a future date would also
  // count as still active, in case this entitlement is ever reconfigured
  // as a subscription later without a code change here.
  const active = !!entitlement && (entitlement.expires_date === null || new Date(entitlement.expires_date) > new Date())

  if (!active) {
    return error('no completed Pro purchase found for your account yet', 402)
  }

  await env.DB.prepare('UPDATE accounts SET pro_until = ? WHERE id = ?')
    .bind(Date.now() + LIFETIME_MS, account.id)
    .run()

  return json({ isPro: true })
}
