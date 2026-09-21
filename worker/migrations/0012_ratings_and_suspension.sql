-- Thumbs up/down left by one trade participant about the other, once the
-- trade has actually completed (both sides confirmed) -- see deriveStatus
-- in worker/src/routes/trades.js. UNIQUE(trade_id, rater_account_id): one
-- rating per person per trade, upserted (worker/src/routes/ratings.js)
-- rather than rejected on a second submission, so someone can revise their
-- rating rather than being stuck with a first impression.
CREATE TABLE IF NOT EXISTS trade_ratings (
  id TEXT PRIMARY KEY,
  trade_id TEXT NOT NULL REFERENCES trade_proposals(id) ON DELETE CASCADE,
  rater_account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  rated_account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  thumbs_up INTEGER NOT NULL CHECK (thumbs_up IN (0, 1)),
  comment TEXT,
  created_at INTEGER NOT NULL,
  UNIQUE(trade_id, rater_account_id)
);
CREATE INDEX IF NOT EXISTS idx_trade_ratings_rated ON trade_ratings(rated_account_id);

-- Nullable timestamp, not a boolean flag -- same convention already used
-- throughout this schema (from_confirmed_at, resolved_at, etc.): null
-- means never suspended, a value is both "yes" and "since when" in one
-- column. Admin-set only (worker/src/routes/admin.js's suspendUser) --
-- deliberately never automatic off a rating/report threshold, matching
-- how fraud reports already require human review before anything happens.
--
-- A suspended account can still log in and manage its own collection --
-- it's blocked at the specific write endpoints that could do more harm
-- (proposeTrade, respondToTrade, confirmTrade, sendMessage), not by
-- authenticate() itself. See "Ratings & suspension" in README.
ALTER TABLE accounts ADD COLUMN suspended_at INTEGER;
