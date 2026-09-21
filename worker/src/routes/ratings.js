import { error, json, newId } from '../utils.js'
import { deriveStatus } from './trades.js'

// Batched, not one query per account — a Matches or admin list can show
// dozens of accounts at once. Returns a Map keyed by account id; an id
// with no ratings simply isn't in the map, so callers default to "no
// ratings yet" themselves rather than this returning a fake zero entry.
export async function getRatingSummaries(env, accountIds) {
  const summaries = new Map()
  const ids = [...new Set(accountIds)].filter(Boolean)
  if (ids.length === 0) return summaries

  const placeholders = ids.map(() => '?').join(', ')
  const rows = await env.DB.prepare(
    `SELECT rated_account_id, COUNT(*) AS total, SUM(thumbs_up) AS positive
     FROM trade_ratings
     WHERE rated_account_id IN (${placeholders})
     GROUP BY rated_account_id`,
  )
    .bind(...ids)
    .all()

  for (const row of rows.results) {
    summaries.set(row.rated_account_id, {
      positivePct: Math.round((row.positive / row.total) * 100),
      count: row.total,
    })
  }
  return summaries
}

export async function getRatingSummary(env, accountId) {
  const summaries = await getRatingSummaries(env, [accountId])
  return summaries.get(accountId) ?? { positivePct: null, count: 0 }
}

// Either participant can rate the other, but only once the trade has
// actually completed — a rating is a verdict on how the trade went, not a
// prediction. rated_account_id is derived from the trade itself (whichever
// side isn't the caller), never taken from the request — nobody can rate
// an account they didn't actually trade with.
export async function rateTrade(request, env, account, tradeId) {
  const trade = await env.DB.prepare('SELECT * FROM trade_proposals WHERE id = ?').bind(tradeId).first()
  if (!trade) return error('trade not found', 404)

  const isFrom = trade.from_account_id === account.id
  const isParticipant = isFrom || trade.to_account_id === account.id
  if (!isParticipant) return error('not your trade', 403)
  if (deriveStatus(trade) !== 'completed') return error('only a completed trade can be rated')

  const body = await request.json().catch(() => null)
  if (!body || typeof body.thumbsUp !== 'boolean') return error('thumbsUp (true/false) is required')
  const comment = typeof body.comment === 'string' ? body.comment.trim().slice(0, 1000) || null : null
  if (!body.thumbsUp && !comment) {
    return error('a comment explaining what went wrong is required for a negative rating')
  }

  const ratedAccountId = isFrom ? trade.to_account_id : trade.from_account_id
  const id = newId()
  const createdAt = Date.now()

  await env.DB.prepare(
    `INSERT INTO trade_ratings (id, trade_id, rater_account_id, rated_account_id, thumbs_up, comment, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(trade_id, rater_account_id)
     DO UPDATE SET thumbs_up = excluded.thumbs_up, comment = excluded.comment, created_at = excluded.created_at`,
  )
    .bind(id, tradeId, account.id, ratedAccountId, body.thumbsUp ? 1 : 0, comment, createdAt)
    .run()

  return json({ rating: { tradeId, ratedAccountId, thumbsUp: body.thumbsUp, comment, createdAt } })
}
