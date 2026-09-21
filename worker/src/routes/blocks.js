import { error, json, newId } from '../utils.js'

// Both directions, not just "did I block them" — matches.js and
// proposeTrade both need "is there any block between these two accounts
// at all", regardless of who blocked whom.
export async function isBlockedEitherWay(env, accountIdA, accountIdB) {
  const row = await env.DB.prepare(
    `SELECT 1 FROM account_blocks
     WHERE (blocker_account_id = ? AND blocked_account_id = ?)
        OR (blocker_account_id = ? AND blocked_account_id = ?)`,
  )
    .bind(accountIdA, accountIdB, accountIdB, accountIdA)
    .first()
  return !!row
}

export async function listBlocked(env, account) {
  const rows = await env.DB.prepare(
    `SELECT a.id, a.username, a.avatar FROM account_blocks ab
     JOIN accounts a ON a.id = ab.blocked_account_id
     WHERE ab.blocker_account_id = ?
     ORDER BY ab.created_at DESC`,
  )
    .bind(account.id)
    .all()

  return json({ blocked: rows.results })
}

// Toggles the caller's own block of another account. Blocking hides that
// account from each other's Matches (see matches.js — a match you can
// never trade with is misleading, same reasoning as excluding a suspended
// account) and stops either side from proposing a *new* trade to the
// other (see proposeTrade). It also auto-declines any trade either side
// already had pending with the other, in both directions — "block" means
// "we're done dealing with each other", not just "no new trades starting
// today". It deliberately does *not* touch an already-*accepted* trade
// between them; unwinding an in-progress transaction is a different,
// much bigger decision than this button is meant to make.
export async function toggleBlock(env, account, targetId) {
  if (targetId === account.id) return error('cannot block your own account', 400)

  const target = await env.DB.prepare('SELECT id FROM accounts WHERE id = ?').bind(targetId).first()
  if (!target) return error('account not found', 404)

  const existing = await env.DB.prepare(
    'SELECT id FROM account_blocks WHERE blocker_account_id = ? AND blocked_account_id = ?',
  )
    .bind(account.id, targetId)
    .first()

  if (existing) {
    await env.DB.prepare('DELETE FROM account_blocks WHERE id = ?').bind(existing.id).run()
    return json({ blocked: false })
  }

  await env.DB.batch([
    env.DB.prepare('INSERT INTO account_blocks (id, blocker_account_id, blocked_account_id, created_at) VALUES (?, ?, ?, ?)').bind(
      newId(),
      account.id,
      targetId,
      Date.now(),
    ),
    env.DB.prepare(
      `UPDATE trade_proposals SET status = 'declined'
       WHERE status = 'pending'
         AND ((from_account_id = ? AND to_account_id = ?) OR (from_account_id = ? AND to_account_id = ?))`,
    ).bind(account.id, targetId, targetId, account.id),
  ])

  return json({ blocked: true })
}
