import { useState } from 'react'
import { GAMES } from '../data/cards.js'
import { CONDITION_LABEL } from '../data/conditions.js'
import { useCardPrice } from '../hooks/useCardPrice.js'
import { formatUSD } from '../utils/currency.js'

const gameEmoji = (gameId) => GAMES.find((g) => g.id === gameId)?.emoji ?? '🃏'

function conditionText(card) {
  if (!card.condition) return null
  if (card.condition === 'graded') return card.grade ? `Graded ${card.grade}/10` : 'Graded'
  return CONDITION_LABEL[card.condition] ?? null
}

export default function CardChip({ card, onRemove, compact = false }) {
  const [imageFailed, setImageFailed] = useState(false)
  // Once a card is saved server-side, `id` becomes the collection row's own
  // (stable, needed for removal) id — `sourceId` is the original live-search
  // id a price lookup actually needs. Falls back to `id` for cards that
  // haven't round-tripped through the backend yet (e.g. a fresh search
  // result), where it's still the live id itself.
  const price = useCardPrice(card.sourceId ?? card.id)
  const condition = conditionText(card)

  return (
    <div className={`card-chip rarity-${card.rarity}${compact ? ' compact' : ''}`}>
      {card.image && !imageFailed ? (
        <img
          className="card-chip-image"
          src={card.image}
          alt=""
          onError={() => setImageFailed(true)}
        />
      ) : (
        <span className="card-chip-emoji" aria-hidden="true">{gameEmoji(card.game)}</span>
      )}
      <span className="card-chip-text">
        <span className="card-chip-name">{card.name}</span>
        <span className="card-chip-set">
          {card.set} · {card.number}
          {price && <span className="card-chip-price"> · {formatUSD(price.amount)}</span>}
        </span>
        {condition && <span className="card-chip-condition">{condition}</span>}
      </span>
      {onRemove && (
        <button
          type="button"
          className="card-chip-remove"
          onClick={() => onRemove(card.id)}
          aria-label={`Remove ${card.name}`}
        >
          ×
        </button>
      )}
    </div>
  )
}
