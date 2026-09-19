-- SwapDeck backend schema (Cloudflare D1 / SQLite).
--
-- Auth is a single bearer token per account (no password/email): the token
-- is generated on account creation, shown once, and its SHA-256 hash is
-- what's stored here. This is a deliberate MVP simplification — there's no
-- recovery path if a token is lost, which is the tradeoff for skipping an
-- email provider entirely. See README for the upgrade path.
CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  token_hash TEXT NOT NULL UNIQUE,
  avatar TEXT NOT NULL DEFAULT '🙂',
  zip TEXT,
  created_at INTEGER NOT NULL
);

-- Cards are denormalized (no shared FK to a canonical card table) because
-- they come from three different live third-party APIs with no common id
-- scheme. "The same card" is identified by game + lower(name), same
-- simplification the client used against mock data (see matching.js in
-- the previous version of this app).
CREATE TABLE IF NOT EXISTS collection_items (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  list_type TEXT NOT NULL CHECK (list_type IN ('have', 'want')),
  game TEXT NOT NULL,
  name TEXT NOT NULL,
  set_name TEXT,
  number TEXT,
  rarity TEXT,
  image TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_collection_account ON collection_items(account_id, list_type);
CREATE INDEX IF NOT EXISTS idx_collection_matchkey ON collection_items(game, name, list_type);

CREATE TABLE IF NOT EXISTS trade_proposals (
  id TEXT PRIMARY KEY,
  from_account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  to_account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_trades_to ON trade_proposals(to_account_id, status);
CREATE INDEX IF NOT EXISTS idx_trades_from ON trade_proposals(from_account_id, status);
