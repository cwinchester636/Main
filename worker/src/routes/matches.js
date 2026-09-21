import { json, matchKey, zipProximity, haversineMiles } from '../utils.js'
import { getRatingSummaries } from './ratings.js'

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

// Split from getMatches so worker/src/routes/matchAlerts.js can reuse the
// exact same "what counts as a match" logic to detect a brand-new one,
// rather than a second, subtly-different implementation drifting out of
// sync with this one.
export async function computeMatches(env, account) {
  const mine = await env.DB.prepare('SELECT * FROM collection_items WHERE account_id = ?')
    .bind(account.id)
    .all()
  const myHaves = mine.results.filter((r) => r.list_type === 'have')
  const myWants = mine.results.filter((r) => r.list_type === 'want')
  const myWantKeys = new Set(myWants.map((r) => matchKey(r.game, r.name)))
  const myHaveKeys = new Set(myHaves.map((r) => matchKey(r.game, r.name)))

  if (myHaveKeys.size === 0 && myWantKeys.size === 0) return []

  // A suspended account can't complete a trade with anyone (see
  // requireNotSuspended), so it never shows up as a potential match —
  // proposing to someone you can never actually trade with is just a
  // dead end dressed up as an opportunity. A blocked account is excluded
  // the same way and for the same reason (see worker/src/routes/blocks.js)
  // — either side blocking the other means neither can propose a new
  // trade to the other, so showing them as a match would be equally
  // misleading; checked both directions since a block is one-directional
  // but its match-hiding effect isn't.
  const others = await env.DB.prepare(
    `SELECT ci.*, a.username AS acct_username, a.avatar AS acct_avatar, a.zip AS acct_zip,
            a.lat AS acct_lat, a.lng AS acct_lng
     FROM collection_items ci
     JOIN accounts a ON a.id = ci.account_id
     WHERE ci.account_id != ? AND a.suspended_at IS NULL
       AND ci.account_id NOT IN (
         SELECT blocked_account_id FROM account_blocks WHERE blocker_account_id = ?
         UNION
         SELECT blocker_account_id FROM account_blocks WHERE blocked_account_id = ?
       )`,
  )
    .bind(account.id, account.id, account.id)
    .all()

  const byAccount = new Map()
  for (const row of others.results) {
    const key = matchKey(row.game, row.name)
    const relevant =
      (row.list_type === 'have' && myWantKeys.has(key)) || (row.list_type === 'want' && myHaveKeys.has(key))
    if (!relevant) continue

    if (!byAccount.has(row.account_id)) {
      byAccount.set(row.account_id, {
        account: { id: row.account_id, username: row.acct_username, avatar: row.acct_avatar, zip: row.acct_zip },
        lat: row.acct_lat,
        lng: row.acct_lng,
        theyHaveYouWant: new Map(),
        youHaveTheyWant: new Map(),
      })
    }
    const entry = byAccount.get(row.account_id)
    if (row.list_type === 'have') entry.theyHaveYouWant.set(key, serializeCard(row))
    else entry.youHaveTheyWant.set(key, serializeCard(row))
  }

  const ratingSummaries = await getRatingSummaries(env, [...byAccount.keys()])

  const matches = [...byAccount.values()]
    .map((entry) => {
      const theyHaveYouWant = [...entry.theyHaveYouWant.values()]
      const youHaveTheyWant = [...entry.youHaveTheyWant.values()]
      const distanceMiles = haversineMiles(account.lat, account.lng, entry.lat, entry.lng)
      return {
        account: {
          ...entry.account,
          rating: ratingSummaries.get(entry.account.id) ?? { positivePct: null, count: 0 },
        },
        theyHaveYouWant,
        youHaveTheyWant,
        isMutual: theyHaveYouWant.length > 0 && youHaveTheyWant.length > 0,
        score: theyHaveYouWant.length + youHaveTheyWant.length,
        // Real distance when both sides are geocoded; otherwise the coarse
        // ZIP-prefix bucket is still returned so the client always has
        // something to show. See "Matching & proximity" in the README.
        distanceMiles: distanceMiles === null ? null : Math.round(distanceMiles * 10) / 10,
        proximity: zipProximity(account.zip, entry.account.zip),
      }
    })
    // A radius only ever narrows results for accounts we could actually
    // measure — an ungeocoded match is never hidden just because we can't
    // confirm it's outside the radius.
    .filter((m) => account.radius_miles == null || m.distanceMiles == null || m.distanceMiles <= account.radius_miles)
    .sort((a, b) => {
      if (a.isMutual !== b.isMutual) return a.isMutual ? -1 : 1
      if (b.score !== a.score) return b.score - a.score
      if (a.distanceMiles !== null && b.distanceMiles !== null) return a.distanceMiles - b.distanceMiles
      if (a.distanceMiles !== null) return -1
      if (b.distanceMiles !== null) return 1
      return a.proximity - b.proximity
    })

  return matches
}

export async function getMatches(env, account) {
  const matches = await computeMatches(env, account)
  return json({ matches })
}
