import { useEffect, useMemo, useRef, useState } from 'react'
import { GAMES } from '../data/cards.js'
import { CONDITIONS, MIN_GRADE, MAX_GRADE } from '../data/conditions.js'
import { useCardSearch } from '../hooks/useCardSearch.js'
import CardMeta from './CardMeta.jsx'

function ConditionStep({ card, listType, onConfirm, onBack }) {
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
          <CardMeta card={card} className="picker-row-set" />
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
        {listType === 'have' ? 'Continue to photo' : 'Add to list'}
      </button>
    </div>
  )
}

// Downscales to a max dimension and re-encodes as JPEG before upload — a
// phone camera capture can be several MB straight off the sensor, and
// nothing about a verification photo needs that resolution.
const MAX_PHOTO_DIMENSION = 1200
const PHOTO_QUALITY = 0.82

function resizePhoto(file) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(objectUrl)
      let { width, height } = img
      if (width > MAX_PHOTO_DIMENSION || height > MAX_PHOTO_DIMENSION) {
        const scale = MAX_PHOTO_DIMENSION / Math.max(width, height)
        width = Math.round(width * scale)
        height = Math.round(height * scale)
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      canvas.getContext('2d').drawImage(img, 0, 0, width, height)
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('could not encode photo'))),
        'image/jpeg',
        PHOTO_QUALITY,
      )
    }
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('could not read photo'))
    }
    img.src = objectUrl
  })
}

function PhotoStep({ card, onConfirm, onBack }) {
  const [preview, setPreview] = useState(null)
  const [blob, setBlob] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef(null)

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview) }, [preview])

  const handleFile = async (file) => {
    if (!file) return
    setBusy(true)
    setError('')
    try {
      const resized = await resizePhoto(file)
      setPreview((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return URL.createObjectURL(resized)
      })
      setBlob(resized)
    } catch {
      setError('Could not process that photo — try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="condition-step">
      <button type="button" className="link-button" onClick={onBack}>← Back</button>

      <p className="field-label">Photo of your {card.name}</p>
      <p className="section-hint">
        Take a photo of the actual card in hand — this proves you hold it, and can be shown to matched trade partners.
      </p>

      {preview ? (
        <img className="photo-step-preview" src={preview} alt="" />
      ) : (
        <div className="photo-step-placeholder" aria-hidden="true">📷</div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="visually-hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      <button
        type="button"
        className="button secondary full"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
      >
        {busy ? 'Processing…' : preview ? 'Retake photo' : 'Take photo'}
      </button>

      {error && <p className="form-error">{error}</p>}

      <button type="button" className="button primary full" disabled={!blob || busy} onClick={() => onConfirm(blob)}>
        Add to Haves
      </button>
    </div>
  )
}

export default function CardPicker({ title, listType, excludeIds, onAdd, onClose }) {
  const [query, setQuery] = useState('')
  const [gameFilter, setGameFilter] = useState('all')
  const [pendingCard, setPendingCard] = useState(null)
  const [step, setStep] = useState('search') // search | condition | photo
  const { results, liveStatus } = useCardSearch(query, gameFilter)

  const excludeSet = useMemo(() => new Set(excludeIds), [excludeIds])
  const visibleResults = results.filter((card) => !excludeSet.has(card.id))

  const headerTitle = step === 'photo' ? 'Verify with a photo' : step === 'condition' ? 'Card condition' : title

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-header">
          <h2>{headerTitle}</h2>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close">×</button>
        </div>

        {step === 'condition' && (
          <ConditionStep
            card={pendingCard}
            listType={listType}
            onBack={() => setStep('search')}
            onConfirm={({ condition, grade }) => {
              const withCondition = { ...pendingCard, condition, grade }
              if (listType === 'have') {
                setPendingCard(withCondition)
                setStep('photo')
              } else {
                onAdd(withCondition)
              }
            }}
          />
        )}

        {step === 'photo' && (
          <PhotoStep card={pendingCard} onBack={() => setStep('condition')} onConfirm={(photo) => onAdd(pendingCard, photo)} />
        )}

        {step === 'search' && (
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
                  onClick={() => {
                    setPendingCard(card)
                    setStep('condition')
                  }}
                >
                  {card.image ? (
                    <img className="picker-row-image" src={card.image} alt="" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                  ) : null}
                  <span className="picker-row-text">
                    <span className="picker-row-name">{card.name}</span>
                    <CardMeta card={card} className="picker-row-set" showPrice={false} />
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
