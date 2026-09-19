import { json, matchKey, zipProximity } from '../utils.js'

function serializeCard(row) {
  return {
    id: row.id,
    name: row.name,
    game: row.game,
    set: row.set_name,
    number: row.number,
    rarity: row.rarity,
    image: row.image,
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
    `SELECT ci.*, a.username AS acct_username, a.avatar AS acct_avatar, a.zip AS acct_zip
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
      return {
        account: entry.account,
        theyHaveYouWant,
        youHaveTheyWant,
        isMutual: theyHaveYouWant.length > 0 && youHaveTheyWant.length > 0,
        score: theyHaveYouWant.length + youHaveTheyWant.length,
        proximity: zipProximity(account.zip, entry.account.zip),
      }
    })
    .sort((a, b) => {
      if (a.isMutual !== b.isMutual) return a.isMutual ? -1 : 1
      if (b.score !== a.score) return b.score - a.score
      return a.proximity - b.proximity
    })

  return json({ matches })
}
