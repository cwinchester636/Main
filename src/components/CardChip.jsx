import { useState } from 'react'
import { GAMES } from '../data/cards.js'
import { CONDITION_LABEL } from '../data/conditions.js'
import CardMeta from './CardMeta.jsx'

const gameEmoji = (gameId) => GAMES.find((g) => g.id === gameId)?.emoji ?? '🃏'

function conditionText(card) {
  if (!card.condition) return null
  if (card.condition === 'graded') return card.grade ? `Graded ${card.grade}/10` : 'Graded'
  return CONDITION_LABEL[card.condition] ?? null
}

export default function CardChip({ card, onRemove, onViewPhoto, compact = false }) {
  const [imageFailed, setImageFailed] = useState(false)
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
        <CardMeta card={card} className="card-chip-set" />
        {condition && <span className="card-chip-condition">{condition}</span>}
      </span>
      {card.hasPhoto && onViewPhoto && (
        <button
          type="button"
          className="card-chip-photo-btn"
          onClick={() => onViewPhoto(card.id)}
          aria-label={`View verification photo for ${card.name}`}
        >
          📷
        </button>
      )}
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
