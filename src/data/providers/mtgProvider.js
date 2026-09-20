import { fetchJson } from './fetchJson.js'
import { mapScryfallRarity } from '../../utils/rarity.js'

// Scryfall API — free, no key required, explicitly CORS-enabled for
// client-side apps. https://scryfall.com/docs/api
const BASE_URL = 'https://api.scryfall.com/cards/search'

function cardImage(raw) {
  return raw.image_uris?.small ?? raw.card_faces?.[0]?.image_uris?.small ?? null
}

export function normalizeMtgCard(raw) {
  return {
    id: `live-mtg-${raw.id}`,
    name: raw.name,
    game: 'mtg',
    set: raw.set_name ?? 'Unknown Set',
    number: `#${raw.collector_number}`,
    rarity: mapScryfallRarity(raw.rarity),
    image: cardImage(raw),
  }
}

export async function searchMtgCards(query, { signal } = {}) {
  const q = encodeURIComponent(query)
  const json = await fetchJson(`${BASE_URL}?q=${q}&order=name&unique=prints`, { signal })
  if (json.object === 'error') return [] // e.g. 404 "no matching cards" — not a failure
  return (json.data ?? []).map(normalizeMtgCard)
}

export async function fetchMtgPrice(rawId, { signal } = {}) {
  const json = await fetchJson(`https://api.scryfall.com/cards/${encodeURIComponent(rawId)}`, { signal })
  if (json.object === 'error') return null

  const usd = json.prices?.usd ?? json.prices?.usd_foil
  if (!usd) return null
  return { amount: parseFloat(usd), currency: 'USD' }
}
