-- Optional cash either side adds on top of the cards themselves -- e.g.
-- "my Charizard + $10 for your Blastoise". This is a NOTED amount only --
-- nothing in this app moves real money between accounts, there's no
-- payment processor involved, and the two people are expected to settle
-- it themselves (cash, Venmo, whatever), same as they already coordinate
-- shipping a card. See README "Trades & verification".
--
-- Each side sets its own amount at its own step, matching the existing
-- propose/accept flow rather than adding a new negotiation step:
-- from_cash at propose time, to_cash at accept time. So a trade's full
-- cash picture is only complete once accepted -- to_cash is meaningless
-- (stays 0) on a still-pending or declined trade.
--
-- REAL (float dollars), matching how every card's live price is already
-- stored/compared elsewhere in this app (see resolveCardPrice) --
-- consistency with the existing convention, not a new cents-based scheme
-- for just this one column.
ALTER TABLE trade_proposals ADD COLUMN from_cash REAL NOT NULL DEFAULT 0 CHECK (from_cash >= 0);
ALTER TABLE trade_proposals ADD COLUMN to_cash REAL NOT NULL DEFAULT 0 CHECK (to_cash >= 0);
