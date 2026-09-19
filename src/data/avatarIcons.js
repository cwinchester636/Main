// Original avatar icons, grouped by game flavor. These are generic archetypes
// (a flame creature, a hooded spellcaster, a dragon head, a gear...) — not
// artwork of any specific character from any game. See AvatarIcon.jsx for
// the actual SVG glyphs.
export const AVATAR_CATEGORIES = [
  {
    id: 'pokemon',
    label: 'Pokémon-inspired',
    icons: [
      { id: 'ember-sprite', label: 'Ember Sprite' },
      { id: 'tide-pup', label: 'Tide Pup' },
      { id: 'leaf-cub', label: 'Leaf Cub' },
      { id: 'spark-mouse', label: 'Spark Mouse' },
      { id: 'sky-wing', label: 'Sky Wing' },
      { id: 'adventurer', label: 'Adventurer' },
    ],
  },
  {
    id: 'mtg',
    label: 'MTG-inspired',
    icons: [
      { id: 'radiant-order', label: 'Radiant Order' },
      { id: 'deep-current', label: 'Deep Current' },
      { id: 'withering-grasp', label: 'Withering Grasp' },
      { id: 'wild-blaze', label: 'Wild Blaze' },
      { id: 'verdant-growth', label: 'Verdant Growth' },
      { id: 'planeswalker', label: 'Planeswalker' },
    ],
  },
  {
    id: 'yugioh',
    label: 'Yu-Gi-Oh!-inspired',
    icons: [
      { id: 'dragon-type', label: 'Dragon Type' },
      { id: 'spellcaster-type', label: 'Spellcaster Type' },
      { id: 'warrior-type', label: 'Warrior Type' },
      { id: 'fiend-type', label: 'Fiend Type' },
      { id: 'beast-type', label: 'Beast Type' },
      { id: 'machine-type', label: 'Machine Type' },
    ],
  },
]

export const ALL_AVATAR_ICONS = AVATAR_CATEGORIES.flatMap((c) => c.icons)
