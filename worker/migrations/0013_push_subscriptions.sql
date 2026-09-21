-- One row per browser subscription (a person with two devices/browsers has
-- two rows). endpoint is UNIQUE and drives ON CONFLICT upsert in
-- worker/src/routes/push.js -- re-subscribing the same browser/account pair
-- (e.g. after the push service rotates the endpoint under the hood) just
-- overwrites the existing row's keys rather than accumulating duplicates.
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_account ON push_subscriptions(account_id);
