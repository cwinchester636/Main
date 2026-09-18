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
