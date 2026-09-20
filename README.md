# SwapDeck

A mobile-first web app that helps trading card collectors (Pokémon, Magic: The Gathering, Yu-Gi-Oh!) find **mutual trades** with other collectors — instead of shipping costs, grading disputes, and marketplace scams.

You build two lists — **Haves** and **Wants** — and SwapDeck surfaces other collectors whose lists complement yours, prioritizing "perfect" matches where *they have what you want* **and** *you have what they want*.

This is a real, deployed full-stack app, not just a demo: a Cloudflare Worker + D1 database backend (`worker/`) behind a real (if lightweight) account system, and a React/Vite frontend (`src/`) served as static assets from its own Worker. There's no mock data left anywhere in the app — every account, collection, and match is a real row in a real database.

**Live right now:**
- Frontend: **https://swapdeck.cards** (custom domain; the `swapdeck.cwinchester636.workers.dev` fallback is disabled now that a custom domain is configured — see **Custom domain** below)
- API: **https://swapdeck-api.cwinchester636.workers.dev**

## How it works

- **Onboarding** — create an account with a username, email, and password (plus an avatar and optional ZIP code), or log in to an existing one. Creates a real account server-side and returns an auth token (stored only in this browser's localStorage — see **Accounts & auth** below).
- **My Collection** — search Pokémon, Magic: The Gathering, and Yu-Gi-Oh! and add results to your Have/Want lists. All three search the real, complete live card databases (see **Live card search**) and show a current market price next to the set/number for any live-sourced card (see **Live pricing**).
- **Matches** — a ranked list of other collectors, computed server-side. 🤝 "Perfect trade match" badges mean a trade needs no cash or shipping either way. Tap a match to see exactly which cards would change hands, then send a trade proposal.
- **Trades** — respond to (accept/decline) proposals you've received, and confirm proposals you've sent once the swap actually happens. See **Trades & verification** below.
- **Profile** — update your avatar/ZIP/search radius, or log out.

## Accounts & auth

Signing up requires a username, an email address, and a password — all three, not optional. Logging in works with either the username or the email, plus the password (`POST /api/login`). Session auth underneath is still the original bearer-token model: creating or logging into an account generates a random 256-bit token, and the frontend keeps the raw token in `localStorage`, sending it as `Authorization: Bearer <token>` on every request (see `src/api/client.js`) — password auth is the *gate* to getting a token, not a replacement for how requests are authenticated afterward.

**Password storage.** PBKDF2-SHA256 with a random 16-byte salt per account and 100,000 iterations (`worker/src/utils.js`'s `hashPassword`/`verifyPassword`), not a plain digest — unlike the 256-bit random session token (which has full entropy and can safely use one fast `SHA-256` pass), a human-chosen password can't, so it needs a slow, salted KDF. Comparison at login uses a constant-time check (`timingSafeEqual`) rather than `===`, so a wrong guess can't be timed character-by-character. Minimum length is 8 characters; there's no composition rule (no forced digit/symbol) — length matters more than composition, per current guidance (e.g. NIST 800-63B).

**One session at a time.** `token_hash` is still a single `UNIQUE` column per account (`worker/migrations/0001_initial_schema.sql`), so logging in on a new device generates a new token and overwrites the old one, invalidating whatever session was active elsewhere. This is the same tradeoff the original token-only model had; a multi-session model would need a separate sessions table, which is future scope, not implemented here.

**Email is collected and validated for shape only — not verified.** Signup checks the address looks like `x@y.z` and rejects anything else, but no confirmation email is ever sent, so there's no proof it actually belongs to whoever's signing up, and consequently **no password-reset-via-email either** (there's nothing to prove ownership of the inbox with). This is a deliberate, explicit scope cut for now: real verification needs a transactional email provider (API key, verified sending domain — infrastructure this project doesn't have yet), and shipping a "reset link" flow without real verification would be worse than not having one. See `worker/src/routes/accounts.js`'s `EMAIL_RE` comment.

**What actually improved over the old pure-token model:** losing your `localStorage` token, or switching devices, used to mean losing the account outright, with zero recovery path. Now the password *is* the recovery path — log in with username-or-email + password from anywhere, get a fresh token. **Accounts created before this feature shipped (including the 3 seed demo accounts) have no password set** and can only be reached through their original browser's stored token — the login form's error message is deliberately generic ("incorrect username/email or password") for both a wrong password and a real-but-passwordless account, to avoid leaking which case it is.

## Trades & verification

A trade proposal moves through a small lifecycle in `worker/src/routes/trades.js`:

1. **Pending** — proposer sends a proposal (`POST /api/trades`). The recipient sees it under Trades → Received.
2. **Accepted / declined** — only the recipient can respond (`PATCH /api/trades/:id`). Declining is terminal; a new proposal can always be sent afterwards.
3. **Completed** — once accepted, either side can tap "Mark trade as complete" (`POST /api/trades/:id/confirm`) after the swap actually happens in person or by mail. **This only flips the trade to "completed" once *both* people have confirmed** — one person tapping the button isn't proof anything happened, it's just a claim. Confirming is idempotent (tapping it twice does nothing the second time), and only the two participants can confirm at all.

There's no "cancel" or "undo" — this is a deliberate MVP scope cut. If a trade falls through after being accepted, it just sits there unconfirmed; nothing currently prunes it.

`completed` isn't a value the `status` column can hold — the column's CHECK constraint (`pending`/`accepted`/`declined`) is intentionally left alone, since SQLite can't alter a CHECK constraint without recreating the table. Instead, "completed" is derived at read time from two nullable timestamp columns (`from_confirmed_at`, `to_confirmed_at`) both being set on an `accepted` row. See `worker/migrations/0002_trade_confirmations.sql`.

## Matching & proximity

Matching happens in `worker/src/routes/matches.js`: for each other account, it finds the overlap between their Haves and your Wants (and vice versa) using `game + lowercased name` as the identity key — not a shared card id, since cards can come from three different live APIs with no common id scheme.

**Real distance, when available.** On account creation and whenever a ZIP changes, the Worker geocodes it via [Zippopotam.us](https://www.zippopotam.us/) (free, keyless, server-side — same "free API, no key" pattern as the card search providers) and stores the ZIP centroid's `lat`/`lng`. When both sides of a potential match have coordinates, `worker/src/utils.js`'s `haversineMiles` computes real great-circle distance in miles, shown as e.g. "12.7 mi away". This is still centroid-based, not precise geolocation — no location-permission prompt, no device coordinates ever collected — so it's accurate to "which ZIP", not to the exact address.

**Search radius.** Profile has a "Search radius" setting (5/10/25/50/100/250 miles, or "Any distance" — the default). It's applied server-side in `getMatches`: a collector farther than your radius is dropped from *your* matches list (radius is per-viewer, not mutual — it never affects what you look like in anyone else's results). **A match is only ever filtered out when its distance is actually known.** If geocoding failed for either account (bad ZIP, Zippopotam down, no ZIP entered at all), that match's distance is `null` and it's always shown, radius setting or not — an infrastructure hiccup should never silently hide a legitimate match. Only a normal browser deploy's Worker has been used to test the actual Zippopotam call, since this sandbox blocks arbitrary outbound domains the same way it does for the card-search APIs (see **What's been verified vs. what hasn't**) — the surrounding filter/sort/graceful-degradation logic itself was fully verified locally by seeding known coordinates directly into D1 and exercising every path (in-radius, out-of-radius, radius removed, ZIP unchanged preserves coordinates, ZIP changed triggers re-geocode and nulls stale coordinates on failure) against the real Worker code.

**Fallback.** When distance can't be computed, the old ZIP-prefix bucketing still runs as a label: same ZIP ("Same ZIP code"), same first-3-digits ("Nearby (same area)"), or nothing. `distanceMiles` (when present) always takes priority over this in both sorting and display — see `src/utils/distance.js`.

## Live card search

Search results come from real, free, public card databases, queried directly from the browser (no extra backend hop, no API key):

- Pokémon → [Pokemon TCG API](https://docs.pokemontcg.io/)
- Magic: The Gathering → [Scryfall](https://scryfall.com/docs/api)
- Yu-Gi-Oh! → [YGOPRODeck](https://ygoprodeck.com/api-guide/)

These three were chosen specifically *because* they're free and CORS-enabled for direct browser use — no other trading card game has a comparable free public API, which is why the app is scoped to just these three (see `src/data/providers/`).

If a live API is unreachable, the picker shows a warning and falls back to a small curated catalog (`src/data/cards.js`) instead of breaking.

## Live pricing

Every live-sourced card shows its current TCGplayer-sourced market value next to its set and collector number (Pokemon TCG API's `tcgplayer.prices`, Scryfall's `prices.usd`, YGOPRODeck's `card_prices[].tcgplayer_price`) — no separate TCGplayer integration, just reading a field the search already fetched. This is one line, `CardMeta` (`src/components/CardMeta.jsx`), used everywhere a card is shown — the picker's search results, the condition step's preview *as you're selecting it*, and every `CardChip` in Collection and Matches — so there's no place in the app where a card's set/number shows without its value alongside it (when one's resolvable at all; see below).

**How "live" it stays.** A price isn't stored anywhere — it never touches the backend or D1 at all. Each `CardMeta` (via `src/hooks/useCardPrice.js`) fetches it directly from the browser the moment the card renders, the same way search itself works. That means it's current as of whenever you're looking at it, not a snapshot from whenever the card was added — genuinely "most up to date," at the cost of a re-fetch (not a page-load-time value fixed in the database) every time you open Collection or Matches. Results are cached in memory for the rest of the tab session, so re-rendering the same card (e.g. switching tabs and back) doesn't re-request it — a fresh page load always gets a fresh price.

**Why this needed a schema change.** Once a card is saved to a Have/Want list, its `id` becomes the collection row's own id (stable — it's what "remove card" deletes by). The original live-search id (e.g. `live-pkmn-base1-4`, which a price lookup needs) is preserved separately as `sourceId` (`source_id` column, added in `worker/migrations/0004_collection_source_id.sql`) — `id` and `sourceId` deliberately serve two different jobs and are never conflated.

**Only real printings get a price.** Cards added from the curated fallback catalog (`data/cards.js`, used when a live search fails) aren't tied to a specific real printing, so `sourceId` is null for them and no price is ever fetched or shown — no API call wasted trying.

**Rate-limit awareness.** A Collection or Matches view can render many cards' worth of price lookups at once; `src/data/providers/priceQueue.js` caps it to 4 concurrent requests app-wide rather than firing them all simultaneously at these free, keyless services.

## Card condition

Adding a card to a Have/Want list is a two-step picker (`src/components/CardPicker.jsx`): pick the card, then record its condition, before it's actually saved. Five options, worst to best: **Heavily Played**, **Moderately Played**, **Lightly Played**, **Near Mint**, and **Graded** — picking Graded reveals a grade field (1-10) that has to be filled with a valid whole number before "Add to list" is enabled. Condition defaults to Near Mint (the common case) but nothing is saved until the second step is actually confirmed.

Both fields are optional at the database level (`condition TEXT`, `grade INTEGER`, added in `worker/migrations/0005_card_condition.sql`) — older collection items predate this feature and simply have neither. The two-column split (rather than folding a grade into the condition string) is because "graded" and "the grade itself" are different questions: SQLite can't express "grade is required only when condition = 'graded'" as a column-level CHECK constraint (it can't reference another column), so that cross-field rule is enforced in `worker/src/routes/collection.js` instead — condition must be one of the five values, and a grade outside 1-10 (or a graded condition with no grade at all) is rejected with a 400. A grade sent alongside a *non*-graded condition is silently dropped rather than rejected, since it's harmless leftover state, not a meaningful error.

**Note this doesn't adjust the live price.** A card's shown market value (see **Live pricing** above) is whatever baseline condition the source API returns — condition and price are recorded and displayed independently, not combined into one condition-adjusted number.

## Value disparity warning

Committing to a trade (proposing one from Matches, or accepting one from Trades → Received) totals up the live market value of both sides first — what they'd be giving you against what you'd be giving them, using the exact same prices already shown on each `CardChip` (`src/utils/tradeValue.js`, `src/hooks/useCardPrice.js`'s shared cache, so it's never a different number than what's on screen). **If the two sides are more than 15% apart, a warning shows before anything is sent** (`ValueDisparityModal`) — both totals, the percentage gap, and a choice to cancel or proceed anyway. Nothing is blocked outright; this is a heads-up, not a rule.

"15% apart" is `(larger − smaller) / larger`, so a completely one-sided trade (one side priced at $0) always warns, and the two extremes only ever *widen* the warning, never suppress it. Cards with no resolvable live price (curated-catalog cards, or a provider that's down) simply aren't counted on either side — the comparison is honest about what's actually priced, never a guess dressed up as one. If *neither* side has any priced cards at all, there's nothing to compare and the trade proceeds with no popup, same as always.

**Why this needs `matches` in `TradesView`, not just `MatchesView`.** Proposing already has the two card lists in hand (`theyHaveYouWant`/`youHaveTheyWant`) from the match itself. Accepting doesn't — `GET /api/trades` was never extended with card data (a deliberate no-backend-change design: this is 100% client-side, reusing data the app already fetches) — so `App.jsx` now also passes its `matches` state into `TradesView`, which looks up the accepted trade's counterparty by account id to find the same two lists. If that lookup comes up empty (the overlap changed since the match was last computed, or matches hasn't loaded), accepting just proceeds without a check — consistent with the rest of the app's "never block on something we can't measure" posture (see **Matching & proximity**'s radius filtering and **Live pricing** above for the same principle applied elsewhere).

## Admin

An Admin tab (visible only to admins — it's not in the bottom nav at all for anyone else) lists every account, oldest first, and can permanently delete one: `GET /api/admin/users`, `DELETE /api/admin/users/:id` (`worker/src/routes/admin.js`, `src/components/AdminView.jsx`).

**Who's an admin is a fixed allowlist in `worker/wrangler.toml`'s `ADMIN_USERNAMES` var (comma-separated usernames), not a database column.** Deliberately not self-service: nothing in the app ever reads or writes admin status to/from a row, so no account — including an admin's own — can grant itself or anyone else admin access by writing data. Changing who's an admin means editing that var and deploying, the same as any other code change; it's checked into git like everything else here, not a runtime secret.

**Deleting a user is permanent and explicit-cascade, not FK-cascade.** `collection_items` and `trade_proposals` both declare `ON DELETE CASCADE` on their `account_id` foreign keys (`worker/migrations/0001_initial_schema.sql`), but SQLite — and by extension D1 — only enforces foreign key constraints when `PRAGMA foreign_keys` is turned on for the connection, which nothing in this codebase does. Rather than depend on that pragma's default (undocumented here either way), `deleteUser` explicitly deletes a target's collection items and every trade proposal on either side of them, then the account row itself, in one `env.DB.batch()` call.

**Guardrails:** the endpoint refuses to let an admin delete their own account (a 400, with a message pointing at logging out instead) — pure accident-prevention, not a security boundary, since an admin could just remove themselves from `ADMIN_USERNAMES` and redeploy anyway. The account list never includes `token_hash`, `password_hash`, or `password_salt` — nothing in the admin response could ever be used to authenticate as someone else, even by another admin.

## What's been verified vs. what hasn't

- **Verified end-to-end, locally, against the real backend code:** account creation, login (correct username-login, correct email-login, wrong password rejected with a generic error, a nonexistent account rejected with the exact same generic error, a pre-password legacy account correctly unable to log in, and a fresh login token correctly invalidating the previous one — single-session-per-account behavior), signup validation (missing/malformed email, under-length password, duplicate username, duplicate email including case-insensitively), auth, adding/removing collection items, server-side matching (including the mutual-match and proximity logic), distance-based matching (radius filtering that only ever excludes a match with a *known* out-of-radius distance, real-distance math cross-checked against known reference distances, ZIP-unchanged preserving stored coordinates vs. ZIP-changed correctly triggering re-geocode and nulling stale coordinates on failure), the full trade lifecycle (propose → accept/decline → mutual confirm → completed, including idempotent re-proposing, idempotent re-confirming, and every authorization guard — only the recipient can accept/decline, only participants can confirm, only an accepted trade can be confirmed), profile updates, `sourceId`/`id` correctly staying distinct through a full add → list → remove round trip for both a live-sourced and a curated-catalog card, card condition (every valid condition value, a graded card requiring a 1-10 grade, an out-of-range/non-integer/missing grade all correctly rejected, and a stray grade on a non-graded condition being silently dropped rather than erroring), the value-disparity warning (exact threshold boundary math, a balanced trade proposing/accepting with no popup, an imbalanced one blocking until Cancel or Proceed is chosen, and Cancel genuinely not sending anything), admin (a non-admin correctly getting a 403 on both list and delete, an admin listing every account, self-delete correctly refused with a 400, deleting a nonexistent user correctly 404ing, and a real delete leaving zero rows behind in `accounts`, `collection_items`, and `trade_proposals` alike — confirmed by direct query, not assumed from the FK declarations), and session persistence across a page reload — all driven through the actual UI (or, for the trade-lifecycle authorization edge cases and distance filtering, directly against the Worker API, seeding known coordinates straight into D1 since this sandbox can't reach the geocoding API itself) against Wrangler running locally with D1's local emulation.
- **Verified in production:** both Workers are deployed and live — the API at `https://swapdeck-api.cwinchester636.workers.dev` (bound to the real `swapdeck` D1 database, 3 seed accounts already in it) and the frontend at its custom domain, `https://swapdeck.cards` (built with `VITE_API_BASE_URL` pointing at that same API). Confirmed via the Cloudflare API (`workers_get_worker` for both `swapdeck-api` and `swapdeck`) and successful GitHub Actions runs, including the custom-domain route itself (Action log: `Deployed swapdeck triggers ... swapdeck.cards (custom domain)`) — this sandbox's own network policy blocks outbound requests to both `workers.dev` and `swapdeck.cards`, so a direct `curl` from here isn't possible, but every deploy is real and independently confirmed on Cloudflare's side.
- **Not yet verified:** the three live card-search APIs (including their single-card price-lookup endpoints — `GET /v2/cards/{id}`, `GET /cards/{id}`, `GET /cardinfo.php?id={id}`) and the Zippopotam.us ZIP-geocoding call, against the real internet (see **Live card search**, **Live pricing**, and **Matching & proximity** above) — same sandbox network restriction, so only their error-fallback paths have been exercised for real. The surrounding logic (which cards get a price fetch at all, the `sourceId`/`id` split surviving a full add → list → remove round trip, in-memory caching not re-requesting an already-resolved price, the concurrency queue) was fully verified locally with the three provider endpoints mocked at the network layer, returning realistic response shapes. Worth confirming a fresh signup with a real ZIP actually gets coordinates (check `radiusMiles` filtering has a visible effect), and that a newly-added live card actually shows a real price, once this is live.

## Deploying

Both the API and the frontend auto-deploy via GitHub Actions on every push to `main` (or `claude/simple-app-ideas-1y7kvr`, this branch) that touches their files — `.github/workflows/deploy-worker.yml` for `worker/`, `.github/workflows/deploy-frontend.yml` for everything else (`src/`, `index.html`, `wrangler.jsonc`, `.env`) — or manually via **Actions → (workflow name) → Run workflow**. One-time setup (already done for this deployment):

1. Repo secrets (Settings → Secrets and variables → Actions → **Repository secrets**, not Environment secrets): `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`.
2. The token needs **four** permissions, not the two you'd guess from Cloudflare's docs — the extra two matter specifically for `wrangler d1 migrations apply --remote`'s auth check:

   | Resource | Item | Permission |
   |---|---|---|
   | Account | Workers Scripts | Edit |
   | Account | D1 | Edit |
   | User | User Details | Read |
   | User | Memberships | Read |

3. A `workers.dev` subdomain registered on the account (one-time, free, done via the Cloudflare dashboard's Workers & Pages onboarding).
4. `actions/setup-node` **must use Node ≥22**. At Node 20, `cloudflare/wrangler-action` silently installs Wrangler 3.x instead of the 4.x this project actually targets, and Wrangler 3.x fails the `/memberships` auth check against a scoped API token in a way that looks identical to a bad token — this cost the most debugging time of anything above, so it's worth calling out on its own.
5. **A local `wrangler` devDependency pin (`"wrangler": "^4.0.0"`) in whichever `package.json` the deploy runs from.** `wrangler-action` only respects a project's own pinned version if one exists; with none, it silently falls back to an old default (3.90.0 in testing) regardless of Node version. That default can't do assets-only deploys at all (fails with "Missing entry-point"), which is exactly what hit the frontend deploy even after the Node fix above — both `worker/package.json` and the root `package.json` need this pin.
6. **Schema changes go through `worker/migrations/`, applied via `wrangler d1 migrations apply swapdeck --remote --config ./wrangler.toml`** (see `deploy-worker.yml`) — not a single hand-idempotent `schema.sql` run on every deploy (the original approach, before trades needed a schema change). Wrangler tracks which migration files have already run in a `d1_migrations` bookkeeping table on the database itself, so re-running the same command on every future deploy only ever applies files it hasn't seen yet — no risk of a second `ALTER TABLE ADD COLUMN` erroring on an already-migrated database.
7. **Every `wrangler` command run against `worker/` needs an explicit `--config ./wrangler.toml`, including `deploy` itself** — this repo is a monorepo with a second `wrangler.jsonc` at the root (for the frontend), and without `--config`, Wrangler 4.135.0 sometimes resolves against the *root* config instead of the one in `workingDirectory`. It first showed up as `d1 migrations apply` reporting "no migrations present" (resolving `migrations_dir` against the repo root); the same run's separate `wrangler deploy` step then failed too, with `The directory specified by the "assets.directory" field ... does not exist: .../dist` — i.e. it had picked up the *frontend's* config (which has an `assets.directory`) instead of the worker's. Both are fixed the same way: pass `--config ./wrangler.toml` explicitly, on every command, every time — don't rely on Wrangler finding the right file in a directory that has more than one config in its tree.

The frontend is a plain static-assets Worker (`wrangler.jsonc`, no `main` script, no bindings) built from `dist/` — Cloudflare's own guidance for this is `migrate_pages_to_workers_guide` (Pages is legacy; this is the current recommended path for a project with no server-side routes). The API's URL needs to be set as `VITE_API_BASE_URL` before building the frontend — already done here via a committed `.env` (see **Accounts & auth** — this value isn't a secret, the client has to know it regardless, so per Vite's convention it's checked in rather than left as a local-only override).

## Custom domain

`swapdeck.cards` is configured declaratively in `wrangler.jsonc` (`routes: [{ pattern: "swapdeck.cards", custom_domain: true }]`) rather than as a manual dashboard step, so it deploys through the same CI pipeline as everything else. Two things worth knowing if you change or add to this:

- **It needs one more token permission beyond the table above:** `Zone → Workers Routes → Edit`, scoped specifically to the `swapdeck.cards` zone. The account-level permissions that cover everything else don't cover this — it's zone-scoped, not account-scoped.
- **Adding a custom domain silently disables the `workers.dev` URL** unless `workers_dev: true` is explicitly set in `wrangler.jsonc` (confirmed via the deploy log: `Because 'workers_dev' is not in your Wrangler file, it will be disabled for this deployment by default`). `swapdeck.cwinchester636.workers.dev` is no longer reachable as a result — `swapdeck.cards` is the only public URL for the frontend now.
- Requires the domain to already be an active Cloudflare zone (automatic if bought through Cloudflare's own registrar, as this one was; otherwise the domain needs adding to Cloudflare with a nameserver change first).

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
npm run migrate:local   # apply worker/migrations/*.sql to a local SQLite file
npm run dev              # wrangler dev on :8787
```

## Project structure

**Frontend (`src/`)**
- `src/api/client.js` — talks to the Worker API; reads `VITE_API_BASE_URL`.
- `src/data/cards.js` — curated card catalog, used as the offline fallback when live search fails.
- `src/data/conditions.js` — the five condition values (worst → best) and grade bounds, shared by `CardPicker` and `CardChip`.
- `src/data/providers/` — live search *and* live pricing: `pokemonProvider.js`, `mtgProvider.js`, `yugiohProvider.js` (each exports a `search*Cards` and a `fetch*Price`), `fetchJson.js` (timeout/abort-aware fetch wrapper), `priceQueue.js` (app-wide concurrency cap on price lookups), `index.js` (dispatch by game, plus `fetchLivePrice` which parses a card's id to route to the right provider).
- `src/hooks/useCardSearch.js` — debounces a query, merges curated + live results, exposes loading/error state.
- `src/hooks/useCardPrice.js` — fetches (and in-memory caches, per tab session) a card's live price by id; exports the cache-aware `resolveCardPrice` for non-hook callers (`tradeValue.js`).
- `src/utils/tradeValue.js` — totals two card lists' live prices and flags a >15% gap; `src/utils/currency.js` — shared USD formatter.
- `src/hooks/useLocalStorage.js` — persists the auth token on-device.
- `src/utils/rarity.js` — maps each live API's rarity vocabulary onto the app's 5-bucket scale.
- `src/utils/distance.js` — formats a match's distance label, preferring real `distanceMiles` over the ZIP-prefix fallback.
- `src/components/` — `Onboarding` (signup + login, toggled), `BottomNav`, `HomeView`, `CollectionView`, `CardPicker`, `CardChip`, `CardMeta` (set/number/price, shared by `CardChip` and `CardPicker`), `MatchesView`, `TradesView`, `ValueDisparityModal`, `AdminView`, `ProfileView`, `AvatarPicker`, `AvatarIcon`.
- `src/App.jsx` — auth/session orchestration, data fetching, tab navigation.

**Frontend deploy**
- `wrangler.jsonc` — assets-only Worker config, points at the Vite build output (`./dist`).
- `.env` — `VITE_API_BASE_URL`, checked in since it's not a secret.

**Backend (`worker/`)**
- `worker/migrations/` — D1 schema, applied via Wrangler's tracked migrations system (`0001_initial_schema.sql` — `accounts`, `collection_items`, `trade_proposals`; `0002_trade_confirmations.sql` — mutual trade-completion tracking; `0003_geolocation.sql` — `lat`/`lng`/`radius_miles` on `accounts`; `0004_collection_source_id.sql` — `source_id` on `collection_items`, for live pricing; `0005_card_condition.sql` — `condition`/`grade` on `collection_items`; `0006_password_email.sql` — `email`/`password_hash`/`password_salt` on `accounts`).
- `worker/src/index.js` — router.
- `worker/src/auth.js` — bearer-token authentication.
- `worker/src/admin.js` — `isAdminUsername`, checked against the `ADMIN_USERNAMES` var in `wrangler.toml`.
- `worker/src/routes/` — `accounts.js`, `collection.js`, `matches.js`, `trades.js`, `admin.js`.
- `worker/src/geocode.js` — ZIP → lat/lng via Zippopotam.us, timeout-guarded, never throws.
- `worker/src/utils.js` — JSON/CORS response helpers, token generation/hashing, password hashing/verification (PBKDF2), ZIP proximity, haversine distance.
- `worker/wrangler.toml` — Worker config, including the real D1 database binding.

**CI**
- `.github/workflows/deploy-worker.yml` — applies pending D1 migrations and deploys the API Worker.
- `.github/workflows/deploy-frontend.yml` — builds the Vite app and deploys it as a static-assets Worker.
