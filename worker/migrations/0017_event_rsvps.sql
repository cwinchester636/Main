-- One row per person going to an event -- see worker/src/routes/events.js
-- toggleRsvp. UNIQUE(event_id, account_id): "going" is on/off, not a count
-- of how many times someone tapped the button, same one-row-per-relationship
-- shape as trade_ratings/known_matches elsewhere in this schema.
CREATE TABLE IF NOT EXISTS event_rsvps (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES local_events(id) ON DELETE CASCADE,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  UNIQUE(event_id, account_id)
);

CREATE INDEX IF NOT EXISTS idx_event_rsvps_event ON event_rsvps(event_id);
CREATE INDEX IF NOT EXISTS idx_event_rsvps_account ON event_rsvps(account_id);
