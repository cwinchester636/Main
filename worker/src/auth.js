import { hashToken } from './utils.js'

export async function authenticate(request, env) {
  const header = request.headers.get('Authorization') || ''
  const match = header.match(/^Bearer (.+)$/)
  if (!match) return null

  const tokenHash = await hashToken(match[1])
  const row = await env.DB.prepare('SELECT * FROM accounts WHERE token_hash = ?')
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
  }
}
