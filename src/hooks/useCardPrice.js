import { useEffect, useState } from 'react'
import { fetchLivePrice } from '../data/providers/index.js'

// Cached per card id for the lifetime of the tab (not persisted) — avoids
// re-fetching the same card's price every time it re-renders across
// Collection/Matches, while still being fresh for the whole session rather
// than a stale value captured once when the card was added.
const priceCache = new Map()
const inFlight = new Map()

// undefined = still loading, null = fetched but no price available,
// {amount, currency} = resolved price.
export function useCardPrice(cardId) {
  const [price, setPrice] = useState(() => priceCache.get(cardId))

  useEffect(() => {
    if (priceCache.has(cardId)) {
      setPrice(priceCache.get(cardId))
      return
    }

    let cancelled = false
    if (!inFlight.has(cardId)) {
      inFlight.set(
        cardId,
        fetchLivePrice(cardId)
          .catch(() => null)
          .finally(() => inFlight.delete(cardId)),
      )
    }
    inFlight.get(cardId).then((result) => {
      priceCache.set(cardId, result)
      if (!cancelled) setPrice(result)
    })

    return () => {
      cancelled = true
    }
  }, [cardId])

  return price
}
