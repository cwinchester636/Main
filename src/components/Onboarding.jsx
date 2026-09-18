import { useState } from 'react'
import { AVATARS } from '../data/avatars.js'

export default function Onboarding({ onComplete }) {
  const [name, setName] = useState('')
  const [avatar, setAvatar] = useState(AVATARS[0])

  const submit = (e) => {
    e.preventDefault()
    onComplete({ name: name.trim() || 'Collector', avatar })
  }

  return (
    <div className="onboarding">
      <div className="onboarding-card">
        <span className="onboarding-emoji" aria-hidden="true">🃏</span>
        <h1>Welcome to SwapDeck</h1>
        <p>Find nearby collectors who have what you want — and want what you have.</p>

        <form onSubmit={submit}>
          <label className="field-label" htmlFor="onboard-name">What should we call you?</label>
          <input
            id="onboard-name"
            type="text"
            className="text-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            autoFocus
          />

          <p className="field-label">Pick an avatar</p>
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

          <button type="submit" className="button primary full">Get started</button>
        </form>
      </div>
    </div>
  )
}
