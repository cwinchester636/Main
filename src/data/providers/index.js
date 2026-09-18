import { searchPokemonCards } from './pokemonProvider.js'
import { searchMtgCards } from './mtgProvider.js'
import { searchYugiohCards } from './yugiohProvider.js'

// One Piece Card Game and Union Arena have no free public card database API
// as of this writing, so they aren't listed here — search for those games
// falls back to the curated catalog in data/cards.js only.
export const LIVE_PROVIDERS = {
  pokemon: searchPokemonCards,
  mtg: searchMtgCards,
  yugioh: searchYugiohCards,
}

export const LIVE_GAME_IDS = Object.keys(LIVE_PROVIDERS)
