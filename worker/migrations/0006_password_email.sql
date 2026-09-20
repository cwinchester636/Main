-- Email + password auth, alongside the existing bearer token. Signup now
-- requires all three (username/email/password); the token it returns is
-- still what keeps this browser logged in (unchanged), but the password
-- now also lets the same account log in again from a different device or
-- after clearing localStorage — something the pure-token model never
-- supported (see README "Accounts & auth").
--
-- All three nullable at the column level: the existing seed accounts and
-- anything created before this migration predate the requirement and
-- simply have none of them. They keep working via their existing token;
-- they just can't use the new login form until they're recreated.
--
-- password_hash/password_salt are PBKDF2-SHA256 (worker/src/utils.js), not
-- a plain digest — a password has real guessable entropy, unlike the
-- random 256-bit session token, so it needs a slow salted KDF.
--
-- email uniqueness is a partial unique index rather than a column
-- constraint: SQLite's ALTER TABLE ADD COLUMN can't add a UNIQUE
-- constraint directly, and a plain UNIQUE index would reject every
-- pre-existing NULL-email row colliding with the next (NULL <> NULL in
-- SQL, so "WHERE email IS NOT NULL" is actually redundant here, but it
-- documents the intent explicitly rather than relying on that subtlety).
ALTER TABLE accounts ADD COLUMN email TEXT;
ALTER TABLE accounts ADD COLUMN password_hash TEXT;
ALTER TABLE accounts ADD COLUMN password_salt TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_accounts_email ON accounts(email) WHERE email IS NOT NULL;
