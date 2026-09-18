# SwapDeck

A mobile-first web app that helps trading card collectors (Pokémon, Magic: The Gathering, sports cards) find **mutual, in-person trades** with people nearby — instead of shipping costs, grading disputes, and marketplace scams.

You build two lists — **Haves** and **Wants** — and SwapDeck surfaces nearby collectors whose lists complement yours, prioritizing "perfect" matches where *they have what you want* **and** *you have what they want*.

## How it works

- **Onboarding** — pick a display name and avatar (stored only on your device).
- **My Collection** — search across **six** card games and add results to your Have/Want lists. Pokémon, Magic: The Gathering, and Yu-Gi-Oh! search the real, complete card databases live (see below); sports, One Piece Card Game, and Union Arena search a curated catalog of well-known cards.
- **Matches** — a ranked list of nearby collectors. 🤝 "Perfect trade match" badges mean a trade needs no cash or shipping either way. Tap a match to see exactly which cards would change hands, then send a trade proposal.
- **Profile** — update your name/avatar or reset your collection.

### Live card search

Search results for Pokémon, MTG, and Yu-Gi-Oh! come from real, free, public card databases, queried directly from the browser (no backend, no API key):

- Pokémon → [Pokemon TCG API](https://docs.pokemontcg.io/)
- Magic: The Gathering → [Scryfall](https://scryfall.com/docs/api)
- Yu-Gi-Oh! → [YGOPRODeck](https://ygoprodeck.com/api-guide/)

Sports cards, One Piece Card Game, and Union Arena don't have a comparable free public API, so those stay on the curated catalog in `src/data/cards.js`.

If a live API is unreachable (offline, corporate firewall, rate limit), the picker shows a warning and falls back to the curated catalog for that game instead of breaking — see `src/hooks/useCardSearch.js` and `src/data/providers/`.

**Not yet verified end-to-end against the live APIs.** This was built and unit-tested (`src/data/providers/*Provider.js` export pure `normalize*Card` functions tested against hand-built sample payloads matching each API's documented schema) in a sandboxed environment whose network policy blocks these exact domains, so the request/response wiring has only been exercised via its error-fallback path, not a real successful fetch. It should work as-is (these are the standard, CORS-enabled, no-key APIs used across the hobbyist TCG-app ecosystem for exactly this purpose) — worth a smoke test after your first deploy or local run with normal internet access.

### Note on "nearby collectors" and matching

This is a front-end prototype: `src/data/mockCollectors.js` stands in for a real backend (accounts, geolocation, messaging). Because cards can come from the curated catalog *or* a live API, each with its own id scheme, `src/utils/matching.js` identifies "the same card" by game + card name rather than by id (see `matchKey()`) — a deliberate simplification, since a real production app would match on a canonical id instead.

## Development

```bash
npm install
npm run dev      # start the dev server
npm run build    # production build
npm run lint      # oxlint
```

## Project structure

- `src/data/cards.js` — curated card catalog (name/set/number/rarity) and search helper.
- `src/data/providers/` — live search: `pokemonProvider.js`, `mtgProvider.js`, `yugiohProvider.js` (each fetch + normalize to a common card shape), `fetchJson.js` (timeout/abort-aware fetch wrapper), `index.js` (dispatch by game).
- `src/hooks/useCardSearch.js` — debounces a query, merges curated + live results, exposes loading/error state.
- `src/data/mockCollectors.js` — mock nearby collectors with Have/Want lists, standing in for a real backend.
- `src/utils/matching.js` — computes mutual vs. one-directional trade matches via `matchKey()` (game + name).
- `src/utils/rarity.js` — maps each live API's rarity vocabulary onto the app's 5-bucket scale.
- `src/hooks/useLocalStorage.js` — persists your profile, Haves, Wants, and sent proposals on-device.
- `src/components/` — `Onboarding`, `BottomNav`, `HomeView`, `CollectionView`, `CardPicker`, `CardChip`, `MatchesView`, `ProfileView`.
- `src/App.jsx` — app shell and tab navigation.
