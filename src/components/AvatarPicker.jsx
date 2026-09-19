import { AVATAR_CATEGORIES } from '../data/avatarIcons.js'
import AvatarIcon from './AvatarIcon.jsx'

export default function AvatarPicker({ value, onChange }) {
  return (
    <div className="avatar-picker">
      {AVATAR_CATEGORIES.map((category) => (
        <div key={category.id} className="avatar-category">
          <p className="avatar-category-label">{category.label}</p>
          <div className="avatar-grid">
            {category.icons.map((icon) => (
              <button
                key={icon.id}
                type="button"
                className={`avatar-option${value === icon.id ? ' selected' : ''}`}
                onClick={() => onChange(icon.id)}
                aria-label={`Choose avatar ${icon.label}`}
                title={icon.label}
              >
                <AvatarIcon value={icon.id} size={30} />
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
