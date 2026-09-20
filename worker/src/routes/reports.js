import { error, json, newId } from '../utils.js'

const REPORT_REASONS = ['not_received', 'not_as_described', 'no_show', 'payment_dispute', 'other']

function parseCoordinate(value, min, max) {
  if (value === undefined || value === null) return null
  const n = Number(value)
  if (!Number.isFinite(n) || n < min || n > max) return undefined
  return n
}

function serializeReport(row) {
  return {
    id: row.id,
    tradeId: row.trade_id,
    reporterAccountId: row.reporter_account_id,
    reason: row.reason,
    description: row.description ?? null,
    lat: row.lat,
    lng: row.lng,
    accuracyMeters: row.accuracy_meters,
    status: row.status,
    createdAt: row.created_at,
    resolvedAt: row.resolved_at,
  }
}

// Whether a trade currently has at least one open report — gates admin's
// access to that trade's chat log (see getMessages in messages.js): admin
// can't casually browse a normal trade's private conversation, only one
// that's actually been reported. Computed live rather than a flag on the
// trade so resolving every report on a trade automatically closes that
// access again.
export async function hasOpenReport(env, tradeId) {
  const row = await env.DB.prepare(
    `SELECT 1 FROM trade_reports WHERE trade_id = ? AND status = 'open' LIMIT 1`,
  )
    .bind(tradeId)
    .first()
  return !!row
}

// Either participant can report their own trade — never a third party,
// and never about a trade they're not part of. GPS is entirely optional:
// the client only ever asks for it right when this form is submitted
// (never ambient), and a denied/unavailable location still lets the
// report through with lat/lng left null.
export async function createReport(request, env, account, tradeId) {
  const trade = await env.DB.prepare('SELECT * FROM trade_proposals WHERE id = ?').bind(tradeId).first()
  if (!trade) return error('trade not found', 404)
  if (trade.from_account_id !== account.id && trade.to_account_id !== account.id) {
    return error('not your trade', 403)
  }

  const body = await request.json().catch(() => null)
  if (!body || !REPORT_REASONS.includes(body.reason)) {
    return error(`reason must be one of ${REPORT_REASONS.join(', ')}`)
  }
  const description = typeof body.description === 'string' ? body.description.trim().slice(0, 2000) : null

  const lat = parseCoordinate(body.lat, -90, 90)
  const lng = parseCoordinate(body.lng, -180, 180)
  if (lat === undefined || lng === undefined) return error('lat/lng out of range')
  // Both or neither — a lone coordinate isn't a location.
  if ((lat === null) !== (lng === null)) return error('lat and lng must be sent together')

  const accuracy = typeof body.accuracyMeters === 'number' && Number.isFinite(body.accuracyMeters)
    ? body.accuracyMeters
    : null

  const id = newId()
  const createdAt = Date.now()
  await env.DB.prepare(
    `INSERT INTO trade_reports (id, trade_id, reporter_account_id, reason, description, lat, lng, accuracy_meters, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'open', ?)`,
  )
    .bind(id, tradeId, account.id, body.reason, description, lat, lng, accuracy, createdAt)
    .run()

  return json({ report: serializeReport({
    id, trade_id: tradeId, reporter_account_id: account.id, reason: body.reason, description,
    lat, lng, accuracy_meters: accuracy, status: 'open', created_at: createdAt, resolved_at: null,
  }) }, 201)
}

// Every report, for the admin queue this exists for — newest first, with
// enough about the trade and its reporter to triage without a second
// lookup. Full trade detail (cards, cash, photos) is still fetched from
// the existing GET /api/admin/trades; this is the report inbox, not a
// duplicate of that view.
export async function adminListReports(env) {
  const rows = await env.DB.prepare(
    `SELECT tr.*,
            ra.username AS reporter_username, ra.email AS reporter_email,
            tp.from_account_id, tp.to_account_id,
            fa.username AS from_username, ta.username AS to_username
     FROM trade_reports tr
     JOIN accounts ra ON ra.id = tr.reporter_account_id
     JOIN trade_proposals tp ON tp.id = tr.trade_id
     JOIN accounts fa ON fa.id = tp.from_account_id
     JOIN accounts ta ON ta.id = tp.to_account_id
     ORDER BY tr.status ASC, tr.created_at DESC
     LIMIT 500`,
  ).all()

  return json({
    reports: rows.results.map((row) => ({
      ...serializeReport(row),
      reporter: { id: row.reporter_account_id, username: row.reporter_username, email: row.reporter_email },
      trade: {
        fromAccountId: row.from_account_id,
        toAccountId: row.to_account_id,
        fromUsername: row.from_username,
        toUsername: row.to_username,
      },
    })),
  })
}

export async function adminResolveReport(env, reportId) {
  const row = await env.DB.prepare('SELECT id, status FROM trade_reports WHERE id = ?').bind(reportId).first()
  if (!row) return error('report not found', 404)
  if (row.status === 'resolved') return json({ resolved: reportId })

  await env.DB.prepare('UPDATE trade_reports SET status = ?, resolved_at = ? WHERE id = ?')
    .bind('resolved', Date.now(), reportId)
    .run()

  return json({ resolved: reportId })
}
