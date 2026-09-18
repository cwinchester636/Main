# SwapDeck

A mobile-first web app that helps trading card collectors (Pokémon, Magic: The Gathering, sports cards) find **mutual, in-person trades** with people nearby — instead of shipping costs, grading disputes, and marketplace scams.

You build two lists — **Haves** and **Wants** — and SwapDeck surfaces nearby collectors whose lists complement yours, prioritizing "perfect" matches where *they have what you want* **and** *you have what they want*.

## How it works

- **Onboarding** — pick a display name and avatar (stored only on your device).
- **My Collection** — search a catalog of well-known Pokémon, MTG, and sports cards and add them to your Have/Want lists.
- **Matches** — a ranked list of nearby collectors. 🤝 "Perfect trade match" badges mean a trade needs no cash or shipping either way. Tap a match to see exactly which cards would change hands, then send a trade proposal.
- **Profile** — update your name/avatar or reset your collection.

### Note on "nearby collectors"

This is a front-end prototype: `src/data/mockCollectors.js` stands in for a real backend (accounts, geolocation, messaging). The matching logic in `src/utils/matching.js` and every view are written against that data shape, so swapping in a real API later is a drop-in change — nothing else needs to move.

## Development

```bash
npm install
npm run dev      # start the dev server
npm run build    # production build
npm run lint      # oxlint
```

## Project structure

- `src/data/cards.js` — card catalog (name/set/rarity) and search helper.
- `src/data/mockCollectors.js` — mock nearby collectors with Have/Want lists, standing in for a real backend.
- `src/utils/matching.js` — computes mutual vs. one-directional trade matches.
- `src/hooks/useLocalStorage.js` — persists your profile, Haves, Wants, and sent proposals on-device.
- `src/components/` — `Onboarding`, `BottomNav`, `HomeView`, `CollectionView`, `CardPicker`, `CardChip`, `MatchesView`, `ProfileView`.
- `src/App.jsx` — app shell and tab navigation.
