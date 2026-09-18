import { useState } from 'react'
import { GAMES } from '../data/cards.js'

const gameEmoji = (gameId) => GAMES.find((g) => g.id === gameId)?.emoji ?? '🃏'

export default function CardChip({ card, onRemove, compact = false }) {
  const [imageFailed, setImageFailed] = useState(false)

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
        <span className="card-chip-set">{card.set} · {card.number}</span>
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
