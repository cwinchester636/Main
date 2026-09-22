import { error, json, newId, REFERRAL_REWARD_DAYS, REFERRAL_REWARD_CAP } from '../utils.js'
import { deriveStatus } from './trades.js'
import { notifyAccount } from '../push.js'

const REFERRAL_REWARD_MS = REFERRAL_REWARD_DAYS * 24 * 60 * 60 * 1000

// Extends pro_until by REFERRAL_REWARD_DAYS from whichever is later, now or
// the account's existing pro_until -- an already-Pro account (paid or
// previously referred) gets the days added on top of what they have left,
// rather than the reward ever shortening or overwriting an active period.
async function extendPro(env, accountId, currentProUntil) {
  const base = Math.max(Date.now(), currentProUntil ?? 0)
  await env.DB.prepare('UPDATE accounts SET pro_until = ? WHERE id = ?').bind(base + REFERRAL_REWARD_MS, accountId).run()
}

// Fires once per referred account, the first time they receive a positive
// rating on a completed trade -- see README "Referrals" for the fraud
// reasoning behind each check here. Deliberately silent/best-effort: a
// referral reward is a nice-to-have on top of a real rating submission,
// never something that should risk the rating itself failing.
async function maybeGrantReferralReward(env, ctx, ratedAccountId, raterAccountId) {
  try {
    const rated = await env.DB.prepare(
      'SELECT id, username, pro_until, referred_by_account_id, referral_reward_granted_at FROM accounts WHERE id = ?',
    )
      .bind(ratedAccountId)
      .first()
    if (!rated?.referred_by_account_id || rated.referral_reward_granted_at) return

    // The trade partner who rated them positively can't be the referrer
    // themselves -- otherwise a referrer and one single fake "referred"
    // account could complete a trade with each other and rate each other
    // positively to farm the reward with no third party involved at all.
    if (raterAccountId === rated.referred_by_account_id) return

    const referrer = await env.DB.prepare(
      'SELECT id, username, pro_until, referral_rewards_granted FROM accounts WHERE id = ?',
    )
      .bind(rated.referred_by_account_id)
      .first()
    if (!referrer) return

    await env.DB.prepare('UPDATE accounts SET referral_reward_granted_at = ? WHERE id = ?')
      .bind(Date.now(), rated.id)
      .run()
    await extendPro(env, rated.id, rated.pro_until)
    ctx?.waitUntil(
      notifyAccount(env, rated.id, {
        title: 'You got a free month of Pro!',
        body: 'Thanks for completing your first trade — enjoy a free month on us.',
        linkTab: 'profile',
      }),
    )

    // The referrer's own payout is capped lifetime (REFERRAL_REWARD_CAP) --
    // the referred account above still gets their one-time welcome reward
    // regardless, since that's inherently a one-shot thing per new person,
    // not something a single new user can repeat. The cap exists
    // specifically to bound how much one referrer can keep earning.
    if (referrer.referral_rewards_granted >= REFERRAL_REWARD_CAP) return

    await env.DB.prepare(
      'UPDATE accounts SET referral_rewards_granted = referral_rewards_granted + 1 WHERE id = ?',
    )
      .bind(referrer.id)
      .run()
    await extendPro(env, referrer.id, referrer.pro_until)
    ctx?.waitUntil(
      notifyAccount(env, referrer.id, {
        title: 'Your referral earned a free month of Pro!',
        body: `${rated.username} completed their first trade — you both got a free month on us.`,
        linkTab: 'profile',
      }),
    )
  } catch (err) {
    console.error('referral reward grant failed', ratedAccountId, err)
  }
}

// D1 rejects a query with too many bound parameters well below SQLite's own
// desktop default (999) — confirmed in testing: 117 ids failed with "too
// many SQL variables" while under 100 succeeded. Chunking keeps every batch
// safely under that regardless of exactly where D1's real limit sits. This
// wasn't reachable until this session's testing pushed the local account
// count past it — admin's Users/Trades lists call this with every account
// id on the page (up to 500), so it's a real production concern once
// SwapDeck has more than a hundred or so users, not just a local-dev
// artifact.
const MAX_IDS_PER_QUERY = 90

// Batched, not one query per account — a Matches or admin list can show
// dozens of accounts at once. Returns a Map keyed by account id; an id
// with no ratings simply isn't in the map, so callers default to "no
// ratings yet" themselves rather than this returning a fake zero entry.
export async function getRatingSummaries(env, accountIds) {
  const summaries = new Map()
  const ids = [...new Set(accountIds)].filter(Boolean)
  if (ids.length === 0) return summaries

  for (let i = 0; i < ids.length; i += MAX_IDS_PER_QUERY) {
    const chunk = ids.slice(i, i + MAX_IDS_PER_QUERY)
    const placeholders = chunk.map(() => '?').join(', ')
    const rows = await env.DB.prepare(
      `SELECT rated_account_id, COUNT(*) AS total, SUM(thumbs_up) AS positive
       FROM trade_ratings
       WHERE rated_account_id IN (${placeholders})
       GROUP BY rated_account_id`,
    )
      .bind(...chunk)
      .all()

    for (const row of rows.results) {
      summaries.set(row.rated_account_id, {
        positivePct: Math.round((row.positive / row.total) * 100),
        count: row.total,
      })
    }
  }
  return summaries
}

export async function getRatingSummary(env, accountId) {
  const summaries = await getRatingSummaries(env, [accountId])
  return summaries.get(accountId) ?? { positivePct: null, count: 0 }
}

// The full list behind a rating percentage — anyone authenticated can pull
// this for any account, same visibility as the percentage itself
// (RatingBadge everywhere already shows it as "visible on X's profile to
// help other collectors decide who to trade with"; the comments are the
// substance behind that number). Includes the rater's username rather than
// showing anonymous feedback — attributable reviews are harder to fake,
// same trade-off eBay/Airbnb-style feedback makes.
export async function getRatingsForAccount(env, accountId) {
  const rows = await env.DB.prepare(
    `SELECT tr.thumbs_up, tr.comment, tr.created_at, a.username AS rater_username
     FROM trade_ratings tr
     JOIN accounts a ON a.id = tr.rater_account_id
     WHERE tr.rated_account_id = ?
     ORDER BY tr.created_at DESC`,
  )
    .bind(accountId)
    .all()

  return json({
    ratings: rows.results.map((row) => ({
      thumbsUp: !!row.thumbs_up,
      comment: row.comment,
      createdAt: row.created_at,
      raterUsername: row.rater_username,
    })),
  })
}

// Either participant can rate the other, but only once the trade has
// actually completed — a rating is a verdict on how the trade went, not a
// prediction. rated_account_id is derived from the trade itself (whichever
// side isn't the caller), never taken from the request — nobody can rate
// an account they didn't actually trade with.
export async function rateTrade(request, env, account, tradeId, ctx) {
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

  if (body.thumbsUp) {
    ctx?.waitUntil(maybeGrantReferralReward(env, ctx, ratedAccountId, account.id))
  }

  return json({ rating: { tradeId, ratedAccountId, thumbsUp: body.thumbsUp, comment, createdAt } })
}
