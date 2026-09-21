import { error, json, newId, matchKey, servePhoto } from '../utils.js'
import { isAdminUsername } from '../admin.js'
import { notifyNewMatches } from './matchAlerts.js'

// Kept in sync with src/data/conditions.js (the frontend can't import
// across the worker/ boundary, so this is intentionally duplicated —
// same tradeoff as RADIUS_OPTIONS in accounts.js).
const CONDITION_IDS = ['HP', 'MP', 'LP', 'NM', 'graded']

// The client resizes photos to a few hundred KB before upload (see
// PhotoStep in CardPicker.jsx) — this is just a hard backstop against a
// client that skips that step, not the expected size in practice.
const MAX_PHOTO_BYTES = 8 * 1024 * 1024

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
    condition: row.condition ?? null,
    grade: row.grade ?? null,
    hasPhoto: !!row.photo_key,
  }
}

// condition/grade absent entirely -> both null (nothing recorded).
// condition === 'graded' -> grade must be an integer 1-10.
// any other condition -> grade is ignored/dropped, even if the client sent one.
function parseCondition(card) {
  if (card.condition == null) return { condition: null, grade: null }
  if (!CONDITION_IDS.includes(card.condition)) return undefined

  if (card.condition !== 'graded') return { condition: card.condition, grade: null }

  const grade = Number(card.grade)
  if (!Number.isInteger(grade) || grade < 1 || grade > 10) return undefined
  return { condition: 'graded', grade }
}

export async function getCollection(env, account) {
  const rows = await env.DB.prepare('SELECT * FROM collection_items WHERE account_id = ?')
    .bind(account.id)
    .all()

  const haves = rows.results.filter((r) => r.list_type === 'have').map(serializeCard)
  const wants = rows.results.filter((r) => r.list_type === 'want').map(serializeCard)
  return json({ haves, wants })
}

// Cards are added as multipart/form-data, not JSON, so a 'have' can carry a
// verification photo in the same request: { listType, card (JSON string),
// photo? (File) }. 'want' items never take a photo — wanting a card isn't a
// possession claim, nothing to verify.
export async function addCollectionItem(request, env, account, ctx) {
  const form = await request.formData().catch(() => null)
  if (!form) return error('malformed request')

  const listType = form.get('listType')
  if (listType !== 'have' && listType !== 'want') {
    return error('listType must be "have" or "want"')
  }

  let card
  try {
    card = JSON.parse(form.get('card') ?? '')
  } catch {
    card = null
  }
  if (!card || typeof card.name !== 'string' || typeof card.game !== 'string') {
    return error('card.name and card.game are required')
  }
  const parsedCondition = parseCondition(card)
  if (!parsedCondition) {
    return error(`condition must be one of ${CONDITION_IDS.join(', ')}, and graded requires a grade 1-10`)
  }

  const photo = form.get('photo')
  const hasPhoto = photo instanceof File && photo.size > 0
  if (listType === 'have' && !hasPhoto) {
    return error('a photo proving you hold this card is required to add it to your Haves')
  }

  let photoKey = null
  if (hasPhoto) {
    if (!photo.type.startsWith('image/')) return error('photo must be an image')
    if (photo.size > MAX_PHOTO_BYTES) return error('photo is too large')
    photoKey = `${account.id}/${newId()}`
    await env.PHOTOS.put(photoKey, await photo.arrayBuffer(), { metadata: { contentType: photo.type } })
  }

  const id = newId()
  const sourceId = typeof card.id === 'string' ? card.id : null
  await env.DB.prepare(
    `INSERT INTO collection_items (id, account_id, list_type, game, name, set_name, number, rarity, image, source_id, condition, grade, photo_key, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      id,
      account.id,
      listType,
      card.game,
      card.name,
      card.set ?? null,
      card.number ?? null,
      card.rarity ?? null,
      card.image ?? null,
      sourceId,
      parsedCondition.condition,
      parsedCondition.grade,
      photoKey,
      Date.now(),
    )
    .run()

  ctx?.waitUntil(notifyNewMatches(env, account))

  return json(
    {
      item: serializeCard({
        ...card,
        id,
        set_name: card.set,
        source_id: sourceId,
        photo_key: photoKey,
        ...parsedCondition,
      }),
    },
    201,
  )
}

export async function deleteCollectionItem(env, account, itemId) {
  const row = await env.DB.prepare('SELECT photo_key FROM collection_items WHERE id = ? AND account_id = ?')
    .bind(itemId, account.id)
    .first()
  if (!row) return error('not found', 404)

  await env.DB.prepare('DELETE FROM collection_items WHERE id = ? AND account_id = ?')
    .bind(itemId, account.id)
    .run()

  // Best-effort — an orphaned KV entry just wastes a little storage, not
  // worth failing the delete over.
  if (row.photo_key) await env.PHOTOS.delete(row.photo_key).catch(() => {})

  return json({ deleted: itemId })
}

// Who can see a card's verification photo: its owner, an admin (dispute
// review), or someone who currently wants this exact card — i.e. it's
// showing up as a match for them in matches.js. Not "anyone who's matched
// with this account at all": scoped to the specific card, same matchKey
// logic used everywhere else a "does this count as the same card" question
// comes up.
export async function getCollectionItemPhoto(env, account, itemId) {
  const item = await env.DB.prepare('SELECT * FROM collection_items WHERE id = ?').bind(itemId).first()
  if (!item || !item.photo_key) return error('not found', 404)

  const isOwner = item.account_id === account.id
  const isAdmin = isAdminUsername(account.username, env)

  if (!isOwner && !isAdmin) {
    const wants = await env.DB.prepare(
      `SELECT game, name FROM collection_items WHERE account_id = ? AND list_type = 'want'`,
    )
      .bind(account.id)
      .all()
    const isMatchedPartner = wants.results.some((w) => matchKey(w.game, w.name) === matchKey(item.game, item.name))
    if (!isMatchedPartner) return error('not authorized to view this photo', 403)
  }

  return servePhoto(env, item.photo_key)
}
