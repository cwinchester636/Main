import { hashToken, isPro } from './utils.js'

// Shared by authenticate() below and the logout route (worker/src/routes/
// accounts.js) -- logout needs the exact same hash authenticate() would
// compute, to delete the one sessions row for *this* request's token
// without touching any of the account's other active sessions.
export async function getTokenHash(request) {
  const header = request.headers.get('Authorization') || ''
  const match = header.match(/^Bearer (.+)$/)
  if (!match) return null
  return hashToken(match[1])
}

// A row in `sessions` (not accounts.token_hash, which is no longer used
// for auth -- see migrations/0022_sessions.sql) is what makes a login
// valid. Multiple rows for the same account_id are expected and normal --
// one per device/browser that's ever logged in and hasn't logged out.
export async function authenticate(request, env) {
  const tokenHash = await getTokenHash(request)
  if (!tokenHash) return null

  const row = await env.DB.prepare(
    `SELECT accounts.* FROM sessions
     JOIN accounts ON accounts.id = sessions.account_id
     WHERE sessions.token_hash = ?`,
  )
    .bind(tokenHash)
    .first()
  return row ?? null
}

export function publicAccount(row) {
  return {
    id: row.id,
    username: row.username,
    email: row.email ?? null,
    avatar: row.avatar,
    zip: row.zip,
    radiusMiles: row.radius_miles ?? null,
    isSuspended: !!row.suspended_at,
    isPro: isPro(row),
    referralRewardsGranted: row.referral_rewards_granted ?? 0,
  }
}
