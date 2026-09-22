import { useEffect, useState } from 'react'
import { api, ApiError } from '../api/client.js'
import { isPurchasingSupported, getProPriceString, purchasePro } from '../utils/purchases.js'
import { FREE_COLLECTION_LIMIT, FREE_MAX_RADIUS_MILES } from '../utils/entitlements.js'

// Shown wherever a free-tier limit blocks an action (collection cap, radius
// cap, push notifications) — same modal every time, just a different
// `reason` line at the top explaining what triggered it. The buy button
// only appears inside the native app with a RevenueCat key configured
// (isPurchasingSupported) — on the website, or before that setup is done,
// this instead says plainly that purchasing isn't available there yet,
// rather than showing a button that can't work. See README "In-app
// purchases".
export default function PaywallModal({ reason, accountId, token, onPurchased, onClose }) {
  const supported = isPurchasingSupported()
  const [price, setPrice] = useState(null)
  const [priceError, setPriceError] = useState('')
  const [buying, setBuying] = useState(false)
  const [buyError, setBuyError] = useState('')
  const [purchased, setPurchased] = useState(false)

  useEffect(() => {
    if (!supported) return
    getProPriceString(accountId)
      .then(setPrice)
      .catch((err) => setPriceError(err.message || 'Could not load Pro pricing.'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleBuy = async () => {
    setBuying(true)
    setBuyError('')
    try {
      const active = await purchasePro(accountId)
      if (!active) {
        setBuyError('Purchase did not complete — nothing was charged.')
        return
      }
      // The client SDK already thinks the purchase is active, but this app
      // never trusts that alone — the backend re-checks against
      // RevenueCat's own server before actually granting Pro (see
      // worker/src/routes/purchases.js).
      await api.verifyProPurchase(token)
      await onPurchased?.()
      setPurchased(true)
    } catch (err) {
      if (err?.userCancelled) {
        // Backing out of the native purchase sheet isn't an error.
      } else if (err instanceof ApiError) {
        setBuyError(err.message)
      } else {
        setBuyError(err?.message || 'Purchase failed — nothing was charged.')
      }
    } finally {
      setBuying(false)
    }
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-header">
          <h2>⭐ SwapDeck Pro</h2>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close">×</button>
        </div>

        {purchased ? (
          <>
            <p className="form-success">You're Pro now — thanks for the support! 🎉</p>
            <button type="button" className="button primary full" onClick={onClose}>Done</button>
          </>
        ) : (
          <>
            {reason && <p className="form-error">{reason}</p>}

            <ul className="paywall-perks">
              <li>Unlimited cards in Haves and Wants (free: {FREE_COLLECTION_LIMIT} each)</li>
              <li>Search any distance for matches (free: up to {FREE_MAX_RADIUS_MILES} miles)</li>
              <li>Push notifications for new matches, trades, and events</li>
              <li>A Pro badge on your profile and next to your name</li>
            </ul>

            {supported ? (
              <>
                {priceError && <p className="form-error">{priceError}</p>}
                {buyError && <p className="form-error">{buyError}</p>}
                <button
                  type="button"
                  className="button primary full"
                  disabled={buying || (!price && !priceError)}
                  onClick={handleBuy}
                >
                  {buying ? 'Processing…' : price ? `Buy Pro — ${price}` : 'Loading price…'}
                </button>
                <p className="section-hint">One-time purchase, yours forever — not a subscription.</p>
              </>
            ) : (
              <p className="section-hint">
                Purchasing is only available in the SwapDeck Android app right now — not on the website.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
