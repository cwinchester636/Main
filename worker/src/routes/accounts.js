import { error, json, newId, generateToken, hashToken } from '../utils.js'
import { publicAccount } from '../auth.js'

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/

export async function createAccount(request, env) {
  const body = await request.json().catch(() => null)
  if (!body || typeof body.username !== 'string') return error('username is required')

  const username = body.username.trim()
  if (!USERNAME_RE.test(username)) {
    return error('username must be 3-20 characters: letters, numbers, underscore')
  }

  const avatar = typeof body.avatar === 'string' && body.avatar ? body.avatar : '🙂'
  const zip = typeof body.zip === 'string' && body.zip.trim() ? body.zip.trim() : null

  const existing = await env.DB.prepare('SELECT id FROM accounts WHERE username = ?').bind(username).first()
  if (existing) return error('that username is taken', 409)

  const id = newId()
  const token = generateToken()
  const tokenHash = await hashToken(token)

  await env.DB.prepare(
    'INSERT INTO accounts (id, username, token_hash, avatar, zip, created_at) VALUES (?, ?, ?, ?, ?, ?)',
  )
    .bind(id, username, tokenHash, avatar, zip, Date.now())
    .run()

  return json({ account: { id, username, avatar, zip }, token }, 201)
}

export function getMe(account) {
  return json({ account: publicAccount(account) })
}

export async function updateMe(request, env, account) {
  const body = await request.json().catch(() => null)
  if (!body) return error('invalid body')

  const avatar = typeof body.avatar === 'string' && body.avatar ? body.avatar : account.avatar
  const zip = typeof body.zip === 'string' ? body.zip.trim() || null : account.zip

  await env.DB.prepare('UPDATE accounts SET avatar = ?, zip = ? WHERE id = ?')
    .bind(avatar, zip, account.id)
    .run()

  return json({ account: { id: account.id, username: account.username, avatar, zip } })
}
