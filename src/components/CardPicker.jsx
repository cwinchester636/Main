import { useMemo, useState } from 'react'
import { GAMES } from '../data/cards.js'
import { CONDITIONS, MIN_GRADE, MAX_GRADE } from '../data/conditions.js'
import { useCardSearch } from '../hooks/useCardSearch.js'

function ConditionStep({ card, onConfirm, onBack }) {
  const [condition, setCondition] = useState('NM')
  const [grade, setGrade] = useState('')

  const gradeNum = Number(grade)
  const gradeValid = Number.isInteger(gradeNum) && gradeNum >= MIN_GRADE && gradeNum <= MAX_GRADE
  const canConfirm = condition !== 'graded' || gradeValid

  return (
    <div className="condition-step">
      <button type="button" className="link-button" onClick={onBack}>← Back to search</button>

      <div className="condition-card-preview">
        {card.image ? <img className="picker-row-image" src={card.image} alt="" /> : null}
        <span className="picker-row-text">
          <span className="picker-row-name">{card.name}</span>
          <span className="picker-row-set">{card.set} · {card.number}</span>
        </span>
      </div>

      <p className="field-label">Condition</p>
      <div className="pill-row" role="group" aria-label="Card condition">
        {CONDITIONS.map((c) => (
          <button
            key={c.id}
            type="button"
            className={`pill${condition === c.id ? ' active' : ''}`}
            onClick={() => setCondition(c.id)}
          >
            {c.label}
          </button>
        ))}
      </div>

      {condition === 'graded' && (
        <>
          <label className="field-label" htmlFor="picker-grade">Grade ({MIN_GRADE}-{MAX_GRADE})</label>
          <input
            id="picker-grade"
            type="number"
            className="text-input"
            min={MIN_GRADE}
            max={MAX_GRADE}
            step={1}
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            placeholder="e.g. 9"
            autoFocus
          />
          {grade !== '' && !gradeValid && (
            <p className="form-error">Grade must be a whole number from {MIN_GRADE} to {MAX_GRADE}.</p>
          )}
        </>
      )}

      <button
        type="button"
        className="button primary full"
        disabled={!canConfirm}
        onClick={() => onConfirm({ condition, grade: condition === 'graded' ? gradeNum : null })}
      >
        Add to list
      </button>
    </div>
  )
}

export default function CardPicker({ title, excludeIds, onAdd, onClose }) {
  const [query, setQuery] = useState('')
  const [gameFilter, setGameFilter] = useState('all')
  const [selectedCard, setSelectedCard] = useState(null)
  const { results, liveStatus } = useCardSearch(query, gameFilter)

  const excludeSet = useMemo(() => new Set(excludeIds), [excludeIds])
  const visibleResults = results.filter((card) => !excludeSet.has(card.id))

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-header">
          <h2>{selectedCard ? 'Card condition' : title}</h2>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close">×</button>
        </div>

        {selectedCard ? (
          <ConditionStep
            card={selectedCard}
            onBack={() => setSelectedCard(null)}
            onConfirm={({ condition, grade }) => onAdd({ ...selectedCard, condition, grade })}
          />
        ) : (
          <>
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
              {visibleResults.map((card) => (
                <button
                  key={card.id}
                  type="button"
                  className="picker-row"
                  onClick={() => setSelectedCard(card)}
                >
                  {card.image ? (
                    <img className="picker-row-image" src={card.image} alt="" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                  ) : null}
                  <span className="picker-row-text">
                    <span className="picker-row-name">{card.name}</span>
                    <span className="picker-row-set">{card.set} · {card.number}</span>
                  </span>
                  <span className="picker-row-add" aria-hidden="true">+</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
