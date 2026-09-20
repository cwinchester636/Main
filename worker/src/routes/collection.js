import { error, json, newId } from '../utils.js'

function serializeCard(row) {
  return {
    id: row.id,
    sourceId: row.source_id ?? null,
    name: row.name,
    game: row.game,
    set: row.set_name,
    number: row.number,
    rarity: row.rarity,
    image: row.image,
  }
}

export async function getCollection(env, account) {
  const rows = await env.DB.prepare('SELECT * FROM collection_items WHERE account_id = ?')
    .bind(account.id)
    .all()

  const haves = rows.results.filter((r) => r.list_type === 'have').map(serializeCard)
  const wants = rows.results.filter((r) => r.list_type === 'want').map(serializeCard)
  return json({ haves, wants })
}

export async function addCollectionItem(request, env, account) {
  const body = await request.json().catch(() => null)
  if (!body || (body.listType !== 'have' && body.listType !== 'want')) {
    return error('listType must be "have" or "want"')
  }
  const card = body.card
  if (!card || typeof card.name !== 'string' || typeof card.game !== 'string') {
    return error('card.name and card.game are required')
  }

  const id = newId()
  const sourceId = typeof card.id === 'string' ? card.id : null
  await env.DB.prepare(
    `INSERT INTO collection_items (id, account_id, list_type, game, name, set_name, number, rarity, image, source_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      id,
      account.id,
      body.listType,
      card.game,
      card.name,
      card.set ?? null,
      card.number ?? null,
      card.rarity ?? null,
      card.image ?? null,
      sourceId,
      Date.now(),
    )
    .run()

  return json({ item: serializeCard({ ...card, id, set_name: card.set, source_id: sourceId }) }, 201)
}

export async function deleteCollectionItem(env, account, itemId) {
  const result = await env.DB.prepare('DELETE FROM collection_items WHERE id = ? AND account_id = ?')
    .bind(itemId, account.id)
    .run()

  if (result.meta.changes === 0) return error('not found', 404)
  return json({ deleted: itemId })
}
