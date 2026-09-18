import { AVATARS } from '../data/avatars.js'

export default function ProfileView({ profile, setProfile, onReset }) {
  return (
    <div className="view">
      <h1>Profile</h1>
      <p className="view-subtitle">This is how nearby collectors see you. Everything stays on this device.</p>

      <label className="field-label" htmlFor="display-name">Display name</label>
      <input
        id="display-name"
        type="text"
        className="text-input"
        value={profile.name}
        onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
        placeholder="Your name"
      />

      <p className="field-label">Avatar</p>
      <div className="avatar-grid">
        {AVATARS.map((avatar) => (
          <button
            key={avatar}
            type="button"
            className={`avatar-option${profile.avatar === avatar ? ' selected' : ''}`}
            onClick={() => setProfile((p) => ({ ...p, avatar }))}
            aria-label={`Choose avatar ${avatar}`}
          >
            {avatar}
          </button>
        ))}
      </div>

      <div className="danger-zone">
        <h2>Reset</h2>
        <p className="section-hint">Clear your Have/Want lists and start over. This can't be undone.</p>
        <button
          type="button"
          className="button danger"
          onClick={() => {
            if (window.confirm('Clear your collection and trade proposals? This cannot be undone.')) {
              onReset()
            }
          }}
        >
          Reset my collection
        </button>
      </div>
    </div>
  )
}
