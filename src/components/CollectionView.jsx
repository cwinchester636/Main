import { useState } from 'react'
import CardChip from './CardChip.jsx'
import CardPicker from './CardPicker.jsx'
import PhotoViewerModal from './PhotoViewerModal.jsx'
import PaywallModal from './PaywallModal.jsx'
import { FREE_COLLECTION_LIMIT } from '../utils/entitlements.js'

function CardSection({ title, hint, listType, cards, otherCards, onAdd, onRemove, onViewPhoto, isPro, accountId, token, onPurchased }) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const [paywallOpen, setPaywallOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const atLimit = !isPro && cards.length >= FREE_COLLECTION_LIMIT

  return (
    <section className="collection-section">
      <div className="collection-section-header">
        <div>
          <h2>{title}</h2>
          <p className="section-hint">{hint}</p>
        </div>
        <button
          type="button"
          className="button secondary small"
          onClick={() => (atLimit ? setPaywallOpen(true) : setPickerOpen(true))}
          disabled={busy}
        >
          {atLimit ? '🔒 + Add Card' : '+ Add Card'}
        </button>
      </div>

      {atLimit && (
        <p className="section-hint">
          Free accounts can have up to {FREE_COLLECTION_LIMIT} cards here — remove one, or upgrade to Pro for unlimited.
        </p>
      )}

      {cards.length === 0 ? (
        <p className="empty-hint">Nothing here yet — add a few cards to get started.</p>
      ) : (
        <div className="card-chip-list">
          {cards.map((card) => (
            <CardChip
              key={card.id}
              card={card}
              onViewPhoto={onViewPhoto}
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
          listType={listType}
          excludeIds={[...cards, ...otherCards].map((c) => c.id)}
          onAdd={async (card, photo) => {
            setPickerOpen(false)
            setBusy(true)
            await onAdd(listType, card, photo)
            setBusy(false)
          }}
          onClose={() => setPickerOpen(false)}
        />
      )}

      {paywallOpen && (
        <PaywallModal
          reason={`Free accounts can have up to ${FREE_COLLECTION_LIMIT} cards in ${title.toLowerCase()}.`}
          accountId={accountId}
          token={token}
          onPurchased={onPurchased}
          onClose={() => setPaywallOpen(false)}
        />
      )}
    </section>
  )
}

export default function CollectionView({ haves, wants, onAdd, onRemove, token, account, onPurchased }) {
  const [viewingPhotoId, setViewingPhotoId] = useState(null)

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
        onViewPhoto={setViewingPhotoId}
        isPro={account.isPro}
        accountId={account.id}
        token={token}
        onPurchased={onPurchased}
      />

      <CardSection
        title="Cards I Want"
        hint="Cards you're hunting for."
        listType="want"
        cards={wants}
        otherCards={haves}
        isPro={account.isPro}
        accountId={account.id}
        token={token}
        onPurchased={onPurchased}
        onAdd={onAdd}
        onRemove={onRemove}
      />

      {viewingPhotoId && (
        <PhotoViewerModal token={token} itemId={viewingPhotoId} onClose={() => setViewingPhotoId(null)} />
      )}
    </div>
  )
}
