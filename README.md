# SwapDeck

A mobile-first web app that helps trading card collectors (Pokémon, Magic: The Gathering, Yu-Gi-Oh!) find **mutual trades** with other collectors — instead of shipping costs, grading disputes, and marketplace scams.

You build two lists — **Haves** and **Wants** — and SwapDeck surfaces other collectors whose lists complement yours, prioritizing "perfect" matches where *they have what you want* **and** *you have what they want*.

This is a real, deployable full-stack app: a Cloudflare Worker + D1 database backend (`worker/`) behind a real (if lightweight) account system, and a React/Vite frontend (`src/`) that talks to it. There's no mock data left anywhere in the app — every account, collection, and match is a real row in a real database.

## How it works

- **Onboarding** — pick a username, avatar, and optional ZIP code. Creates a real account server-side and returns an auth token (stored only in this browser's localStorage — see **Accounts & auth** below).
- **My Collection** — search Pokémon, Magic: The Gathering, and Yu-Gi-Oh! and add results to your Have/Want lists. All three search the real, complete live card databases (see **Live card search**).
- **Matches** — a ranked list of other collectors, computed server-side. 🤝 "Perfect trade match" badges mean a trade needs no cash or shipping either way. Tap a match to see exactly which cards would change hands, then send a trade proposal.
- **Profile** — update your avatar/ZIP, or log out.

## Accounts & auth

There's no password or email — deliberately, to avoid standing up an email provider for an MVP. Creating an account generates a random 256-bit token, shown to you once; only its SHA-256 hash is stored server-side (`worker/schema.sql`). The frontend keeps the raw token in `localStorage` and sends it as `Authorization: Bearer <token>` on every request (see `src/api/client.js`).

**The real tradeoff this creates: losing the token (clearing browser storage, switching devices) means losing access to that account, with no recovery path.** That's the deliberate MVP simplification — the upgrade path is adding email-based recovery (magic link) later without changing the token-auth mechanism itself, just adding a way to re-issue a token to a verified email.

## Matching & proximity

Matching happens in `worker/src/routes/matches.js`: for each other account, it finds the overlap between their Haves and your Wants (and vice versa) using `game + lowercased name` as the identity key — not a shared card id, since cards can come from three different live APIs with no common id scheme.

Proximity is ZIP-code-based, not real geolocation: same ZIP ("Same ZIP code"), same first-3-digits ("Nearby (same area)"), or unranked. This is a deliberate simplification — no location-permission prompt, no need to store precise coordinates, and no dependency on a geocoding service — at the cost of being coarse (two ZIPs sharing a prefix can still be many miles apart in low-density areas). A real geodistance upgrade would mean adding a ZIP-centroid lookup or a geocoding API call at signup.

## Live card search

Search results come from real, free, public card databases, queried directly from the browser (no extra backend hop, no API key):

- Pokémon → [Pokemon TCG API](https://docs.pokemontcg.io/)
- Magic: The Gathering → [Scryfall](https://scryfall.com/docs/api)
- Yu-Gi-Oh! → [YGOPRODeck](https://ygoprodeck.com/api-guide/)

These three were chosen specifically *because* they're free and CORS-enabled for direct browser use — no other trading card game has a comparable free public API, which is why the app is scoped to just these three (see `src/data/providers/`).

If a live API is unreachable, the picker shows a warning and falls back to a small curated catalog (`src/data/cards.js`) instead of breaking.

**Real pricing note:** all three APIs also return TCGplayer-sourced market prices in their responses (Pokemon TCG API's `tcgplayer.prices`, Scryfall's `prices.usd`, YGOPRODeck's `card_prices[].tcgplayer_price`) — real accurate values are available for free with no separate TCGplayer integration, just by reading a field that's already being fetched. Not wired up yet, but a small addition whenever it's wanted.

## What's been verified vs. what hasn't

- **Verified end-to-end, locally, against the real backend code:** account creation, auth, adding/removing collection items, server-side matching (including the mutual-match and proximity logic), trade proposals (including idempotent re-proposing), profile updates, and session persistence across a page reload — all driven through the actual UI in a real browser against the Worker running locally with D1's local emulation (no cloud credentials needed for this — `wrangler dev` uses a local SQLite file by default).
- **Provisioned for real:** the production D1 database exists in the connected Cloudflare account (schema applied, 3 seed accounts with realistic Have/Want lists so matches are visible from day one — see `worker/schema.sql` for the schema those seeds follow).
- **Not yet verified:** the actual production deploy. This sandbox has no Cloudflare API token, so `wrangler deploy` has never been run for real here — see **Deploying** below for the one remaining step.
- **Not yet verified:** the three live card-search APIs against the real internet (see **Live card search** above) — this sandbox's network policy blocks those specific domains, so only their error-fallback path has been exercised for real.

## Deploying

The Worker auto-deploys via GitHub Actions (`.github/workflows/deploy-worker.yml`) on every push to `main` that touches `worker/`. One-time setup:

1. In the repo's GitHub settings → Secrets and variables → Actions, add:
   - `CLOUDFLARE_API_TOKEN` — a token with Workers Scripts:Edit and D1:Edit permissions.
   - `CLOUDFLARE_ACCOUNT_ID` — your Cloudflare account id (optional, but recommended if the token has access to more than one account).
2. Push to `main`. The workflow applies `worker/schema.sql` (idempotent — safe to run on every deploy) and deploys the Worker.
3. Note the deployed URL (`https://swapdeck-api.<your-subdomain>.workers.dev`, shown in the Action's log and the Cloudflare dashboard) and set it as `VITE_API_BASE_URL` wherever you build/host the frontend (see `.env.example`).

The production D1 database and its 3 seed accounts already exist and don't need to be recreated — only the Worker script itself needs its first real deploy.

## Development

**Frontend:**
```bash
npm install
npm run dev      # start the dev server (defaults to talking to a Worker on localhost:8787)
npm run build    # production build
npm run lint      # oxlint
```

**Backend** (`worker/`), fully runnable and testable without any cloud credentials via D1's local emulation:
```bash
cd worker
npm install
npm run migrate:local   # apply schema.sql to a local SQLite file
npm run dev              # wrangler dev on :8787
```

## Project structure

**Frontend (`src/`)**
- `src/api/client.js` — talks to the Worker API; reads `VITE_API_BASE_URL`.
- `src/data/cards.js` — curated card catalog, used as the offline fallback when live search fails.
- `src/data/providers/` — live search: `pokemonProvider.js`, `mtgProvider.js`, `yugiohProvider.js`, `fetchJson.js` (timeout/abort-aware fetch wrapper), `index.js` (dispatch by game).
- `src/hooks/useCardSearch.js` — debounces a query, merges curated + live results, exposes loading/error state.
- `src/hooks/useLocalStorage.js` — persists the auth token on-device.
- `src/utils/rarity.js` — maps each live API's rarity vocabulary onto the app's 5-bucket scale.
- `src/components/` — `Onboarding`, `BottomNav`, `HomeView`, `CollectionView`, `CardPicker`, `CardChip`, `MatchesView`, `ProfileView`.
- `src/App.jsx` — auth/session orchestration, data fetching, tab navigation.

**Backend (`worker/`)**
- `worker/schema.sql` — D1 schema (`accounts`, `collection_items`, `trade_proposals`), idempotent.
- `worker/src/index.js` — router.
- `worker/src/auth.js` — bearer-token authentication.
- `worker/src/routes/` — `accounts.js`, `collection.js`, `matches.js`, `trades.js`.
- `worker/src/utils.js` — JSON/CORS response helpers, token generation/hashing, ZIP proximity.
- `worker/wrangler.toml` — Worker config, including the real D1 database binding.

**CI**
- `.github/workflows/deploy-worker.yml` — applies the schema and deploys the Worker on push to `main`.
