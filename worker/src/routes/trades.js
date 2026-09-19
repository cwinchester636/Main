import { error, json, newId } from '../utils.js'

export async function proposeTrade(request, env, account) {
  const body = await request.json().catch(() => null)
  if (!body || typeof body.toAccountId !== 'string') return error('toAccountId is required')
  if (body.toAccountId === account.id) return error('cannot propose a trade to yourself')

  const target = await env.DB.prepare('SELECT id FROM accounts WHERE id = ?').bind(body.toAccountId).first()
  if (!target) return error('account not found', 404)

  const existing = await env.DB.prepare(
    `SELECT * FROM trade_proposals
     WHERE from_account_id = ? AND to_account_id = ? AND status = 'pending'`,
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
    const entry = {
      id: row.id,
      status: row.status,
      createdAt: row.created_at,
      counterparty:
        row.from_account_id === account.id
          ? { id: row.to_account_id, username: row.to_username, avatar: row.to_avatar }
          : { id: row.from_account_id, username: row.from_username, avatar: row.from_avatar },
    }
    if (row.from_account_id === account.id) sent.push(entry)
    else received.push(entry)
  }

  return json({ sent, received })
}
