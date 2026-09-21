-- In-app fallback/history for everything worker/src/push.js also tries to
-- push (see notifyAccount) -- a row is written here every time, regardless
-- of whether the account has push enabled or any subscription at all, so
-- someone who never turned on notifications (or whose push failed/was
-- missed) still has somewhere to see what happened.
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  link_tab TEXT,
  read_at INTEGER,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_notifications_account ON notifications(account_id, created_at);
