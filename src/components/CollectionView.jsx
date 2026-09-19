import { useState } from 'react'
import CardChip from './CardChip.jsx'
import CardPicker from './CardPicker.jsx'

function CardSection({ title, hint, listType, cards, otherCards, onAdd, onRemove }) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  return (
    <section className="collection-section">
      <div className="collection-section-header">
        <div>
          <h2>{title}</h2>
          <p className="section-hint">{hint}</p>
        </div>
        <button type="button" className="button secondary small" onClick={() => setPickerOpen(true)} disabled={busy}>
          + Add Card
        </button>
      </div>

      {cards.length === 0 ? (
        <p className="empty-hint">Nothing here yet — add a few cards to get started.</p>
      ) : (
        <div className="card-chip-list">
          {cards.map((card) => (
            <CardChip
              key={card.id}
              card={card}
              onRemove={async (id) => {
                setBusy(true)
                await onRemove(listType, id)
                setBusy(false)
              }}
            />
          ))}
        </div>
      )}

      {pickerOpen && (
        <CardPicker
          title={listType === 'have' ? 'Add a card you have' : 'Add a card you want'}
          excludeIds={[...cards, ...otherCards].map((c) => c.id)}
          onAdd={async (card) => {
            setPickerOpen(false)
            setBusy(true)
            await onAdd(listType, card)
            setBusy(false)
          }}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </section>
  )
}

export default function CollectionView({ haves, wants, onAdd, onRemove }) {
  return (
    <div className="view">
      <h1>My Collection</h1>
      <p className="view-subtitle">
        Build your Have and Want lists — these power your trade matches with nearby collectors.
      </p>

      <CardSection
        title="Cards I Have"
        hint="Cards you own and would trade away."
        listType="have"
        cards={haves}
        otherCards={wants}
        onAdd={onAdd}
        onRemove={onRemove}
      />

      <CardSection
        title="Cards I Want"
        hint="Cards you're hunting for."
        listType="want"
        cards={wants}
        otherCards={haves}
        onAdd={onAdd}
        onRemove={onRemove}
      />
    </div>
  )
}
