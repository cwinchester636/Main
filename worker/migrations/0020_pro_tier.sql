-- SwapDeck Pro: a paid tier gating collection size, search radius, and push
-- notifications, plus a cosmetic badge. See README "Pro tier / paywall".
-- Nullable timestamp, same convention as suspended_at elsewhere in this
-- schema: null means never/no-longer Pro, a future timestamp means active
-- Pro until then. No real billing (StoreKit/Play Billing) is wired up yet
-- -- this column is set by the admin-grant endpoint as a stand-in until it is.
ALTER TABLE accounts ADD COLUMN pro_until INTEGER;
