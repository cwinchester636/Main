-- Preserves the original live-search card id (e.g. "live-pkmn-xyz123") on
-- each collection item, separately from its own DB row id. The row id has
-- to stay stable and internal (it's what remove-item deletes by); this is
-- purely so a live market price can be looked back up later by the exact
-- printing the card actually is. Null for cards added from the curated
-- fallback catalog, which aren't tied to a real printing.
ALTER TABLE collection_items ADD COLUMN source_id TEXT;
