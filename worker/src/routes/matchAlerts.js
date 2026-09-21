import { newId } from '../utils.js'
import { computeMatches } from './matches.js'
import { notifyAccount } from '../push.js'

function pairKey(idA, idB) {
  return idA < idB ? [idA, idB] : [idB, idA]
}

// Called after a collection change that could create a match -- adding a
// have or a want. Removing an item can only ever remove a match, never
// create one, so deleteCollectionItem doesn't need this.
//
// Diffs the account's current matches against known_matches (pairs
// already shown to each other before, see migrations/0014) and notifies
// both sides of any genuinely new one. Best-effort like every other push
// trigger: never throws back into the request that called it (wrapped in
// ctx.waitUntil() at the call site in collection.js), so a query hiccup
// here can never break adding a card.
export async function notifyNewMatches(env, account) {
  try {
    const matches = await computeMatches(env, account)
    if (matches.length === 0) return

    const existing = await env.DB.prepare(
      'SELECT account_id_a, account_id_b FROM known_matches WHERE account_id_a = ? OR account_id_b = ?',
    )
      .bind(account.id, account.id)
      .all()
    const knownCounterparts = new Set(
      existing.results.map((row) => (row.account_id_a === account.id ? row.account_id_b : row.account_id_a)),
    )

    const newMatches = matches.filter((m) => !knownCounterparts.has(m.account.id))
    if (newMatches.length === 0) return

    const now = Date.now()
    await env.DB.batch(
      newMatches.map((m) => {
        const [a, b] = pairKey(account.id, m.account.id)
        return env.DB.prepare(
          `INSERT INTO known_matches (id, account_id_a, account_id_b, first_seen_at)
           VALUES (?, ?, ?, ?)
           ON CONFLICT(account_id_a, account_id_b) DO NOTHING`,
        ).bind(newId(), a, b, now)
      }),
    )

    await Promise.all(
      newMatches.flatMap((m) => [
        notifyAccount(env, account.id, {
          title: 'New match',
          body: `${m.account.username} matches your list`,
          tag: `match-${m.account.id}`,
        }),
        notifyAccount(env, m.account.id, {
          title: 'New match',
          body: `${account.username} matches your list`,
          tag: `match-${account.id}`,
        }),
      ]),
    )
  } catch (err) {
    console.error('notifyNewMatches failed', err)
  }
}
