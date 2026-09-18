import { useMemo, useState } from 'react'
import { GAMES } from '../data/cards.js'
import { useCardSearch } from '../hooks/useCardSearch.js'
import { getCardPrice } from '../data/pricing/mockTcgplayerPricing.js'

export default function CardPicker({ title, excludeIds, onAdd, onClose }) {
  const [query, setQuery] = useState('')
  const [gameFilter, setGameFilter] = useState('all')
  const { results, liveStatus } = useCardSearch(query, gameFilter)

  const excludeSet = useMemo(() => new Set(excludeIds), [excludeIds])
  const visibleResults = results.filter((card) => !excludeSet.has(card.id))

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-header">
          <h2>{title}</h2>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close">×</button>
        </div>

        <input
          type="text"
          className="text-input"
          placeholder="Search by card, set, or set number…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />

        <div className="pill-row" role="group" aria-label="Filter by game">
          <button
            type="button"
            className={`pill${gameFilter === 'all' ? ' active' : ''}`}
            onClick={() => setGameFilter('all')}
          >
            All
          </button>
          {GAMES.map((game) => (
            <button
              key={game.id}
              type="button"
              className={`pill${gameFilter === game.id ? ' active' : ''}`}
              onClick={() => setGameFilter(game.id)}
            >
              {game.emoji} {game.label}
            </button>
          ))}
        </div>

        {liveStatus === 'loading' && (
          <p className="picker-status">Searching the full card database…</p>
        )}
        {liveStatus === 'error' && (
          <p className="picker-status warn">Live search is unavailable right now — showing our featured catalog instead.</p>
        )}

        <div className="picker-results">
          {visibleResults.length === 0 && (
            <p className="empty-hint">No cards match "{query}". Try another search.</p>
          )}
          {visibleResults.map((card) => {
            const price = getCardPrice(card.id)
            return (
              <button
                key={card.id}
                type="button"
                className="picker-row"
                onClick={() => onAdd(card)}
              >
                {card.image ? (
                  <img className="picker-row-image" src={card.image} alt="" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                ) : null}
                <span className="picker-row-text">
                  <span className="picker-row-name">{card.name}</span>
                  <span className="picker-row-set">{card.set} · {card.number}</span>
                </span>
                {price && (
                  <span className="picker-row-price" title="Estimated value — demo pricing, not live TCGplayer data">
                    ${price.marketPrice.toFixed(2)}
                  </span>
                )}
                <span className="picker-row-add" aria-hidden="true">+</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
