import { useEffect, useState } from 'react'
import { api, ApiError } from '../api/client.js'

// fetcher defaults to a user's own/matched collection-item photos;
// AdminView passes api.adminFetchTradePhoto to view a trade snapshot's
// copy instead — same viewer, different source endpoint.
export default function PhotoViewerModal({ token, itemId, onClose, fetcher = api.fetchCollectionItemPhoto }) {
  const [status, setStatus] = useState('loading') // loading | ready | error
  const [errorMessage, setErrorMessage] = useState('')
  const [url, setUrl] = useState(null)

  useEffect(() => {
    let cancelled = false
    let objectUrl = null

    fetcher(token, itemId)
      .then((blob) => {
        if (cancelled) return
        objectUrl = URL.createObjectURL(blob)
        setUrl(objectUrl)
        setStatus('ready')
      })
      .catch((err) => {
        if (cancelled) return
        setErrorMessage(err instanceof ApiError ? err.message : 'Could not load this photo.')
        setStatus('error')
      })

    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [token, itemId, fetcher])

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet photo-viewer-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-header">
          <h2>Verification photo</h2>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close">×</button>
        </div>

        {status === 'loading' && <p className="picker-status">Loading photo…</p>}
        {status === 'error' && <p className="form-error">{errorMessage}</p>}
        {status === 'ready' && <img className="photo-viewer-image" src={url} alt="Card verification" />}
      </div>
    </div>
  )
}
