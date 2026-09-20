import { error, json } from '../utils.js'
import { isAdminUsername } from '../admin.js'

export function requireAdmin(account, env) {
  return isAdminUsername(account.username, env) ? null : error('admin access required', 403)
}

// Oldest first — matches the "find old/stale accounts to clean up" use
// case this exists for. Never selects token_hash/password_hash/
// password_salt; an admin can manage accounts without ever seeing
// anything that could authenticate as them.
export async function listUsers(env) {
  const rows = await env.DB.prepare(
    'SELECT id, username, email, avatar, zip, created_at FROM accounts ORDER BY created_at ASC LIMIT 500',
  ).all()

  return json({
    users: rows.results.map((row) => ({
      id: row.id,
      username: row.username,
      email: row.email ?? null,
      avatar: row.avatar,
      zip: row.zip,
      createdAt: row.created_at,
    })),
  })
}

export async function deleteUser(env, account, targetId) {
  if (targetId === account.id) {
    return error('cannot delete your own account from the admin panel — log out instead', 400)
  }

  const target = await env.DB.prepare('SELECT id FROM accounts WHERE id = ?').bind(targetId).first()
  if (!target) return error('user not found', 404)

  // Explicit cascade rather than relying on collection_items/trade_proposals'
  // ON DELETE CASCADE foreign keys actually being enforced — SQLite (and by
  // extension D1) only enforces FK constraints when foreign_keys is turned
  // on for the connection, which nothing in this codebase does, so this
  // can't assume it's active.
  await env.DB.batch([
    env.DB.prepare('DELETE FROM collection_items WHERE account_id = ?').bind(targetId),
    env.DB.prepare('DELETE FROM trade_proposals WHERE from_account_id = ? OR to_account_id = ?').bind(
      targetId,
      targetId,
    ),
    env.DB.prepare('DELETE FROM accounts WHERE id = ?').bind(targetId),
  ])

  return json({ deleted: targetId })
}
