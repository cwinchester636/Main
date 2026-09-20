import { error, json, newId, matchKey } from '../utils.js'

// "completed" isn't a stored status value — it's derived from both
// confirmation timestamps being set on an accepted trade. See
// migrations/0002_trade_confirmations.sql for why.
export function deriveStatus(row) {
  if (row.status === 'accepted' && row.from_confirmed_at && row.to_confirmed_at) return 'completed'
  return row.status
}

export function completedAt(row) {
  if (!row.from_confirmed_at || !row.to_confirmed_at) return null
  return Math.max(row.from_confirmed_at, row.to_confirmed_at)
}

// undefined -> absent/malformed input, distinct from 0 (a valid "no cash
// added"). Never touches real money — see migrations/0010_trade_cash.sql —
// this is just validating a noted amount.
function parseCashAmount(value) {
  if (value === undefined || value === null) return 0
  const n = Number(value)
  if (!Number.isFinite(n) || n < 0) return undefined
  return Math.round(n * 100) / 100
}

// What each side was offering at propose time: the from-account's haves
// that match the to-account's wants, and vice versa — same matchKey logic
// as matches.js, just narrowed to one specific pair instead of everyone.
// Recomputed server-side from live collection_items rather than trusting
// anything the client sends, since this becomes a permanent trade record.
async function computeOfferedCards(env, fromAccountId, toAccountId) {
  const rows = await env.DB.prepare('SELECT * FROM collection_items WHERE account_id = ? OR account_id = ?')
    .bind(fromAccountId, toAccountId)
    .all()

  const fromHaves = [], fromWants = [], toHaves = [], toWants = []
  for (const row of rows.results) {
    const mine = row.account_id === fromAccountId
    const bucket = row.list_type === 'have' ? (mine ? fromHaves : toHaves) : mine ? fromWants : toWants
    bucket.push(row)
  }

  const toWantKeys = new Set(toWants.map((r) => matchKey(r.game, r.name)))
  const fromWantKeys = new Set(fromWants.map((r) => matchKey(r.game, r.name)))

  return {
    fromOffers: fromHaves.filter((r) => toWantKeys.has(matchKey(r.game, r.name))),
    toOffers: toHaves.filter((r) => fromWantKeys.has(matchKey(r.game, r.name))),
  }
}

// A verification photo has to become an independent copy at propose time,
// not a reference to the live collection_item's KV key — that key gets
// deleted the moment the owner removes the item from their collection
// (see deleteCollectionItem), which would silently break a trade record
// that's supposed to survive exactly that. Costs one extra KV read+write
// per photographed card offered, only at propose time.
async function copySnapshotPhoto(env, sourcePhotoKey) {
  if (!sourcePhotoKey) return null
  const object = await env.PHOTOS.getWithMetadata(sourcePhotoKey, 'arrayBuffer')
  if (!object?.value) return null

  const snapshotKey = `snapshot/${newId()}`
  await env.PHOTOS.put(snapshotKey, object.value, { metadata: object.metadata })
  return snapshotKey
}

function snapshotInsert(env, tradeId, ownerAccountId, row, snapshotPhotoKey, createdAt) {
  return env.DB.prepare(
    `INSERT INTO trade_snapshot_items
       (id, trade_id, owner_account_id, game, name, set_name, number, rarity, image, condition, grade, photo_key, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).bind(
    newId(),
    tradeId,
    ownerAccountId,
    row.game,
    row.name,
    row.set_name,
    row.number,
    row.rarity,
    row.image,
    row.condition,
    row.grade,
    snapshotPhotoKey,
    createdAt,
  )
}

export async function proposeTrade(request, env, account) {
  const body = await request.json().catch(() => null)
  if (!body || typeof body.toAccountId !== 'string') return error('toAccountId is required')
  if (body.toAccountId === account.id) return error('cannot propose a trade to yourself')

  const fromCash = parseCashAmount(body.cashAmount)
  if (fromCash === undefined) return error('cashAmount must be a non-negative number')

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
  const { fromOffers, toOffers } = await computeOfferedCards(env, account.id, body.toAccountId)

  const fromPhotoKeys = await Promise.all(fromOffers.map((row) => copySnapshotPhoto(env, row.photo_key)))
  const toPhotoKeys = await Promise.all(toOffers.map((row) => copySnapshotPhoto(env, row.photo_key)))

  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO trade_proposals (id, from_account_id, to_account_id, status, from_cash, created_at)
       VALUES (?, ?, ?, 'pending', ?, ?)`,
    ).bind(id, account.id, body.toAccountId, fromCash, createdAt),
    ...fromOffers.map((row, i) => snapshotInsert(env, id, account.id, row, fromPhotoKeys[i], createdAt)),
    ...toOffers.map((row, i) => snapshotInsert(env, id, body.toAccountId, row, toPhotoKeys[i], createdAt)),
  ])

  return json(
    {
      proposal: {
        id,
        from_account_id: account.id,
        to_account_id: body.toAccountId,
        status: 'pending',
        from_cash: fromCash,
        to_cash: 0,
        created_at: createdAt,
      },
    },
    201,
  )
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
      myCash: isFrom ? row.from_cash : row.to_cash,
      theirCash: isFrom ? row.to_cash : row.from_cash,
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

  // Only accept adds cash — the recipient decides theirs at their own step,
  // same as the proposer did at propose time (see migrations/0010). A
  // decline has nothing to add cash to.
  let toCash = 0
  if (body.action === 'accept') {
    toCash = parseCashAmount(body.cashAmount)
    if (toCash === undefined) return error('cashAmount must be a non-negative number')
  }

  const status = body.action === 'accept' ? 'accepted' : 'declined'
  await env.DB.prepare('UPDATE trade_proposals SET status = ?, to_cash = ? WHERE id = ?')
    .bind(status, toCash, tradeId)
    .run()

  return json({ proposal: { ...row, status, to_cash: toCash } })
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
