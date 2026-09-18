import { useMemo, useState } from 'react'
import { GAMES, searchCards } from '../data/cards.js'

export default function CardPicker({ title, excludeIds, onAdd, onClose }) {
  const [query, setQuery] = useState('')
  const [gameFilter, setGameFilter] = useState('all')

  const excludeSet = useMemo(() => new Set(excludeIds), [excludeIds])
  const results = useMemo(
    () => searchCards(query, gameFilter).filter((card) => !excludeSet.has(card.id)),
    [query, gameFilter, excludeSet],
  )

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
          placeholder="Search by card or set name…"
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

        <div className="picker-results">
          {results.length === 0 && (
            <p className="empty-hint">No cards match "{query}". Try another search.</p>
          )}
          {results.map((card) => (
            <button
              key={card.id}
              type="button"
              className="picker-row"
              onClick={() => onAdd(card.id)}
            >
              <span>
                <span className="picker-row-name">{card.name}</span>
                <span className="picker-row-set">{card.set}</span>
              </span>
              <span className="picker-row-add" aria-hidden="true">+</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
