import { json, matchKey, zipProximity, haversineMiles } from '../utils.js'

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
  }
}

export async function getMatches(env, account) {
  const mine = await env.DB.prepare('SELECT * FROM collection_items WHERE account_id = ?')
    .bind(account.id)
    .all()
  const myHaves = mine.results.filter((r) => r.list_type === 'have')
  const myWants = mine.results.filter((r) => r.list_type === 'want')
  const myWantKeys = new Set(myWants.map((r) => matchKey(r.game, r.name)))
  const myHaveKeys = new Set(myHaves.map((r) => matchKey(r.game, r.name)))

  if (myHaveKeys.size === 0 && myWantKeys.size === 0) return json({ matches: [] })

  const others = await env.DB.prepare(
    `SELECT ci.*, a.username AS acct_username, a.avatar AS acct_avatar, a.zip AS acct_zip,
            a.lat AS acct_lat, a.lng AS acct_lng
     FROM collection_items ci
     JOIN accounts a ON a.id = ci.account_id
     WHERE ci.account_id != ?`,
  )
    .bind(account.id)
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

  const matches = [...byAccount.values()]
    .map((entry) => {
      const theyHaveYouWant = [...entry.theyHaveYouWant.values()]
      const youHaveTheyWant = [...entry.youHaveTheyWant.values()]
      const distanceMiles = haversineMiles(account.lat, account.lng, entry.lat, entry.lng)
      return {
        account: entry.account,
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

  return json({ matches })
}
