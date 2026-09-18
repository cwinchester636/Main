// Live APIs each use their own rarity vocabulary. This maps them onto the
// app's 5-bucket scale (see RARITIES in data/cards.js) so CardChip coloring
// stays consistent whether a card came from the curated list or a live API.
export function mapPokemonRarity(raw) {
  const r = (raw || '').toLowerCase()
  if (!r) return 'rare'
  if (/secret|rainbow|hyper|ultra|vmax|vstar|gx\b|\bex\b|amazing|radiant/.test(r)) return 'ultra-rare'
  if (r.includes('holo')) return 'holo-rare'
  if (r.includes('uncommon')) return 'uncommon'
  if (r.includes('common')) return 'common'
  return 'rare'
}

export function mapScryfallRarity(raw) {
  switch ((raw || '').toLowerCase()) {
    case 'common': return 'common'
    case 'uncommon': return 'uncommon'
    case 'rare': return 'rare'
    case 'special': case 'bonus': return 'holo-rare'
    case 'mythic': return 'ultra-rare'
    default: return 'rare'
  }
}

export function mapYugiohRarity(raw) {
  const r = (raw || '').toLowerCase()
  if (!r) return 'rare'
  if (/secret|ghost|starlight|quarter century|ultimate|collector|prismatic/.test(r)) return 'ultra-rare'
  if (/super|platinum/.test(r)) return 'holo-rare'
  if (r.includes('ultra')) return 'ultra-rare'
  if (r === 'common') return 'common'
  if (r === 'rare') return 'rare'
  return 'rare'
}
