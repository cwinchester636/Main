-- Adds mutual completion tracking to trade_proposals. A trade is only
-- considered "completed" once BOTH sides confirm it happened — one person
-- tapping "mark as traded" isn't verification, it's a claim. The `status`
-- column's existing CHECK constraint (pending/accepted/declined) is left
-- untouched; "completed" is derived in the API from these two timestamps
-- both being set on an accepted trade, rather than added as a 4th status
-- value, since SQLite can't alter a CHECK constraint without recreating
-- the table.
ALTER TABLE trade_proposals ADD COLUMN from_confirmed_at INTEGER;
ALTER TABLE trade_proposals ADD COLUMN to_confirmed_at INTEGER;
