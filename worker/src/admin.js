// Admin-ness is a fixed allowlist of usernames, not a database flag — set
// once via the ADMIN_USERNAMES var in wrangler.toml (comma-separated) and
// deployed through the normal CI pipeline. Deliberately not self-service
// or DB-driven: no account (including an admin's own) can grant itself or
// anyone else admin access by writing to a row, since nothing ever reads
// admin status from the accounts table.
export function isAdminUsername(username, env) {
  const admins = (env.ADMIN_USERNAMES || '')
    .split(',')
    .map((u) => u.trim())
    .filter(Boolean)
  return admins.includes(username)
}
