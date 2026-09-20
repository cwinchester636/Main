import { fetchJson } from './fetchJson.js'
import { mapPokemonRarity } from '../../utils/rarity.js'

// Pokemon TCG API — free, no key required, CORS-enabled for browser use.
// https://docs.pokemontcg.io/
const BASE_URL = 'https://api.pokemontcg.io/v2/cards'

export function normalizePokemonCard(raw) {
  const total = raw.set?.printedTotal ?? raw.set?.total
  return {
    id: `live-pkmn-${raw.id}`,
    name: raw.name,
    game: 'pokemon',
    set: raw.set?.name ?? 'Unknown Set',
    number: total ? `${raw.number}/${total}` : raw.number,
    rarity: mapPokemonRarity(raw.rarity),
    image: raw.images?.small ?? null,
  }
}

export async function searchPokemonCards(query, { signal } = {}) {
  const q = encodeURIComponent(`name:"${query.replace(/"/g, '')}*"`)
  const json = await fetchJson(`${BASE_URL}?q=${q}&pageSize=20&orderBy=-set.releaseDate`, { signal })
  return (json.data ?? []).map(normalizePokemonCard)
}

// TCGplayer-sourced pricing, already embedded in every card response — no
// separate TCGplayer integration needed. A card can have several printings
// (normal/holofoil/reverse holofoil/etc.), each with its own price block;
// this just takes the first one with a usable market price.
const PRICE_VARIANTS = ['holofoil', 'normal', 'reverseHolofoil', '1stEditionHolofoil', '1stEditionNormal']

export async function fetchPokemonPrice(rawId, { signal } = {}) {
  const json = await fetchJson(`${BASE_URL}/${encodeURIComponent(rawId)}`, { signal })
  const prices = json.data?.tcgplayer?.prices
  if (!prices) return null

  for (const variant of PRICE_VARIANTS) {
    const amount = prices[variant]?.market ?? prices[variant]?.mid
    if (typeof amount === 'number') return { amount, currency: 'USD' }
  }
  return null
}
