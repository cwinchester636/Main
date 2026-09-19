import { useState } from 'react'
import { ALL_AVATAR_ICONS } from '../data/avatarIcons.js'
import AvatarPicker from './AvatarPicker.jsx'
import { api, ApiError } from '../api/client.js'

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/

export default function Onboarding({ onComplete }) {
  const [username, setUsername] = useState('')
  const [zip, setZip] = useState('')
  const [avatar, setAvatar] = useState(ALL_AVATAR_ICONS[0].id)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (!USERNAME_RE.test(username.trim())) {
      setError('Username must be 3-20 characters: letters, numbers, or underscore.')
      return
    }
    setError('')
    setSubmitting(true)
    try {
      const { account, token } = await api.createAccount({ username: username.trim(), avatar, zip: zip.trim() })
      onComplete({ account, token })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="onboarding">
      <div className="onboarding-card">
        <span className="onboarding-emoji" aria-hidden="true">🃏</span>
        <h1>Welcome to SwapDeck</h1>
        <p>Find nearby collectors who have what you want — and want what you have.</p>

        <form onSubmit={submit}>
          <label className="field-label" htmlFor="onboard-username">Choose a username</label>
          <input
            id="onboard-username"
            type="text"
            className="text-input"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="e.g. card_collector_42"
            autoFocus
          />

          <label className="field-label" htmlFor="onboard-zip">ZIP code (optional)</label>
          <input
            id="onboard-zip"
            type="text"
            className="text-input"
            value={zip}
            onChange={(e) => setZip(e.target.value)}
            placeholder="Used only to show how close a match is"
          />

          <p className="field-label">Pick an avatar</p>
          <AvatarPicker value={avatar} onChange={setAvatar} />

          {error && <p className="form-error">{error}</p>}

          <button type="submit" className="button primary full" disabled={submitting}>
            {submitting ? 'Creating account…' : 'Get started'}
          </button>
        </form>
      </div>
    </div>
  )
}
