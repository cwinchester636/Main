// Simple, original icon glyphs (flame, droplet, leaf, gear, paw print, ...)
// on a colored badge. None of these are artwork of any specific character —
// see data/avatarIcons.js for the reasoning.
const ICONS = {
  // Pokémon-inspired
  'ember-sprite': {
    bg: '#ff7a45',
    glyph: (
      <path d="M12 3c-2.5 3-6 6.4-6 10.2a6 6 0 0012 0c0-2.6-1.2-4.7-2.4-6.1.2 1.9-.9 2.9-1.6 2.9-1 0-1.4-1-1.1-2C13.6 6.4 12.8 4.6 12 3z" />
    ),
  },
  'tide-pup': {
    bg: '#3aa0ff',
    glyph: <path d="M12 3c3 4.2 6 8 6 11.2a6 6 0 01-12 0C6 11 9 7.2 12 3z" />,
  },
  'leaf-cub': {
    bg: '#4caf50',
    glyph: (
      <>
        <path d="M18 5c-7 0-13 4.2-13 11 0 2.5 1.6 4 3.6 4C15.5 20 19 13.3 19 6.2c0-.6-.4-1.2-1-1.2z" />
        <path d="M8.5 18C10.5 14.5 14 10.5 18 8" stroke="#1b5e20" strokeWidth="1.2" fill="none" strokeLinecap="round" />
      </>
    ),
  },
  'spark-mouse': {
    bg: '#ffca28',
    glyph: <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z" />,
  },
  'sky-wing': {
    bg: '#64b5f6',
    glyph: (
      <path d="M2 12c4.5-5.5 10-8 20-7-3 2.5-4.5 4.7-4.5 7.5 0 3.5 1.8 5.5 3.5 6.5-6 1.2-11-.7-14.3-4-2 .8-3.7.5-4.7-.5 1-.7 1.3-1.4 0-2.5z" />
    ),
  },
  adventurer: {
    bg: '#8d6e63',
    glyph: (
      <>
        <circle cx="12" cy="8" r="3.4" />
        <path d="M8.8 6.2a4.2 4.2 0 016.4 0c1 .2 1.6.9 1.6 1.8h-9.6c0-.9.6-1.6 1.6-1.8z" />
        <path d="M5.5 21c.6-4 3-6.5 6.5-6.5s5.9 2.5 6.5 6.5z" />
      </>
    ),
  },

  // MTG-inspired
  'radiant-order': {
    bg: '#e8cf7a',
    glyph: (
      <>
        <circle cx="12" cy="12" r="3.6" />
        {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
          <rect key={deg} x="11.2" y="2.5" width="1.6" height="4.5" rx="0.8" transform={`rotate(${deg} 12 12)`} />
        ))}
      </>
    ),
  },
  'deep-current': {
    bg: '#4fc3f7',
    glyph: (
      <>
        <path d="M2 10c2-2 4-2 6 0s4 2 6 0 4-2 6 0 4 2 6 0" stroke="#01579b" strokeWidth="1.8" fill="none" strokeLinecap="round" />
        <path d="M2 15.5c2-2 4-2 6 0s4 2 6 0 4-2 6 0 4 2 6 0" stroke="#01579b" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      </>
    ),
  },
  'withering-grasp': {
    bg: '#5e4b8b',
    glyph: (
      <>
        <path d="M12 3a7 7 0 00-4.5 12.3L6 21h3l1-2h4l1 2h3l-1.5-5.7A7 7 0 0012 3z" />
        <circle cx="9.5" cy="10.5" r="1.3" fill="#5e4b8b" />
        <circle cx="14.5" cy="10.5" r="1.3" fill="#5e4b8b" />
      </>
    ),
  },
  'wild-blaze': {
    bg: '#e5735f',
    glyph: (
      <>
        <path d="M4 19 12 6l8 13z" />
        <path d="M12 8c-1.3 2-2.8 3.6-2.8 5.5a2.8 2.8 0 005.6 0c0-1-.5-1.8-1-2.4.1.9-.4 1.3-.8 1.3-.5 0-.7-.5-.5-1C12.7 10.6 12.3 9.3 12 8z" fill="#e5735f" />
      </>
    ),
  },
  'verdant-growth': {
    bg: '#81c784',
    glyph: (
      <>
        <rect x="11" y="13" width="2" height="8" rx="1" fill="#33691e" />
        <path d="M12 3C7.5 4 5 7 5 10.5A5 5 0 0012 15a5 5 0 007-4.5C19 7 16.5 4 12 3z" />
      </>
    ),
  },
  planeswalker: {
    bg: '#9575cd',
    glyph: (
      <>
        <circle cx="12" cy="6.5" r="2.5" />
        <path d="M7 21c.4-5 2.2-8.5 5-8.5s4.6 3.5 5 8.5z" />
        <path d="M17 4l3 17" stroke="#4a2f8a" strokeWidth="1.3" strokeLinecap="round" />
        <circle cx="20.2" cy="4" r="1.3" fill="#4a2f8a" />
      </>
    ),
  },

  // Yu-Gi-Oh!-inspired
  'dragon-type': {
    bg: '#26a69a',
    glyph: (
      <>
        <path d="M3 13c3-1 5-3 7-3l2-4 2 4c2 0 4 2 7 3-3 1-5 .5-6.5-.5C13.8 14 12 17 12 17s-1.8-3-2.5-4.5C8 13.5 6 14 3 13z" />
        <circle cx="9.6" cy="11" r="0.9" fill="#26a69a" />
        <circle cx="14.4" cy="11" r="0.9" fill="#26a69a" />
      </>
    ),
  },
  'spellcaster-type': {
    bg: '#5c6bc0',
    glyph: (
      <>
        <path d="M12 3 5 20h14z" />
        <circle cx="12" cy="15" r="2.2" fill="#5c6bc0" />
      </>
    ),
  },
  'warrior-type': {
    bg: '#78909c',
    glyph: (
      <>
        <path d="M12 3 5 6.5v3.7C5 15 8 18.6 12 20c4-1.4 7-5 7-9.8V6.5z" />
        <path d="M12 6v9M9 9h6" stroke="#37474f" strokeWidth="1.3" strokeLinecap="round" />
      </>
    ),
  },
  'fiend-type': {
    bg: '#8e24aa',
    glyph: (
      <>
        <path d="M6 4c1 2 1 4 .5 5.5C7.8 8.3 9 7.5 9 7.5s-.5 2 .5 3c.7-1.2 1.6-1.8 2.5-1.8s1.8.6 2.5 1.8c1-1 .5-3 .5-3s1.2.8 2.5 2C17 8 17 6 18 4c1.5 2.5 2 5 1 7.5-1 2.5-1 5-3 7-1.3 1.3-2.6 1.8-4 1.8s-2.7-.5-4-1.8c-2-2-2-4.5-3-7C4 9 4.5 6.5 6 4z" />
        <circle cx="9.5" cy="13" r="1" fill="#8e24aa" />
        <circle cx="14.5" cy="13" r="1" fill="#8e24aa" />
      </>
    ),
  },
  'beast-type': {
    bg: '#6d4c41',
    glyph: (
      <>
        <circle cx="12" cy="15" r="4.3" />
        <circle cx="6.5" cy="9" r="2" />
        <circle cx="17.5" cy="9" r="2" />
        <circle cx="10" cy="6.5" r="1.7" />
        <circle cx="14" cy="6.5" r="1.7" />
      </>
    ),
  },
  'machine-type': {
    bg: '#607d8b',
    glyph: (
      <path d="M14 3h-4l-.6 2.4a6 6 0 00-1.7 1L5.5 5.6 3.6 8.9l2 1.6a6 6 0 000 2l-2 1.6 1.9 3.3 2.2-.8a6 6 0 001.7 1L10 21h4l.6-2.4a6 6 0 001.7-1l2.2.8 1.9-3.3-2-1.6a6 6 0 000-2l2-1.6-1.9-3.3-2.2.8a6 6 0 00-1.7-1L14 3zm-2 6.5a2.5 2.5 0 110 5 2.5 2.5 0 010-5z" />
    ),
  },
}

export default function AvatarIcon({ value, size = 32 }) {
  const icon = ICONS[value]

  if (!icon) {
    // Legacy or unrecognized value (e.g. an emoji from an older account) —
    // render as-is so nothing breaks.
    return (
      <span className="avatar-fallback" style={{ fontSize: size * 0.75 }} aria-hidden="true">
        {value}
      </span>
    )
  }

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#fff" aria-hidden="true">
      <circle cx="12" cy="12" r="12" fill={icon.bg} />
      <g transform="translate(0,0)">{icon.glyph}</g>
    </svg>
  )
}
