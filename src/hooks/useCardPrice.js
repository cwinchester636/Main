import { useEffect, useState } from 'react'
import { fetchLivePrice } from '../data/providers/index.js'

// Cached per card id for the lifetime of the tab (not persisted) — avoids
// re-fetching the same card's price every time it re-renders across
// Collection/Matches, while still being fresh for the whole session rather
// than a stale value captured once when the card was added.
const priceCache = new Map()
const inFlight = new Map()

// Also used directly (not as a hook) by src/utils/tradeValue.js, so a
// trade's value-disparity check reuses exactly the same cache/in-flight
// dedup as whatever's already on screen — never a second fetch for a price
// a CardChip already resolved, and never a mismatch between the two.
export async function resolveCardPrice(cardId) {
  if (priceCache.has(cardId)) return priceCache.get(cardId)

  if (!inFlight.has(cardId)) {
    inFlight.set(
      cardId,
      fetchLivePrice(cardId)
        .catch(() => null)
        .finally(() => inFlight.delete(cardId)),
    )
  }
  const result = await inFlight.get(cardId)
  priceCache.set(cardId, result)
  return result
}

// undefined = still loading, null = fetched but no price available,
// {amount, currency} = resolved price. `enabled: false` skips fetching
// entirely rather than just hiding the result — a search results list can
// show dozens of rows for cards the user never selects, and firing a price
// lookup for every one of them was flooding the live APIs with individual
// per-card requests on every keystroke (enough to get rate-limited/blocked
// outright). Only a card that's actually been selected or saved needs its
// price fetched.
export function useCardPrice(cardId, { enabled = true } = {}) {
  const [price, setPrice] = useState(() => (enabled ? priceCache.get(cardId) : undefined))

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    resolveCardPrice(cardId).then((result) => {
      if (!cancelled) setPrice(result)
    })
    return () => {
      cancelled = true
    }
  }, [cardId, enabled])

  return price
}
