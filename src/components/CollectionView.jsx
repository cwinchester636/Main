import { useState } from 'react'
import { cardById } from '../data/cards.js'
import CardChip from './CardChip.jsx'
import CardPicker from './CardPicker.jsx'

function CardSection({ title, hint, ids, otherIds, onAdd, onRemove }) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const cards = ids.map(cardById).filter(Boolean)

  return (
    <section className="collection-section">
      <div className="collection-section-header">
        <div>
          <h2>{title}</h2>
          <p className="section-hint">{hint}</p>
        </div>
        <button type="button" className="button secondary small" onClick={() => setPickerOpen(true)}>
          + Add Card
        </button>
      </div>

      {cards.length === 0 ? (
        <p className="empty-hint">Nothing here yet — add a few cards to get started.</p>
      ) : (
        <div className="card-chip-list">
          {cards.map((card) => (
            <CardChip key={card.id} card={card} onRemove={onRemove} />
          ))}
        </div>
      )}

      {pickerOpen && (
        <CardPicker
          title={title === 'Cards I Have' ? 'Add a card you have' : 'Add a card you want'}
          excludeIds={[...ids, ...otherIds]}
          onAdd={(id) => {
            onAdd(id)
            setPickerOpen(false)
          }}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </section>
  )
}

export default function CollectionView({ haves, wants, setHaves, setWants }) {
  return (
    <div className="view">
      <h1>My Collection</h1>
      <p className="view-subtitle">
        Build your Have and Want lists — these power your trade matches with nearby collectors.
      </p>

      <CardSection
        title="Cards I Have"
        hint="Cards you own and would trade away."
        ids={haves}
        otherIds={wants}
        onAdd={(id) => setHaves((prev) => [...prev, id])}
        onRemove={(id) => setHaves((prev) => prev.filter((x) => x !== id))}
      />

      <CardSection
        title="Cards I Want"
        hint="Cards you're hunting for."
        ids={wants}
        otherIds={haves}
        onAdd={(id) => setWants((prev) => [...prev, id])}
        onRemove={(id) => setWants((prev) => prev.filter((x) => x !== id))}
      />
    </div>
  )
}
