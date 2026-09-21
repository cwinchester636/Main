import { error, json, newId, requireNotSuspended } from '../utils.js'
import { isAdminUsername } from '../admin.js'
import { hasOpenReport } from './reports.js'
import { notifyAccount } from '../push.js'

const NOTIFICATION_PREVIEW_LENGTH = 120

const MAX_MESSAGE_LENGTH = 2000

function serializeMessage(row) {
  return {
    id: row.id,
    senderAccountId: row.sender_account_id,
    senderUsername: row.sender_username,
    body: row.body,
    createdAt: row.created_at,
  }
}

async function loadTradeForAccess(env, account, tradeId) {
  const trade = await env.DB.prepare('SELECT * FROM trade_proposals WHERE id = ?').bind(tradeId).first()
  if (!trade) return { error: error('trade not found', 404) }

  const isParticipant = trade.from_account_id === account.id || trade.to_account_id === account.id
  if (isParticipant) return { trade }

  // Not a participant — the only other way in is admin reviewing a trade
  // that's actually been reported. Anyone else, participant or not, gets
  // the same 403 a stranger would.
  if (isAdminUsername(account.username, env) && (await hasOpenReport(env, tradeId))) {
    return { trade }
  }
  return { error: error('not authorized to view this trade', 403) }
}

export async function getMessages(env, account, tradeId) {
  const { trade, error: err } = await loadTradeForAccess(env, account, tradeId)
  if (err) return err

  const rows = await env.DB.prepare(
    `SELECT tm.*, a.username AS sender_username
     FROM trade_messages tm
     JOIN accounts a ON a.id = tm.sender_account_id
     WHERE tm.trade_id = ?
     ORDER BY tm.created_at ASC`,
  )
    .bind(trade.id)
    .all()

  return json({ messages: rows.results.map(serializeMessage) })
}

// Only the two participants can send — an admin reviewing a reported
// trade's chat log can read it, never post into it.
export async function sendMessage(request, env, account, tradeId, ctx) {
  const suspended = requireNotSuspended(account)
  if (suspended) return suspended

  const trade = await env.DB.prepare('SELECT * FROM trade_proposals WHERE id = ?').bind(tradeId).first()
  if (!trade) return error('trade not found', 404)
  if (trade.from_account_id !== account.id && trade.to_account_id !== account.id) {
    return error('not your trade', 403)
  }

  const body = await request.json().catch(() => null)
  const text = typeof body?.body === 'string' ? body.body.trim() : ''
  if (!text) return error('message body is required')
  if (text.length > MAX_MESSAGE_LENGTH) return error(`message must be ${MAX_MESSAGE_LENGTH} characters or fewer`)

  const id = newId()
  const createdAt = Date.now()
  await env.DB.prepare(
    `INSERT INTO trade_messages (id, trade_id, sender_account_id, body, created_at) VALUES (?, ?, ?, ?, ?)`,
  )
    .bind(id, tradeId, account.id, text, createdAt)
    .run()

  const recipientId = trade.from_account_id === account.id ? trade.to_account_id : trade.from_account_id
  ctx?.waitUntil(
    notifyAccount(env, recipientId, {
      title: `New message from ${account.username}`,
      body: text.length > NOTIFICATION_PREVIEW_LENGTH ? `${text.slice(0, NOTIFICATION_PREVIEW_LENGTH)}…` : text,
      tag: `trade-${tradeId}`,
    }),
  )

  return json(
    { message: { id, senderAccountId: account.id, senderUsername: account.username, body: text, createdAt } },
    201,
  )
}
