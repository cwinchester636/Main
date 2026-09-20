import { authenticate } from './auth.js'
import { error, handleOptions } from './utils.js'
import { createAccount, login, getMe, updateMe } from './routes/accounts.js'
import { getCollection, addCollectionItem, deleteCollectionItem } from './routes/collection.js'
import { getMatches } from './routes/matches.js'
import { proposeTrade, getTrades, respondToTrade, confirmTrade } from './routes/trades.js'
import { requireAdmin, listUsers, deleteUser, listTrades } from './routes/admin.js'

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return handleOptions()

    const url = new URL(request.url)
    const path = url.pathname

    try {
      // Public routes: these are how you get a token.
      if (path === '/api/accounts' && request.method === 'POST') {
        return await createAccount(request, env)
      }
      if (path === '/api/login' && request.method === 'POST') {
        return await login(request, env)
      }

      // Everything past this point requires a valid bearer token.
      const account = await authenticate(request, env)
      if (!account) return error('unauthorized', 401)

      if (path === '/api/me' && request.method === 'GET') return getMe(account, env)
      if (path === '/api/me' && request.method === 'PATCH') return await updateMe(request, env, account)

      if (path === '/api/collection' && request.method === 'GET') return await getCollection(env, account)
      if (path === '/api/collection' && request.method === 'POST') {
        return await addCollectionItem(request, env, account)
      }
      const itemMatch = path.match(/^\/api\/collection\/([^/]+)$/)
      if (itemMatch && request.method === 'DELETE') {
        return await deleteCollectionItem(env, account, itemMatch[1])
      }

      if (path === '/api/matches' && request.method === 'GET') return await getMatches(env, account)

      if (path === '/api/trades' && request.method === 'GET') return await getTrades(env, account)
      if (path === '/api/trades' && request.method === 'POST') return await proposeTrade(request, env, account)

      const tradeMatch = path.match(/^\/api\/trades\/([^/]+)$/)
      if (tradeMatch && request.method === 'PATCH') {
        return await respondToTrade(request, env, account, tradeMatch[1])
      }
      const confirmMatch = path.match(/^\/api\/trades\/([^/]+)\/confirm$/)
      if (confirmMatch && request.method === 'POST') {
        return await confirmTrade(env, account, confirmMatch[1])
      }

      if (path === '/api/admin/users' && request.method === 'GET') {
        return requireAdmin(account, env) ?? (await listUsers(env))
      }
      const adminUserMatch = path.match(/^\/api\/admin\/users\/([^/]+)$/)
      if (adminUserMatch && request.method === 'DELETE') {
        return requireAdmin(account, env) ?? (await deleteUser(env, account, adminUserMatch[1]))
      }
      if (path === '/api/admin/trades' && request.method === 'GET') {
        return requireAdmin(account, env) ?? (await listTrades(env))
      }

      return error('not found', 404)
    } catch (err) {
      console.error(err)
      return error('internal error', 500)
    }
  },
}
