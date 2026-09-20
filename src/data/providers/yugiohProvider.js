import { fetchJson } from './fetchJson.js'
import { mapYugiohRarity } from '../../utils/rarity.js'

// YGOPRODeck API — free, no key required, widely used for direct
// client-side fetches. https://ygoprodeck.com/api-guide/
const BASE_URL = 'https://db.ygoprodeck.com/api/v7/cardinfo.php'

export function normalizeYugiohCard(raw) {
  const firstSet = raw.card_sets?.[0]
  return {
    id: `live-ygo-${raw.id}`,
    name: raw.name,
    game: 'yugioh',
    set: firstSet?.set_name ?? raw.type ?? 'Unknown Set',
    number: firstSet?.set_code ?? '—',
    rarity: mapYugiohRarity(firstSet?.set_rarity),
    image: raw.card_images?.[0]?.image_url_small ?? null,
  }
}

export async function searchYugiohCards(query, { signal } = {}) {
  const q = encodeURIComponent(query)
  const json = await fetchJson(`${BASE_URL}?fname=${q}&num=20&offset=0`, { signal })
  if (json.error) return [] // "No card matching your query was found" — not a failure
  return (json.data ?? []).map(normalizeYugiohCard)
}

export async function fetchYugiohPrice(rawId, { signal } = {}) {
  const json = await fetchJson(`${BASE_URL}?id=${encodeURIComponent(rawId)}`, { signal })
  if (json.error) return null

  const prices = json.data?.[0]?.card_prices?.[0]
  const amount = parseFloat(prices?.tcgplayer_price ?? prices?.cardmarket_price)
  if (!Number.isFinite(amount) || amount <= 0) return null
  return { amount, currency: 'USD' }
}
