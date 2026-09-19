import { error, json, newId } from '../utils.js'

// "completed" isn't a stored status value — it's derived from both
// confirmation timestamps being set on an accepted trade. See
// migrations/0002_trade_confirmations.sql for why.
function deriveStatus(row) {
  if (row.status === 'accepted' && row.from_confirmed_at && row.to_confirmed_at) return 'completed'
  return row.status
}

function completedAt(row) {
  if (!row.from_confirmed_at || !row.to_confirmed_at) return null
  return Math.max(row.from_confirmed_at, row.to_confirmed_at)
}

export async function proposeTrade(request, env, account) {
  const body = await request.json().catch(() => null)
  if (!body || typeof body.toAccountId !== 'string') return error('toAccountId is required')
  if (body.toAccountId === account.id) return error('cannot propose a trade to yourself')

  const target = await env.DB.prepare('SELECT id FROM accounts WHERE id = ?').bind(body.toAccountId).first()
  if (!target) return error('account not found', 404)

  const existing = await env.DB.prepare(
    `SELECT * FROM trade_proposals
     WHERE from_account_id = ? AND to_account_id = ? AND status IN ('pending', 'accepted')`,
  )
    .bind(account.id, body.toAccountId)
    .first()
  if (existing) return json({ proposal: existing }, 200)

  const id = newId()
  const createdAt = Date.now()
  await env.DB.prepare(
    `INSERT INTO trade_proposals (id, from_account_id, to_account_id, status, created_at)
     VALUES (?, ?, ?, 'pending', ?)`,
  )
    .bind(id, account.id, body.toAccountId, createdAt)
    .run()

  return json({ proposal: { id, from_account_id: account.id, to_account_id: body.toAccountId, status: 'pending', created_at: createdAt } }, 201)
}

export async function getTrades(env, account) {
  const rows = await env.DB.prepare(
    `SELECT tp.*, fa.username AS from_username, fa.avatar AS from_avatar,
            ta.username AS to_username, ta.avatar AS to_avatar
     FROM trade_proposals tp
     JOIN accounts fa ON fa.id = tp.from_account_id
     JOIN accounts ta ON ta.id = tp.to_account_id
     WHERE tp.from_account_id = ? OR tp.to_account_id = ?
     ORDER BY tp.created_at DESC`,
  )
    .bind(account.id, account.id)
    .all()

  const sent = []
  const received = []
  for (const row of rows.results) {
    const isFrom = row.from_account_id === account.id
    const myConfirmedAt = isFrom ? row.from_confirmed_at : row.to_confirmed_at
    const theirConfirmedAt = isFrom ? row.to_confirmed_at : row.from_confirmed_at
    const entry = {
      id: row.id,
      status: deriveStatus(row),
      createdAt: row.created_at,
      completedAt: completedAt(row),
      confirmedByMe: !!myConfirmedAt,
      confirmedByThem: !!theirConfirmedAt,
      counterparty: isFrom
        ? { id: row.to_account_id, username: row.to_username, avatar: row.to_avatar }
        : { id: row.from_account_id, username: row.from_username, avatar: row.from_avatar },
    }
    if (isFrom) sent.push(entry)
    else received.push(entry)
  }

  return json({ sent, received })
}

export async function respondToTrade(request, env, account, tradeId) {
  const body = await request.json().catch(() => null)
  if (!body || (body.action !== 'accept' && body.action !== 'decline')) {
    return error('action must be "accept" or "decline"')
  }

  const row = await env.DB.prepare('SELECT * FROM trade_proposals WHERE id = ?').bind(tradeId).first()
  if (!row) return error('trade not found', 404)
  if (row.to_account_id !== account.id) return error('only the recipient can respond to this trade', 403)
  if (row.status !== 'pending') return error(`trade is already ${row.status}`)

  const status = body.action === 'accept' ? 'accepted' : 'declined'
  await env.DB.prepare('UPDATE trade_proposals SET status = ? WHERE id = ?')
    .bind(status, tradeId)
    .run()

  return json({ proposal: { ...row, status } })
}

export async function confirmTrade(env, account, tradeId) {
  const row = await env.DB.prepare('SELECT * FROM trade_proposals WHERE id = ?').bind(tradeId).first()
  if (!row) return error('trade not found', 404)
  if (row.from_account_id !== account.id && row.to_account_id !== account.id) {
    return error('not your trade', 403)
  }
  if (row.status !== 'accepted') return error('only an accepted trade can be confirmed complete')

  const isFrom = row.from_account_id === account.id
  const column = isFrom ? 'from_confirmed_at' : 'to_confirmed_at'
  if (row[column]) {
    // Already confirmed by this side — idempotent no-op, just return current state.
    return json({ proposal: { ...row, status: deriveStatus(row), completedAt: completedAt(row) } })
  }

  const confirmedAt = Date.now()
  await env.DB.prepare(`UPDATE trade_proposals SET ${column} = ? WHERE id = ?`)
    .bind(confirmedAt, tradeId)
    .run()

  const updated = { ...row, [column]: confirmedAt }
  return json({ proposal: { ...updated, status: deriveStatus(updated), completedAt: completedAt(updated) } })
}
