import { useEffect, useState } from 'react'
import AvatarPicker from './AvatarPicker.jsx'
import { ApiError } from '../api/client.js'
import { getExistingSubscription, isPushSupported, subscribeToPush, unsubscribeFromPush } from '../utils/push.js'

const RADIUS_OPTIONS = [5, 10, 25, 50, 100, 250]

export default function ProfileView({ account, token, onUpdate, onLogOut }) {
  const [avatar, setAvatar] = useState(account.avatar)
  const [zip, setZip] = useState(account.zip || '')
  const [radiusMiles, setRadiusMiles] = useState(account.radiusMiles ?? null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  // 'unsupported' | 'checking' | 'off' | 'on' — checked once against the
  // browser's actual subscription state rather than assumed, since it can
  // change outside this app (permission revoked in browser settings, etc.).
  const [pushState, setPushState] = useState(isPushSupported() ? 'checking' : 'unsupported')
  const [pushBusy, setPushBusy] = useState(false)
  const [pushError, setPushError] = useState('')

  useEffect(() => {
    if (!isPushSupported()) return
    getExistingSubscription()
      .then((sub) => setPushState(sub ? 'on' : 'off'))
      .catch(() => setPushState('off'))
  }, [])

  const handleEnablePush = async () => {
    setPushBusy(true)
    setPushError('')
    try {
      await subscribeToPush(token)
      setPushState('on')
    } catch (err) {
      setPushError(err.message || 'Could not enable notifications.')
    } finally {
      setPushBusy(false)
    }
  }

  const handleDisablePush = async () => {
    setPushBusy(true)
    setPushError('')
    try {
      await unsubscribeFromPush(token)
      setPushState('off')
    } catch (err) {
      setPushError(err instanceof ApiError ? err.message : 'Could not disable notifications.')
    } finally {
      setPushBusy(false)
    }
  }

  const dirty =
    avatar !== account.avatar || zip !== (account.zip || '') || radiusMiles !== (account.radiusMiles ?? null)

  const save = async () => {
    setSaving(true)
    setError('')
    setSaved(false)
    try {
      await onUpdate({ avatar, zip, radiusMiles })
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

      <p className="field-label">Email</p>
      <p className="profile-email">{account.email || 'Not set (this account predates email/password login)'}</p>

      <label className="field-label" htmlFor="profile-zip">ZIP code</label>
      <input
        id="profile-zip"
        type="text"
        className="text-input"
        value={zip}
        onChange={(e) => setZip(e.target.value)}
        placeholder="Used only to show how close a match is"
      />

      <label className="field-label" htmlFor="profile-radius">Search radius</label>
      <select
        id="profile-radius"
        className="text-input"
        value={radiusMiles ?? 'any'}
        onChange={(e) => setRadiusMiles(e.target.value === 'any' ? null : Number(e.target.value))}
      >
        <option value="any">Any distance</option>
        {RADIUS_OPTIONS.map((mi) => (
          <option key={mi} value={mi}>Within {mi} miles</option>
        ))}
      </select>
      <p className="section-hint">
        Only affects your own Matches list — collectors farther than this won't show up for you. Needs a ZIP code
        above to take effect; matches with no known distance are always shown.
      </p>

      <p className="field-label">Avatar</p>
      <AvatarPicker value={avatar} onChange={setAvatar} />

      {error && <p className="form-error">{error}</p>}
      {saved && !dirty && <p className="form-success">Saved.</p>}

      <button type="button" className="button primary" disabled={!dirty || saving} onClick={save}>
        {saving ? 'Saving…' : 'Save changes'}
      </button>

      <div className="profile-section">
        <h2>Notifications</h2>
        {pushState === 'unsupported' && (
          <p className="section-hint">This browser doesn't support push notifications.</p>
        )}
        {pushState === 'checking' && <p className="section-hint">Checking…</p>}
        {pushState === 'off' && (
          <>
            <p className="section-hint">
              Get notified about new trade proposals, accepted trades, completed trades, and new messages — even
              when SwapDeck isn't open.
            </p>
            <button type="button" className="button secondary" disabled={pushBusy} onClick={handleEnablePush}>
              {pushBusy ? 'Enabling…' : 'Enable notifications'}
            </button>
          </>
        )}
        {pushState === 'on' && (
          <>
            <p className="form-success">Notifications are on for this browser.</p>
            <button type="button" className="button secondary" disabled={pushBusy} onClick={handleDisablePush}>
              {pushBusy ? 'Disabling…' : 'Turn off notifications'}
            </button>
          </>
        )}
        {pushError && <p className="form-error">{pushError}</p>}
      </div>

      <div className="danger-zone">
        <h2>Log out</h2>
        <p className="section-hint">
          Your account, collection, and trade history stay on the server. Log back in any time with your username
          or email and your password{account.email ? '' : " — but this account has no password set, so this device is currently the only way back in"}.
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
