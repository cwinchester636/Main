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

- **Verified end-to-end, locally, against the real backend code:** account creation, auth, adding/removing collection items, server-side matching (including the mutual-match and proximity logic), trade proposals (including idempotent re-proposing), profile updates, and session persistence across a page reload — all driven through the actual UI in a real browser against the Worker running locally with D1's local emulation.
- **Verified in production:** the Worker is deployed and live at **`https://swapdeck-api.cwinchester636.workers.dev`**, bound to the real `swapdeck` D1 database (3 seed accounts already in it). Confirmed via the Cloudflare API and a successful GitHub Actions run (`.github/workflows/deploy-worker.yml`, run #9) — this sandbox's own network policy blocks outbound requests to `workers.dev`, so a direct `curl` from here isn't possible, but the deploy itself is real and independently confirmed.
- **Not yet verified:** the three live card-search APIs against the real internet (see **Live card search** above) — same sandbox network restriction, so only their error-fallback path has been exercised for real. Worth a smoke test from a normal browser.

## Deploying

The Worker auto-deploys via GitHub Actions (`.github/workflows/deploy-worker.yml`) on every push to `main` (or `claude/simple-app-ideas-1y7kvr`, this branch) that touches `worker/`, or via **Actions → Deploy SwapDeck API → Run workflow** for a manual trigger. One-time setup (already done for this deployment):

1. Repo secrets (Settings → Secrets and variables → Actions → **Repository secrets**, not Environment secrets): `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`.
2. The token needs **four** permissions, not the two you'd guess from Cloudflare's docs — the extra two matter specifically for `wrangler d1 execute --remote`'s auth check:

   | Resource | Item | Permission |
   |---|---|---|
   | Account | Workers Scripts | Edit |
   | Account | D1 | Edit |
   | User | User Details | Read |
   | User | Memberships | Read |

3. A `workers.dev` subdomain registered on the account (one-time, free, done via the Cloudflare dashboard's Workers & Pages onboarding).
4. `actions/setup-node` **must use Node ≥22**. At Node 20, `cloudflare/wrangler-action` silently installs Wrangler 3.x instead of the 4.x this project actually targets (ignoring `worker/package.json`'s version pin entirely), and Wrangler 3.x fails the `/memberships` auth check against a scoped API token in a way that looks identical to a bad token — this cost the most debugging time of anything above, so it's worth calling out on its own.

The deployed URL is `https://swapdeck-api.<your-subdomain>.workers.dev` (shown in the Action's log). Set it as `VITE_API_BASE_URL` wherever you build/host the frontend (see `.env.example`) — for this deployment, that's `https://swapdeck-api.cwinchester636.workers.dev`.

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
