// Admin-ness is a fixed allowlist of usernames, not a database flag — set
// once via the ADMIN_USERNAMES var in wrangler.toml (comma-separated) and
// deployed through the normal CI pipeline. Deliberately not self-service
// or DB-driven: no account (including an admin's own) can grant itself or
// anyone else admin access by writing to a row, since nothing ever reads
// admin status from the accounts table.
//
// Compared case-insensitively — usernames are otherwise a case-sensitive
// identity everywhere else in this app (signup uniqueness, login lookup),
// but that's the wrong default here: this list is hand-typed into a config
// file, not looked up, so a casing slip (e.g. "cwinchester636" here vs.
// "Cwinchester636" as actually signed up) would silently deny access
// instead of erroring — exactly the failure mode this guards against.
export function isAdminUsername(username, env) {
  const admins = (env.ADMIN_USERNAMES || '')
    .split(',')
    .map((u) => u.trim().toLowerCase())
    .filter(Boolean)
  return admins.includes(username.toLowerCase())
}
