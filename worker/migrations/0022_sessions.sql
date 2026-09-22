-- Multi-session support. Previously each account had exactly one active
-- login -- a single token_hash column on accounts, overwritten by every
-- new login -- which meant logging in on a second device (or re-running a
-- test build) silently invalidated whatever session was active elsewhere.
-- That's directly against "stay signed in unless you choose to log out."
-- This table replaces that: one row per active login, so a phone and a
-- browser can each hold their own valid session at the same time. See
-- worker/src/auth.js.
--
-- accounts.token_hash is no longer used for authentication going forward
-- -- it's left in place unused rather than dropped, since it's a NOT NULL
-- UNIQUE column and removing it needs a full table-recreate migration
-- (the same kind 0019_trade_status_cancelled.sql did), not worth the risk
-- for a purely cosmetic cleanup. createAccount still writes a value into
-- it once, at creation, purely to satisfy that constraint.
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_account ON sessions(account_id);

-- Every account's existing single session (its current accounts.token_hash)
-- is carried over as that account's first sessions row -- otherwise this
-- migration would instantly log out every currently-logged-in user, the
-- exact opposite of what it's for.
INSERT INTO sessions (id, account_id, token_hash, created_at)
SELECT lower(hex(randomblob(16))), id, token_hash, created_at FROM accounts;
