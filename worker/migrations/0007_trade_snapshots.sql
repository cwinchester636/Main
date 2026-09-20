-- Snapshots which cards each side was offering at the moment a trade was
-- proposed. trade_proposals itself only ever linked two accounts (see
-- 0001) -- the cards shown in the UI came from live haves/wants matching,
-- recomputed fresh every time. That's fine for browsing matches, but it
-- means a trade's card details would silently change (or vanish) if either
-- side edited or deleted the underlying collection_items afterward -- no
-- good for reviewing what a finalized trade actually was.
--
-- Computed server-side from each account's collection at propose time
-- (mirrors the matching logic in matches.js) rather than trusting
-- client-supplied card data, since proposing a trade is a security-
-- sensitive write. Denormalized like collection_items, and deliberately
-- NOT a foreign key back to collection_items -- it's an independent copy,
-- so it survives the source item being edited or removed.
CREATE TABLE IF NOT EXISTS trade_snapshot_items (
  id TEXT PRIMARY KEY,
  trade_id TEXT NOT NULL REFERENCES trade_proposals(id) ON DELETE CASCADE,
  owner_account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  game TEXT NOT NULL,
  name TEXT NOT NULL,
  set_name TEXT,
  number TEXT,
  rarity TEXT,
  image TEXT,
  condition TEXT,
  grade INTEGER,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_trade_snapshot_trade ON trade_snapshot_items(trade_id);
