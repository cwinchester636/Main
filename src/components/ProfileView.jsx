import { useEffect, useState } from 'react'
import AvatarPicker from './AvatarPicker.jsx'
import PaywallModal from './PaywallModal.jsx'
import { api, ApiError } from '../api/client.js'
import {
  getExistingSubscription,
  isPushSupported,
  PushPermissionError,
  subscribeToPush,
  unsubscribeFromPush,
} from '../utils/push.js'
import { FREE_MAX_RADIUS_MILES } from '../utils/entitlements.js'

const RADIUS_OPTIONS = [5, 10, 25, 50, 100, 250]

export default function ProfileView({ account, token, onUpdate, onLogOut, onToggleBlock, onPurchased }) {
  const [paywallReason, setPaywallReason] = useState(null)
  const [avatar, setAvatar] = useState(account.avatar)
  const [zip, setZip] = useState(account.zip || '')
  const [radiusMiles, setRadiusMiles] = useState(account.radiusMiles ?? null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  const [blockedUsers, setBlockedUsers] = useState(null)
  const [unblockingId, setUnblockingId] = useState(null)
  const [blockedError, setBlockedError] = useState('')

  useEffect(() => {
    api
      .getBlockedUsers(token)
      .then(({ blocked }) => setBlockedUsers(blocked))
      .catch(() => setBlockedUsers([]))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleUnblock = async (user) => {
    setUnblockingId(user.id)
    setBlockedError('')
    try {
      await onToggleBlock(user.id)
      setBlockedUsers((prev) => prev.filter((u) => u.id !== user.id))
    } catch (err) {
      setBlockedError(err instanceof ApiError ? err.message : 'Could not unblock this account.')
    } finally {
      setUnblockingId(null)
    }
  }

  // 'unsupported' | 'checking' | 'off' | 'on' — checked once against the
  // browser's actual subscription state rather than assumed, since it can
  // change outside this app (permission revoked in browser settings, etc.).
  const [pushState, setPushState] = useState(isPushSupported() ? 'checking' : 'unsupported')
  const [pushBusy, setPushBusy] = useState(false)
  const [pushError, setPushError] = useState('')
  const [pushPermissionDenied, setPushPermissionDenied] = useState(false)

  useEffect(() => {
    if (!isPushSupported()) return
    getExistingSubscription()
      .then((sub) => setPushState(sub ? 'on' : 'off'))
      .catch(() => setPushState('off'))
  }, [])

  const handleEnablePush = async () => {
    setPushBusy(true)
    setPushError('')
    setPushPermissionDenied(false)
    try {
      await subscribeToPush(token)
      setPushState('on')
    } catch (err) {
      if (err instanceof PushPermissionError) {
        setPushPermissionDenied(true)
      } else {
        setPushError(err.message || 'Could not enable notifications.')
      }
    } finally {
      setPushBusy(false)
    }
  }

  const handleDisablePush = async () => {
    setPushBusy(true)
    setPushError('')
    setPushPermissionDenied(false)
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
      <p className="view-subtitle">
        @{account.username} {account.isPro && <span className="pro-badge">⭐ Pro</span>} — this is how other
        collectors see you.
      </p>

      {!account.isPro && (
        <div className="profile-section">
          <h2>Your plan</h2>
          <p className="section-hint">
            Free — up to {FREE_MAX_RADIUS_MILES} mile search radius and 25 cards per list. Pro removes those limits
            and unlocks push notifications and a Pro badge.
          </p>
          <button type="button" className="button secondary" onClick={() => setPaywallReason('')}>
            See Pro benefits
          </button>
        </div>
      )}

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
        onChange={(e) => {
          const next = e.target.value === 'any' ? null : Number(e.target.value)
          if (!account.isPro && (next === null || next > FREE_MAX_RADIUS_MILES)) {
            setPaywallReason(`Free accounts can search up to ${FREE_MAX_RADIUS_MILES} miles.`)
            return
          }
          setRadiusMiles(next)
        }}
      >
        <option value="any">Any distance{!account.isPro ? ' (Pro)' : ''}</option>
        {RADIUS_OPTIONS.map((mi) => (
          <option key={mi} value={mi}>
            Within {mi} miles{!account.isPro && mi > FREE_MAX_RADIUS_MILES ? ' (Pro)' : ''}
          </option>
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
        {!account.isPro ? (
          <>
            <p className="section-hint">
              Push notifications for new matches, trades, and events are a Pro feature — you'll still see
              everything in the notifications inbox (🔔 above) either way.
            </p>
            <button
              type="button"
              className="button secondary"
              onClick={() => setPaywallReason('Push notifications are a Pro feature.')}
            >
              🔒 See Pro benefits
            </button>
          </>
        ) : (
          <>
            {pushState === 'unsupported' && (
              <p className="section-hint">This browser doesn't support push notifications.</p>
            )}
            {pushState === 'checking' && <p className="section-hint">Checking…</p>}
            {pushState === 'off' && (
              <>
                <p className="section-hint">
                  Get notified about new matches, new trade proposals, accepted trades, completed trades, new
                  messages, and local events posted near you — even when SwapDeck isn't open.
                </p>
                <button type="button" className="button secondary" disabled={pushBusy} onClick={handleEnablePush}>
                  {pushBusy ? 'Enabling…' : 'Enable notifications'}
                </button>
              </>
            )}
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
        {pushPermissionDenied && (
          <div className="push-permission-help">
            <p className="form-error">
              Your browser didn't grant notification permission — either you (or a previous visit) blocked it, or
              the prompt never got the chance to appear. Here's how to fix it:
            </p>
            <ol className="section-hint">
              <li>
                Open this site's settings in your browser — usually an icon next to the address bar, or your
                browser's menu → <strong>Site settings</strong> → <strong>Notifications</strong> — and set it to{' '}
                <strong>Allow</strong>.
              </li>
              <li>On a phone, also check your device's own Settings → Apps → your browser → Notifications is on.</li>
              <li>Come back here and tap "Enable notifications" again.</li>
            </ol>
          </div>
        )}
      </div>

      {blockedUsers && blockedUsers.length > 0 && (
        <div className="profile-section">
          <h2>Blocked users</h2>
          <p className="section-hint">
            They can't propose new trades to you and you won't see them as a match — unblock to reverse this.
          </p>
          {blockedError && <p className="form-error">{blockedError}</p>}
          <div className="blocked-user-list">
            {blockedUsers.map((user) => (
              <div key={user.id} className="blocked-user-row">
                <strong>{user.username}</strong>
                <button
                  type="button"
                  className="button small secondary"
                  disabled={unblockingId === user.id}
                  onClick={() => handleUnblock(user)}
                >
                  {unblockingId === user.id ? '…' : 'Unblock'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

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

      {paywallReason !== null && (
        <PaywallModal
          reason={paywallReason}
          accountId={account.id}
          token={token}
          onPurchased={onPurchased}
          onClose={() => setPaywallReason(null)}
        />
      )}
    </div>
  )
}
