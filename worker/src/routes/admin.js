import { error, json, servePhoto, isPro } from '../utils.js'
import { isAdminUsername } from '../admin.js'
import { deriveStatus, completedAt } from './trades.js'
import { getRatingSummaries } from './ratings.js'

export function requireAdmin(account, env) {
  return isAdminUsername(account.username, env) ? null : error('admin access required', 403)
}

function serializeSnapshotCard(row) {
  return {
    id: row.id,
    name: row.name,
    game: row.game,
    set: row.set_name,
    number: row.number,
    rarity: row.rarity,
    image: row.image,
    condition: row.condition ?? null,
    grade: row.grade ?? null,
    hasPhoto: !!row.photo_key,
  }
}

// Oldest first — matches the "find old/stale accounts to clean up" use
// case this exists for. Never selects token_hash/password_hash/
// password_salt; an admin can manage accounts without ever seeing
// anything that could authenticate as them.
export async function listUsers(env) {
  const rows = await env.DB.prepare(
    'SELECT id, username, email, avatar, zip, created_at, suspended_at, pro_until FROM accounts ORDER BY created_at ASC LIMIT 500',
  ).all()

  const ratingSummaries = await getRatingSummaries(env, rows.results.map((row) => row.id))

  return json({
    users: rows.results.map((row) => ({
      id: row.id,
      username: row.username,
      email: row.email ?? null,
      avatar: row.avatar,
      zip: row.zip,
      createdAt: row.created_at,
      isSuspended: !!row.suspended_at,
      suspendedAt: row.suspended_at,
      isPro: isPro(row),
      proUntil: row.pro_until,
      rating: ratingSummaries.get(row.id) ?? { positivePct: null, count: 0 },
    })),
  })
}

// Deliberately admin-only and manual, never automatic off a rating/report
// threshold — a coordinated pile-on of false negative ratings or reports
// shouldn't be able to suspend an innocent account with no human review,
// same reasoning as fraud reports already requiring admin judgment before
// anything happens. Blocks trading and messaging (requireNotSuspended,
// checked in proposeTrade/respondToTrade/confirmTrade/sendMessage) but
// never login or collection management — see README "Ratings &
// suspension".
export async function setUserSuspended(request, env, account, targetId) {
  if (targetId === account.id) return error('cannot suspend your own account', 400)

  const body = await request.json().catch(() => null)
  if (!body || typeof body.suspended !== 'boolean') return error('suspended (true/false) is required')

  const target = await env.DB.prepare('SELECT id FROM accounts WHERE id = ?').bind(targetId).first()
  if (!target) return error('user not found', 404)

  await env.DB.prepare('UPDATE accounts SET suspended_at = ? WHERE id = ?')
    .bind(body.suspended ? Date.now() : null, targetId)
    .run()

  return json({ id: targetId, isSuspended: body.suspended })
}

// Real billing (StoreKit / Google Play Billing, via a Capacitor plugin like
// RevenueCat) isn't wired up yet — see README "Pro tier / paywall" and
// "Mobile app (Capacitor)". This is the stand-in for "how does someone
// become Pro" until it is: an admin grants a year at a time (not forever —
// pro_until is a real expiring timestamp even here, so this can't be
// mistaken for a permanent flag once real subscriptions exist alongside
// it) or revokes it outright. Doubles as the only way to exercise the Pro
// gates end-to-end without a real purchase.
export async function setUserPro(request, env, account, targetId) {
  const body = await request.json().catch(() => null)
  if (!body || typeof body.pro !== 'boolean') return error('pro (true/false) is required')

  const target = await env.DB.prepare('SELECT id FROM accounts WHERE id = ?').bind(targetId).first()
  if (!target) return error('user not found', 404)

  const proUntil = body.pro ? Date.now() + 365 * 24 * 60 * 60 * 1000 : null
  await env.DB.prepare('UPDATE accounts SET pro_until = ? WHERE id = ?').bind(proUntil, targetId).run()

  return json({ id: targetId, isPro: body.pro, proUntil })
}

export async function deleteUser(env, account, targetId) {
  if (targetId === account.id) {
    return error('cannot delete your own account from the admin panel — log out instead', 400)
  }

  const target = await env.DB.prepare('SELECT id FROM accounts WHERE id = ?').bind(targetId).first()
  if (!target) return error('user not found', 404)

  // Explicit cascade rather than relying on collection_items/trade_proposals/
  // trade_snapshot_items/trade_messages/trade_reports/trade_ratings/
  // push_subscriptions/known_matches/local_events/notifications/event_rsvps/
  // account_blocks' ON DELETE CASCADE foreign keys actually being enforced
  // — SQLite (and by extension D1) only enforces FK constraints when
  // foreign_keys is turned on for the connection, which nothing in this
  // codebase does, so this can't assume it's active. Everything
  // trade_id-scoped goes first since it references trade_proposals rows
  // this same batch deletes right after — scoping by "any trade this
  // account was ever a party to" also correctly covers every
  // message/report/rating they were involved in, since a rating's rater
  // and rated account are always the trade's two participants, same as
  // messages/reports only ever happening on your own trade. event_rsvps
  // is deleted two ways for the same reason: this account's own RSVPs to
  // anyone's events, and (before local_events itself is deleted, since D1
  // batches run sequentially in one transaction) every RSVP anyone else
  // left on an event *this* account created — otherwise those would be
  // orphaned the moment the event row under them disappears.
  // account_blocks is scoped by either column since a block is
  // directional — this account might be the blocker or the blocked.
  await env.DB.batch([
    env.DB.prepare('DELETE FROM collection_items WHERE account_id = ?').bind(targetId),
    env.DB.prepare('DELETE FROM push_subscriptions WHERE account_id = ?').bind(targetId),
    env.DB.prepare('DELETE FROM known_matches WHERE account_id_a = ? OR account_id_b = ?').bind(targetId, targetId),
    env.DB.prepare('DELETE FROM account_blocks WHERE blocker_account_id = ? OR blocked_account_id = ?').bind(
      targetId,
      targetId,
    ),
    env.DB.prepare('DELETE FROM event_rsvps WHERE account_id = ?').bind(targetId),
    env.DB.prepare(
      `DELETE FROM event_rsvps WHERE event_id IN
         (SELECT id FROM local_events WHERE created_by_account_id = ?)`,
    ).bind(targetId),
    env.DB.prepare('DELETE FROM local_events WHERE created_by_account_id = ?').bind(targetId),
    env.DB.prepare('DELETE FROM notifications WHERE account_id = ?').bind(targetId),
    env.DB.prepare(
      `DELETE FROM trade_snapshot_items WHERE trade_id IN
         (SELECT id FROM trade_proposals WHERE from_account_id = ? OR to_account_id = ?)`,
    ).bind(targetId, targetId),
    env.DB.prepare(
      `DELETE FROM trade_messages WHERE trade_id IN
         (SELECT id FROM trade_proposals WHERE from_account_id = ? OR to_account_id = ?)`,
    ).bind(targetId, targetId),
    env.DB.prepare(
      `DELETE FROM trade_reports WHERE trade_id IN
         (SELECT id FROM trade_proposals WHERE from_account_id = ? OR to_account_id = ?)`,
    ).bind(targetId, targetId),
    env.DB.prepare(
      `DELETE FROM trade_ratings WHERE trade_id IN
         (SELECT id FROM trade_proposals WHERE from_account_id = ? OR to_account_id = ?)`,
    ).bind(targetId, targetId),
    env.DB.prepare('DELETE FROM trade_proposals WHERE from_account_id = ? OR to_account_id = ?').bind(
      targetId,
      targetId,
    ),
    env.DB.prepare('DELETE FROM accounts WHERE id = ?').bind(targetId),
  ])

  return json({ deleted: targetId })
}

// Every trade any account has ever proposed, responded to, or confirmed —
// for looking into a dispute on a user's behalf without needing their
// login. Includes both parties' contact info and the card snapshot taken
// at propose time (see migrations/0007_trade_snapshots.sql) so the record
// reflects what was actually offered, even if the cards involved have
// since been edited or removed from either collection.
export async function listTrades(env) {
  const trades = await env.DB.prepare(
    `SELECT tp.*, fa.username AS from_username, fa.email AS from_email, fa.avatar AS from_avatar, fa.suspended_at AS from_suspended_at, fa.pro_until AS from_pro_until,
            ta.username AS to_username, ta.email AS to_email, ta.avatar AS to_avatar, ta.suspended_at AS to_suspended_at, ta.pro_until AS to_pro_until
     FROM trade_proposals tp
     JOIN accounts fa ON fa.id = tp.from_account_id
     JOIN accounts ta ON ta.id = tp.to_account_id
     ORDER BY tp.created_at DESC
     LIMIT 500`,
  ).all()

  if (trades.results.length === 0) return json({ trades: [] })

  const tradeIds = trades.results.map((row) => row.id)
  const accountIds = trades.results.flatMap((row) => [row.from_account_id, row.to_account_id])
  const ratingSummaries = await getRatingSummaries(env, accountIds)
  const placeholders = tradeIds.map(() => '?').join(', ')
  const snapshots = await env.DB.prepare(
    `SELECT * FROM trade_snapshot_items WHERE trade_id IN (${placeholders})`,
  )
    .bind(...tradeIds)
    .all()

  const cardsByTrade = new Map()
  for (const row of snapshots.results) {
    if (!cardsByTrade.has(row.trade_id)) cardsByTrade.set(row.trade_id, [])
    cardsByTrade.get(row.trade_id).push(row)
  }

  return json({
    trades: trades.results.map((row) => {
      const cards = cardsByTrade.get(row.id) ?? []
      return {
        id: row.id,
        status: deriveStatus(row),
        createdAt: row.created_at,
        fromConfirmedAt: row.from_confirmed_at,
        toConfirmedAt: row.to_confirmed_at,
        completedAt: completedAt(row),
        fromCash: row.from_cash,
        toCash: row.to_cash,
        from: {
          id: row.from_account_id,
          username: row.from_username,
          email: row.from_email,
          avatar: row.from_avatar,
          isSuspended: !!row.from_suspended_at,
          isPro: isPro({ pro_until: row.from_pro_until }),
          rating: ratingSummaries.get(row.from_account_id) ?? { positivePct: null, count: 0 },
        },
        to: {
          id: row.to_account_id,
          username: row.to_username,
          email: row.to_email,
          avatar: row.to_avatar,
          isSuspended: !!row.to_suspended_at,
          isPro: isPro({ pro_until: row.to_pro_until }),
          rating: ratingSummaries.get(row.to_account_id) ?? { positivePct: null, count: 0 },
        },
        fromOffered: cards.filter((c) => c.owner_account_id === row.from_account_id).map(serializeSnapshotCard),
        toOffered: cards.filter((c) => c.owner_account_id === row.to_account_id).map(serializeSnapshotCard),
      }
    }),
  })
}

// The verification photo for one card in a trade snapshot, keyed by the
// snapshot row's own id (not the original collection_item's — that item
// may have been edited or deleted since, but the snapshot's copy of the
// KV key still resolves, same as every other field it copied at propose
// time). Admin-only: requireAdmin already gates the route this hangs off
// of in index.js, same as the rest of the Admin Trades view.
export async function getTradeSnapshotPhoto(env, snapshotItemId) {
  const row = await env.DB.prepare('SELECT photo_key FROM trade_snapshot_items WHERE id = ?')
    .bind(snapshotItemId)
    .first()
  if (!row) return error('not found', 404)

  return servePhoto(env, row.photo_key)
}
