-- Tracks which account pairs have already been shown to each other as a
-- match at least once, so worker/src/routes/matchAlerts.js can tell a
-- brand-new match from one that's just still there because nothing
-- changed. A match is inherently symmetric (A matches B exactly when B
-- matches A), so this is one row per unordered pair -- account_id_a is
-- always the lexicographically smaller id, enforced by the CHECK rather
-- than trusted from the insert -- not two directed rows.
--
-- Deliberately never cleaned up when a match later disappears (e.g. the
-- overlapping card gets removed): if it reappears, this stays quiet
-- rather than re-notifying. Same "under- rather than over-notify" bias as
-- every other push trigger in this app.
CREATE TABLE IF NOT EXISTS known_matches (
  id TEXT PRIMARY KEY,
  account_id_a TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  account_id_b TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  first_seen_at INTEGER NOT NULL,
  CHECK (account_id_a < account_id_b),
  UNIQUE(account_id_a, account_id_b)
);

CREATE INDEX IF NOT EXISTS idx_known_matches_a ON known_matches(account_id_a);
CREATE INDEX IF NOT EXISTS idx_known_matches_b ON known_matches(account_id_b);
