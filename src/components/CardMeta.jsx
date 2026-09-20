import { useCardPrice } from '../hooks/useCardPrice.js'
import { formatUSD } from '../utils/currency.js'

// Set + collector number + live price (when resolvable), in that one line,
// everywhere a card is shown — the picker's search results, the condition
// step's preview, and every CardChip in Collection/Matches. A single shared
// piece so "value visible wherever a card appears" can't quietly drift out
// of sync between those places.
export default function CardMeta({ card, className }) {
  // Once a card is saved server-side, `id` becomes the collection row's own
  // (stable, needed for removal) id — `sourceId` is the original live-search
  // id a price lookup actually needs. Falls back to `id` for cards that
  // haven't round-tripped through the backend yet (a fresh search result),
  // where it's still the live id itself.
  const price = useCardPrice(card.sourceId ?? card.id)

  return (
    <span className={className}>
      {card.set} · {card.number}
      {price && <span className="card-chip-price"> · {formatUSD(price.amount)}</span>}
    </span>
  )
}
