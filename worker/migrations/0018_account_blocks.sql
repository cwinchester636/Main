-- A personal, one-directional block -- see worker/src/routes/blocks.js.
-- Unlike known_matches (a symmetric relationship, one canonical row per
-- pair), blocking has a clear direction: blocker_account_id chose to cut
-- off blocked_account_id, not the other way around. Effects are still
-- applied in both directions where it matters (matches, new proposals) --
-- see blocks.js and README "Blocking".
CREATE TABLE IF NOT EXISTS account_blocks (
  id TEXT PRIMARY KEY,
  blocker_account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  blocked_account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  UNIQUE(blocker_account_id, blocked_account_id)
);

CREATE INDEX IF NOT EXISTS idx_account_blocks_blocker ON account_blocks(blocker_account_id);
CREATE INDEX IF NOT EXISTS idx_account_blocks_blocked ON account_blocks(blocked_account_id);
