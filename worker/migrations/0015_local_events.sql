-- User-submitted local card events (tournaments, releases, meetups) -- see
-- worker/src/routes/events.js. lat/lng are geocoded from `zip` at creation
-- time the same way accounts.zip already is (worker/src/geocode.js); either
-- can be null if geocoding fails, same "falls back to coarse proximity,
-- never blocks the write" tradeoff as everywhere else this app geocodes.
CREATE TABLE IF NOT EXISTS local_events (
  id TEXT PRIMARY KEY,
  created_by_account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  game TEXT,
  location_name TEXT,
  zip TEXT NOT NULL,
  lat REAL,
  lng REAL,
  event_at INTEGER NOT NULL,
  link TEXT,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_local_events_event_at ON local_events(event_at);
CREATE INDEX IF NOT EXISTS idx_local_events_created_by ON local_events(created_by_account_id);
