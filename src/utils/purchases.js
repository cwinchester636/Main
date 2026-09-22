import { Capacitor } from '@capacitor/core'
import { Purchases } from '@revenuecat/purchases-capacitor'

// SwapDeck Pro is a one-time (non-subscription) purchase -- see README
// "In-app purchases". This entitlement identifier and offering/package
// identifier are created once in the RevenueCat dashboard (paired with a
// real product in Google Play Console); they're not secrets, just ids, the
// same reasoning VITE_VAPID_PUBLIC_KEY already documents for a public key
// that's safe to ship in the client bundle.
const PRO_ENTITLEMENT_ID = 'pro'

let configuredForAccountId = null

// Purchasing only works inside the native shell -- there's no Play/App
// Store to buy through from a browser tab. Every caller below checks this
// first rather than letting the RevenueCat SDK fail with a less legible
// error on web.
export function isPurchasingSupported() {
  return Capacitor.isNativePlatform() && !!import.meta.env.VITE_REVENUECAT_PUBLIC_KEY
}

// Configuring with appUserID set to this account's own id (rather than
// leaving RevenueCat to generate an anonymous one) is what lets the
// backend look this exact purchase up again by account id at verification
// time (see worker/src/routes/purchases.js) -- no separate mapping table
// needed. Idempotent per account id within a session; re-configuring for
// the same id that's already configured is a no-op.
async function ensureConfigured(accountId) {
  if (configuredForAccountId === accountId) return
  await Purchases.configure({ apiKey: import.meta.env.VITE_REVENUECAT_PUBLIC_KEY, appUserID: accountId })
  configuredForAccountId = accountId
}

// Throws if there's no current offering, or it has no packages -- both
// mean the RevenueCat dashboard/Play Console product setup isn't finished
// yet (see README), not something a retry fixes.
async function getProPackage(accountId) {
  await ensureConfigured(accountId)
  const offerings = await Purchases.getOfferings()
  const pkg = offerings.current?.availablePackages?.[0]
  if (!pkg) throw new Error('Pro isn’t available for purchase yet — check back soon.')
  return pkg
}

// The price to show before purchasing, e.g. "$1.99" -- reads the real
// store-localized price via getProPackage rather than hardcoding it, so
// this is correct even if the price or the buyer's region/currency changes.
export async function getProPriceString(accountId) {
  const pkg = await getProPackage(accountId)
  return pkg.product.priceString
}

// Resolves once the native purchase sheet completes successfully.
// Cancelling the sheet rejects with userCancelled: true on the error --
// callers should treat that as "did nothing," not a failure to surface.
export async function purchasePro(accountId) {
  const pkg = await getProPackage(accountId)
  const { customerInfo } = await Purchases.purchasePackage({ aPackage: pkg })
  return !!customerInfo.entitlements.active[PRO_ENTITLEMENT_ID]
}
