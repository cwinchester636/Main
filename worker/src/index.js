import { authenticate } from './auth.js'
import { error, handleOptions } from './utils.js'
import { createAccount, getMe, updateMe } from './routes/accounts.js'
import { getCollection, addCollectionItem, deleteCollectionItem } from './routes/collection.js'
import { getMatches } from './routes/matches.js'
import { proposeTrade, getTrades } from './routes/trades.js'

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return handleOptions()

    const url = new URL(request.url)
    const path = url.pathname

    try {
      // Public route: creating an account is how you get a token.
      if (path === '/api/accounts' && request.method === 'POST') {
        return await createAccount(request, env)
      }

      // Everything past this point requires a valid bearer token.
      const account = await authenticate(request, env)
      if (!account) return error('unauthorized', 401)

      if (path === '/api/me' && request.method === 'GET') return getMe(account)
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

      return error('not found', 404)
    } catch (err) {
      console.error(err)
      return error('internal error', 500)
    }
  },
}
