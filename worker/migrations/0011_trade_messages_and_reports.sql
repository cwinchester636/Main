-- In-app chat between the two people on a trade, scoped to that trade --
-- not a general DM system between arbitrary accounts. Anyone can message
-- on their own trade regardless of its status (pending/accepted/declined/
-- completed) -- coordinating or disputing a trade doesn't stop being
-- useful just because its status changed.
CREATE TABLE IF NOT EXISTS trade_messages (
  id TEXT PRIMARY KEY,
  trade_id TEXT NOT NULL REFERENCES trade_proposals(id) ON DELETE CASCADE,
  sender_account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_trade_messages_trade ON trade_messages(trade_id, created_at);

-- A fraud/issue report against a trade. lat/lng are captured client-side
-- ONLY at the moment someone files a report (never passively logged for
-- every ordinary trade) -- a deliberate privacy choice, see README "Trade
-- reports & chat". Nullable: the browser's geolocation permission can be
-- denied or unavailable, and a report should still go through without it.
--
-- Multiple reports per trade are allowed (no uniqueness constraint) --
-- either side can report, and the same side could report more than once
-- as a dispute develops. "Does this trade have an open report" (which
-- gates admin's access to its chat log, see worker/src/routes/reports.js)
-- is computed as EXISTS(...) over this table, not a flag on the trade.
CREATE TABLE IF NOT EXISTS trade_reports (
  id TEXT PRIMARY KEY,
  trade_id TEXT NOT NULL REFERENCES trade_proposals(id) ON DELETE CASCADE,
  reporter_account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  description TEXT,
  lat REAL,
  lng REAL,
  accuracy_meters REAL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
  created_at INTEGER NOT NULL,
  resolved_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_trade_reports_trade ON trade_reports(trade_id);
CREATE INDEX IF NOT EXISTS idx_trade_reports_status ON trade_reports(status, created_at);
