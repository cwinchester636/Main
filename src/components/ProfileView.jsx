import { useState } from 'react'
import { AVATARS } from '../data/avatars.js'
import { ApiError } from '../api/client.js'

export default function ProfileView({ account, onUpdate, onLogOut }) {
  const [avatar, setAvatar] = useState(account.avatar)
  const [zip, setZip] = useState(account.zip || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  const dirty = avatar !== account.avatar || zip !== (account.zip || '')

  const save = async () => {
    setSaving(true)
    setError('')
    setSaved(false)
    try {
      await onUpdate({ avatar, zip })
      setSaved(true)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save changes.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="view">
      <h1>Profile</h1>
      <p className="view-subtitle">@{account.username} — this is how other collectors see you.</p>

      <label className="field-label" htmlFor="profile-zip">ZIP code</label>
      <input
        id="profile-zip"
        type="text"
        className="text-input"
        value={zip}
        onChange={(e) => setZip(e.target.value)}
        placeholder="Used only to show how close a match is"
      />

      <p className="field-label">Avatar</p>
      <div className="avatar-grid">
        {AVATARS.map((a) => (
          <button
            key={a}
            type="button"
            className={`avatar-option${avatar === a ? ' selected' : ''}`}
            onClick={() => setAvatar(a)}
            aria-label={`Choose avatar ${a}`}
          >
            {a}
          </button>
        ))}
      </div>

      {error && <p className="form-error">{error}</p>}
      {saved && !dirty && <p className="form-success">Saved.</p>}

      <button type="button" className="button primary" disabled={!dirty || saving} onClick={save}>
        {saving ? 'Saving…' : 'Save changes'}
      </button>

      <div className="danger-zone">
        <h2>Log out</h2>
        <p className="section-hint">
          Your account, collection, and trade history stay on the server — you'll just need your username again
          to sign back in on this device. There's no password recovery yet, so this device is currently the only
          way back in.
        </p>
        <button
          type="button"
          className="button danger"
          onClick={() => {
            if (window.confirm('Log out of this device?')) onLogOut()
          }}
        >
          Log out
        </button>
      </div>
    </div>
  )
}
