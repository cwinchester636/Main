-- Extends trade_proposals.status's CHECK constraint to allow 'cancelled'
-- (added for the proposer-cancels-their-own-pending-trade feature; see
-- respondToTrade's 'cancel' action in worker/src/routes/trades.js). SQLite
-- can't ALTER a CHECK constraint in place, so this recreates the table with
-- the wider constraint and copies existing rows across -- the standard
-- SQLite migration pattern. Foreign keys aren't enforced by D1 (see the
-- explicit-cascade-delete notes in worker/src/routes/admin.js), so the
-- rebuild doesn't disturb trade_snapshots/trade_messages/trade_reports/
-- ratings rows that reference trade_proposals(id).
CREATE TABLE trade_proposals_new (
  id TEXT PRIMARY KEY,
  from_account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  to_account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled')),
  created_at INTEGER NOT NULL,
  from_confirmed_at INTEGER,
  to_confirmed_at INTEGER,
  from_cash REAL NOT NULL DEFAULT 0 CHECK (from_cash >= 0),
  to_cash REAL NOT NULL DEFAULT 0 CHECK (to_cash >= 0)
);

INSERT INTO trade_proposals_new
  SELECT id, from_account_id, to_account_id, status, created_at, from_confirmed_at, to_confirmed_at, from_cash, to_cash
  FROM trade_proposals;

DROP TABLE trade_proposals;
ALTER TABLE trade_proposals_new RENAME TO trade_proposals;

CREATE INDEX IF NOT EXISTS idx_trades_to ON trade_proposals(to_account_id, status);
CREATE INDEX IF NOT EXISTS idx_trades_from ON trade_proposals(from_account_id, status);
