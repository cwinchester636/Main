import {
  error,
  json,
  newId,
  generateToken,
  hashToken,
  hashPassword,
  verifyPassword,
  isPro,
  FREE_MAX_RADIUS_MILES,
  normalizeEmailForFraudCheck,
} from '../utils.js'
import { publicAccount } from '../auth.js'
import { geocodeZip } from '../geocode.js'
import { isAdminUsername } from '../admin.js'

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/
// Deliberately permissive — this only rejects obviously-malformed input
// ("no @", "no dot"), not a real deliverability check. See README
// "Accounts & auth": there's no confirmation email, so nothing here can
// actually prove the address belongs to whoever's signing up.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MIN_PASSWORD_LENGTH = 8
const RADIUS_OPTIONS = [5, 10, 25, 50, 100, 250]

// radiusMiles: absent -> unchanged (updateMe) / unset (createAccount), null
// -> explicitly "no limit", a value not in RADIUS_OPTIONS -> rejected. Keeps
// the DB from accumulating arbitrary user-supplied numbers.
function parseRadius(body, fallback) {
  if (!('radiusMiles' in body)) return fallback
  if (body.radiusMiles === null) return null
  if (RADIUS_OPTIONS.includes(body.radiusMiles)) return body.radiusMiles
  return undefined
}

// Looks up a referral code (currently just the referrer's own username --
// no separate invite-code scheme, one less thing to keep in sync) and
// applies two fraud checks before crediting it, both deliberately silent
// (a failed check just means no referral is recorded, never a signup
// error -- see the caller). See README "Referrals" for why each one
// exists:
//   1. Same signup IP as the referrer -- most likely the same person
//      signing up twice from their own device/network to farm the reward.
//   2. Same Gmail mailbox as the referrer, or as another account this
//      exact referrer has already been credited for, via the dot/+ trick
//      (see normalizeEmailForFraudCheck) -- the same person posing as
//      multiple "friends."
// Neither check is foolproof (a determined fraudster can use two devices
// and two real mailboxes), but both raise the cost of abuse well past
// what a casual self-referral attempt would bother with, without ever
// blocking a genuine signup over a false positive.
async function resolveReferrer(env, request, body, newAccountEmail) {
  const referredByUsername = typeof body.referredByUsername === 'string' ? body.referredByUsername.trim() : ''
  if (!referredByUsername) return null

  const referrer = await env.DB.prepare('SELECT id, email, signup_ip FROM accounts WHERE username = ?')
    .bind(referredByUsername)
    .first()
  if (!referrer) return null

  const signupIp = request.headers.get('CF-Connecting-IP') || null
  if (signupIp && referrer.signup_ip && signupIp === referrer.signup_ip) return null

  const normalizedNew = normalizeEmailForFraudCheck(newAccountEmail)
  if (normalizedNew === normalizeEmailForFraudCheck(referrer.email)) return null

  const siblings = await env.DB.prepare('SELECT email FROM accounts WHERE referred_by_account_id = ?')
    .bind(referrer.id)
    .all()
  if (siblings.results.some((row) => normalizeEmailForFraudCheck(row.email) === normalizedNew)) return null

  return referrer.id
}

export async function createAccount(request, env) {
  const body = await request.json().catch(() => null)
  if (!body || typeof body.username !== 'string') return error('username is required')

  const username = body.username.trim()
  if (!USERNAME_RE.test(username)) {
    return error('username must be 3-20 characters: letters, numbers, underscore')
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  if (!EMAIL_RE.test(email)) return error('a valid email address is required')

  const password = typeof body.password === 'string' ? body.password : ''
  if (password.length < MIN_PASSWORD_LENGTH) {
    return error(`password must be at least ${MIN_PASSWORD_LENGTH} characters`)
  }

  const avatar = typeof body.avatar === 'string' && body.avatar ? body.avatar : '🙂'
  const zip = typeof body.zip === 'string' && body.zip.trim() ? body.zip.trim() : null
  // Defaults to the free-tier cap, not "any distance" -- a brand-new
  // account is never Pro, so falling back to unlimited here would let
  // every signup start past the limit updateMe otherwise enforces. See
  // README "Pro tier / paywall".
  const radiusMiles = parseRadius(body, FREE_MAX_RADIUS_MILES)
  if (radiusMiles === undefined) return error(`radiusMiles must be one of ${RADIUS_OPTIONS.join(', ')}, or null`)
  if (radiusMiles === null || radiusMiles > FREE_MAX_RADIUS_MILES) {
    return error(
      `free accounts can search up to ${FREE_MAX_RADIUS_MILES} miles — upgrade to Pro for unlimited search radius`,
      403,
    )
  }

  const existingUsername = await env.DB.prepare('SELECT id FROM accounts WHERE username = ?').bind(username).first()
  if (existingUsername) return error('that username is taken', 409)

  const existingEmail = await env.DB.prepare('SELECT id FROM accounts WHERE email = ?').bind(email).first()
  if (existingEmail) return error('an account with that email already exists', 409)

  // Referral credit (see README "Referrals") is recorded, or silently
  // dropped, here -- never surfaced as a signup error. A bad/nonexistent
  // referral code, or one that fails a fraud check, should never block
  // someone from actually creating an account; it should just mean nobody
  // gets a reward for it.
  const referredByAccountId = await resolveReferrer(env, request, body, email)
  const signupIp = request.headers.get('CF-Connecting-IP') || null

  const id = newId()
  const token = generateToken()
  const tokenHash = await hashToken(token)
  const { hash: passwordHash, salt: passwordSalt } = await hashPassword(password)
  const coords = await geocodeZip(zip)

  await env.DB.prepare(
    `INSERT INTO accounts
       (id, username, token_hash, email, password_hash, password_salt, avatar, zip, lat, lng, radius_miles, created_at, referred_by_account_id, signup_ip)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      id,
      username,
      tokenHash,
      email,
      passwordHash,
      passwordSalt,
      avatar,
      zip,
      coords?.lat ?? null,
      coords?.lng ?? null,
      radiusMiles,
      Date.now(),
      referredByAccountId,
      signupIp,
    )
    .run()

  return json(
    {
      account: {
        id,
        username,
        email,
        avatar,
        zip,
        radiusMiles,
        isAdmin: isAdminUsername(username, env),
        isPro: false,
        referralRewardsGranted: 0,
      },
      token,
    },
    201,
  )
}

// Logging in issues a *new* token and overwrites the account's stored one
// — token_hash is UNIQUE per account (one active session), so signing in
// on a new device invalidates whatever session was active elsewhere. That
// tradeoff (vs. a separate multi-session table) matches this app's
// existing single-token-per-account model; see README.
export async function login(request, env) {
  const body = await request.json().catch(() => null)
  const identifier = typeof body?.usernameOrEmail === 'string' ? body.usernameOrEmail.trim() : ''
  const password = typeof body?.password === 'string' ? body.password : ''
  if (!identifier || !password) return error('usernameOrEmail and password are required')

  const row = await env.DB.prepare('SELECT * FROM accounts WHERE username = ? OR email = ?')
    .bind(identifier, identifier.toLowerCase())
    .first()

  // Same generic error whether the account doesn't exist, predates
  // passwords (password_hash is null), or the password's just wrong —
  // never confirm which, that's a user-enumeration leak.
  const invalid = () => error('incorrect username/email or password', 401)
  if (!row || !row.password_hash) return invalid()
  if (!(await verifyPassword(password, row.password_salt, row.password_hash))) return invalid()

  const token = generateToken()
  const tokenHash = await hashToken(token)
  await env.DB.prepare('UPDATE accounts SET token_hash = ? WHERE id = ?').bind(tokenHash, row.id).run()

  return json({ account: { ...publicAccount(row), isAdmin: isAdminUsername(row.username, env) }, token })
}

export function getMe(account, env) {
  return json({ account: { ...publicAccount(account), isAdmin: isAdminUsername(account.username, env) } })
}

export async function updateMe(request, env, account) {
  const body = await request.json().catch(() => null)
  if (!body) return error('invalid body')

  const avatar = typeof body.avatar === 'string' && body.avatar ? body.avatar : account.avatar
  const zip = typeof body.zip === 'string' ? body.zip.trim() || null : account.zip
  const radiusMiles = parseRadius(body, account.radius_miles)
  if (radiusMiles === undefined) return error(`radiusMiles must be one of ${RADIUS_OPTIONS.join(', ')}, or null`)

  // "Any distance" (null) and radii beyond FREE_MAX_RADIUS_MILES are a Pro
  // perk — free accounts can still narrow their radius as much as they
  // like, this only stops them widening it past the cap. See README "Pro
  // tier / paywall".
  if (!isPro(account) && (radiusMiles === null || radiusMiles > FREE_MAX_RADIUS_MILES)) {
    return error(
      `free accounts can search up to ${FREE_MAX_RADIUS_MILES} miles — upgrade to Pro for unlimited search radius`,
      403,
    )
  }

  // Only re-geocode when the ZIP actually changed — avoids an external call
  // (and its latency/failure risk) on every unrelated profile save.
  const zipChanged = zip !== account.zip
  const coords = zipChanged ? await geocodeZip(zip) : { lat: account.lat, lng: account.lng }

  await env.DB.prepare('UPDATE accounts SET avatar = ?, zip = ?, lat = ?, lng = ?, radius_miles = ? WHERE id = ?')
    .bind(avatar, zip, coords?.lat ?? null, coords?.lng ?? null, radiusMiles, account.id)
    .run()

  return json({
    account: {
      id: account.id,
      username: account.username,
      email: account.email,
      avatar,
      zip,
      radiusMiles,
      isAdmin: isAdminUsername(account.username, env),
      isPro: isPro(account),
      referralRewardsGranted: account.referral_rewards_granted ?? 0,
    },
  })
}
