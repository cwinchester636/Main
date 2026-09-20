import { useState } from 'react'
import { ALL_AVATAR_ICONS } from '../data/avatarIcons.js'
import AvatarPicker from './AvatarPicker.jsx'
import { api, ApiError } from '../api/client.js'

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MIN_PASSWORD_LENGTH = 8

function SignupForm({ onComplete, onSwitchToLogin }) {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
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
    if (!EMAIL_RE.test(email.trim())) {
      setError('Enter a valid email address.')
      return
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`)
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords don’t match.')
      return
    }
    setError('')
    setSubmitting(true)
    try {
      const { account, token } = await api.createAccount({
        username: username.trim(),
        email: email.trim(),
        password,
        avatar,
        zip: zip.trim(),
      })
      onComplete({ account, token })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={submit}>
      <label className="field-label" htmlFor="onboard-username">Username</label>
      <input
        id="onboard-username"
        type="text"
        className="text-input"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="e.g. card_collector_42"
        autoFocus
      />

      <label className="field-label" htmlFor="onboard-email">Email</label>
      <input
        id="onboard-email"
        type="email"
        className="text-input"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
      />

      <label className="field-label" htmlFor="onboard-password">Password</label>
      <input
        id="onboard-password"
        type="password"
        className="text-input"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
      />

      <label className="field-label" htmlFor="onboard-confirm-password">Confirm password</label>
      <input
        id="onboard-confirm-password"
        type="password"
        className="text-input"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
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
        {submitting ? 'Creating account…' : 'Create account'}
      </button>

      <p className="auth-switch">
        Already have an account?{' '}
        <button type="button" className="link-button" onClick={onSwitchToLogin}>Log in</button>
      </p>
    </form>
  )
}

function LoginForm({ onComplete, onSwitchToSignup }) {
  const [usernameOrEmail, setUsernameOrEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (!usernameOrEmail.trim() || !password) {
      setError('Enter your username or email and your password.')
      return
    }
    setError('')
    setSubmitting(true)
    try {
      const { account, token } = await api.login({ usernameOrEmail: usernameOrEmail.trim(), password })
      onComplete({ account, token })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={submit}>
      <label className="field-label" htmlFor="login-identifier">Username or email</label>
      <input
        id="login-identifier"
        type="text"
        className="text-input"
        value={usernameOrEmail}
        onChange={(e) => setUsernameOrEmail(e.target.value)}
        autoFocus
      />

      <label className="field-label" htmlFor="login-password">Password</label>
      <input
        id="login-password"
        type="password"
        className="text-input"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      {error && <p className="form-error">{error}</p>}

      <button type="submit" className="button primary full" disabled={submitting}>
        {submitting ? 'Logging in…' : 'Log in'}
      </button>

      <p className="auth-switch">
        New here?{' '}
        <button type="button" className="link-button" onClick={onSwitchToSignup}>Create an account</button>
      </p>
    </form>
  )
}

export default function Onboarding({ onComplete }) {
  const [mode, setMode] = useState('signup')

  return (
    <div className="onboarding">
      <div className="onboarding-card">
        <span className="onboarding-emoji" aria-hidden="true">🃏</span>
        <h1>Welcome to SwapDeck</h1>
        <p>Find nearby collectors who have what you want — and want what you have.</p>

        {mode === 'signup' ? (
          <SignupForm onComplete={onComplete} onSwitchToLogin={() => setMode('login')} />
        ) : (
          <LoginForm onComplete={onComplete} onSwitchToSignup={() => setMode('signup')} />
        )}
      </div>
    </div>
  )
}
