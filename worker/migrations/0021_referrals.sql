-- Referral rewards: free Pro time for both sides when a referred account
-- completes its first positively-rated trade. See README "Referrals".
-- referred_by_account_id: set once at signup, never changed afterward.
-- signup_ip: fraud signal only (see worker/src/routes/accounts.js) --
-- flags/blocks the same device claiming a referral credit for itself,
-- never used for anything else.
-- referral_reward_granted_at: nullable timestamp, same convention as
-- suspended_at/pro_until elsewhere in this schema -- null means this
-- account's one-time referred-signup reward hasn't fired yet.
-- referral_rewards_granted: how many times THIS account has been paid out
-- as a referrer -- a plain counter, capped in application code
-- (REFERRAL_REWARD_CAP) so one person can't farm unlimited free Pro time
-- even from real, distinct referred accounts.
ALTER TABLE accounts ADD COLUMN referred_by_account_id TEXT REFERENCES accounts(id) ON DELETE SET NULL;
ALTER TABLE accounts ADD COLUMN signup_ip TEXT;
ALTER TABLE accounts ADD COLUMN referral_reward_granted_at INTEGER;
ALTER TABLE accounts ADD COLUMN referral_rewards_granted INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_accounts_referred_by ON accounts(referred_by_account_id);
