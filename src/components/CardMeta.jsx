import { useCardPrice } from '../hooks/useCardPrice.js'
import { formatUSD } from '../utils/currency.js'

// Set + collector number + live price (when resolvable), in that one line,
// everywhere a card is shown — the picker's search results, the condition
// step's preview, and every CardChip in Collection/Matches. A single shared
// piece so "value visible wherever a card appears" can't quietly drift out
// of sync between those places.
// showPrice=false (the picker's search results list) skips fetching a
// price at all, not just hiding it — see useCardPrice for why: a results
// list can have dozens of rows the user never selects, and firing a price
// lookup for every one of them was flooding the live APIs. A single
// selected card (the condition step's preview) or a saved CardChip still
// gets its price fetched as before.
export default function CardMeta({ card, className, showPrice = true }) {
  // Once a card is saved server-side, `id` becomes the collection row's own
  // (stable, needed for removal) id — `sourceId` is the original live-search
  // id a price lookup actually needs. Falls back to `id` for cards that
  // haven't round-tripped through the backend yet (a fresh search result),
  // where it's still the live id itself.
  const price = useCardPrice(card.sourceId ?? card.id, { enabled: showPrice })

  return (
    <span className={className}>
      {card.set} · {card.number}
      {price && <span className="card-chip-price"> · {formatUSD(price.amount)}</span>}
    </span>
  )
}
