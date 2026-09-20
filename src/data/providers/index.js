import { searchPokemonCards, fetchPokemonPrice } from './pokemonProvider.js'
import { searchMtgCards, fetchMtgPrice } from './mtgProvider.js'
import { searchYugiohCards, fetchYugiohPrice } from './yugiohProvider.js'
import { withPriceQueue } from './priceQueue.js'

// One Piece Card Game and Union Arena have no free public card database API
// as of this writing, so they aren't listed here — search for those games
// falls back to the curated catalog in data/cards.js only.
export const LIVE_PROVIDERS = {
  pokemon: searchPokemonCards,
  mtg: searchMtgCards,
  yugioh: searchYugiohCards,
}

export const LIVE_GAME_IDS = Object.keys(LIVE_PROVIDERS)

// Every live-sourced card's id is `live-<prefix>-<raw provider id>` (see
// normalize* in each provider) — that's enough to look the same card back
// up later for a fresh price, without the backend needing to store or know
// anything about pricing.
const PRICE_FETCHERS = {
  pkmn: fetchPokemonPrice,
  mtg: fetchMtgPrice,
  ygo: fetchYugiohPrice,
}
const LIVE_ID_RE = /^live-(pkmn|mtg|ygo)-(.+)$/

// Curated-catalog cards (ids like "pkmn-charizard-base") aren't tied to a
// real printing, so they never have a live price — this returns null for
// those without making a request.
export async function fetchLivePrice(cardId, { signal } = {}) {
  const match = LIVE_ID_RE.exec(cardId)
  if (!match) return null

  const [, prefix, rawId] = match
  try {
    return await withPriceQueue(() => PRICE_FETCHERS[prefix](rawId, { signal }))
  } catch {
    return null
  }
}
