import { authenticate } from './auth.js'
import { error, handleOptions } from './utils.js'
import { createAccount, login, getMe, updateMe } from './routes/accounts.js'
import { getCollection, addCollectionItem, deleteCollectionItem, getCollectionItemPhoto } from './routes/collection.js'
import { getMatches } from './routes/matches.js'
import { proposeTrade, getTrades, respondToTrade, confirmTrade } from './routes/trades.js'
import { requireAdmin, listUsers, deleteUser, listTrades, getTradeSnapshotPhoto, setUserSuspended, setUserPro } from './routes/admin.js'
import { getMessages, sendMessage } from './routes/messages.js'
import { createReport, adminListReports, adminResolveReport } from './routes/reports.js'
import { rateTrade, getRatingsForAccount } from './routes/ratings.js'
import { subscribe, unsubscribe } from './push.js'
import { listEvents, createEvent, deleteEvent, toggleRsvp } from './routes/events.js'
import { listNotifications, markNotificationsRead } from './routes/notifications.js'
import { listBlocked, toggleBlock } from './routes/blocks.js'
import { verifyProPurchase } from './routes/purchases.js'

export default {
  async fetch(request, env, ctx) {
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
      if (path === '/api/me/pro/verify' && request.method === 'POST') return await verifyProPurchase(env, account)

      if (path === '/api/collection' && request.method === 'GET') return await getCollection(env, account)
      if (path === '/api/collection' && request.method === 'POST') {
        return await addCollectionItem(request, env, account, ctx)
      }
      const itemMatch = path.match(/^\/api\/collection\/([^/]+)$/)
      if (itemMatch && request.method === 'DELETE') {
        return await deleteCollectionItem(env, account, itemMatch[1])
      }
      const photoMatch = path.match(/^\/api\/collection\/([^/]+)\/photo$/)
      if (photoMatch && request.method === 'GET') {
        return await getCollectionItemPhoto(env, account, photoMatch[1])
      }

      if (path === '/api/matches' && request.method === 'GET') return await getMatches(env, account)

      if (path === '/api/trades' && request.method === 'GET') return await getTrades(env, account)
      if (path === '/api/trades' && request.method === 'POST') return await proposeTrade(request, env, account, ctx)

      const tradeMatch = path.match(/^\/api\/trades\/([^/]+)$/)
      if (tradeMatch && request.method === 'PATCH') {
        return await respondToTrade(request, env, account, tradeMatch[1], ctx)
      }
      const confirmMatch = path.match(/^\/api\/trades\/([^/]+)\/confirm$/)
      if (confirmMatch && request.method === 'POST') {
        return await confirmTrade(env, account, confirmMatch[1], ctx)
      }

      const messagesMatch = path.match(/^\/api\/trades\/([^/]+)\/messages$/)
      if (messagesMatch && request.method === 'GET') {
        return await getMessages(env, account, messagesMatch[1])
      }
      if (messagesMatch && request.method === 'POST') {
        return await sendMessage(request, env, account, messagesMatch[1], ctx)
      }
      const reportMatch = path.match(/^\/api\/trades\/([^/]+)\/report$/)
      if (reportMatch && request.method === 'POST') {
        return await createReport(request, env, account, reportMatch[1])
      }
      const ratingMatch = path.match(/^\/api\/trades\/([^/]+)\/rating$/)
      if (ratingMatch && request.method === 'POST') {
        return await rateTrade(request, env, account, ratingMatch[1], ctx)
      }

      const accountRatingsMatch = path.match(/^\/api\/accounts\/([^/]+)\/ratings$/)
      if (accountRatingsMatch && request.method === 'GET') {
        return await getRatingsForAccount(env, accountRatingsMatch[1])
      }
      const accountBlockMatch = path.match(/^\/api\/accounts\/([^/]+)\/block$/)
      if (accountBlockMatch && request.method === 'POST') {
        return await toggleBlock(env, account, accountBlockMatch[1])
      }

      if (path === '/api/blocked' && request.method === 'GET') return await listBlocked(env, account)

      if (path === '/api/events' && request.method === 'GET') return await listEvents(env, account)
      if (path === '/api/events' && request.method === 'POST') return await createEvent(request, env, account, ctx)
      const eventMatch = path.match(/^\/api\/events\/([^/]+)$/)
      if (eventMatch && request.method === 'DELETE') {
        return await deleteEvent(env, account, eventMatch[1])
      }
      const eventRsvpMatch = path.match(/^\/api\/events\/([^/]+)\/rsvp$/)
      if (eventRsvpMatch && request.method === 'POST') {
        return await toggleRsvp(env, account, eventRsvpMatch[1])
      }

      if (path === '/api/notifications' && request.method === 'GET') return await listNotifications(env, account)
      if (path === '/api/notifications/read' && request.method === 'PATCH') {
        return await markNotificationsRead(env, account)
      }

      if (path === '/api/push/subscribe' && request.method === 'POST') {
        return await subscribe(request, env, account)
      }
      if (path === '/api/push/unsubscribe' && request.method === 'POST') {
        return await unsubscribe(request, env, account)
      }

      if (path === '/api/admin/users' && request.method === 'GET') {
        return requireAdmin(account, env) ?? (await listUsers(env))
      }
      const adminUserMatch = path.match(/^\/api\/admin\/users\/([^/]+)$/)
      if (adminUserMatch && request.method === 'DELETE') {
        return requireAdmin(account, env) ?? (await deleteUser(env, account, adminUserMatch[1]))
      }
      const adminSuspendMatch = path.match(/^\/api\/admin\/users\/([^/]+)\/suspend$/)
      if (adminSuspendMatch && request.method === 'PATCH') {
        return requireAdmin(account, env) ?? (await setUserSuspended(request, env, account, adminSuspendMatch[1]))
      }
      const adminProMatch = path.match(/^\/api\/admin\/users\/([^/]+)\/pro$/)
      if (adminProMatch && request.method === 'PATCH') {
        return requireAdmin(account, env) ?? (await setUserPro(request, env, account, adminProMatch[1]))
      }
      if (path === '/api/admin/trades' && request.method === 'GET') {
        return requireAdmin(account, env) ?? (await listTrades(env))
      }
      const adminPhotoMatch = path.match(/^\/api\/admin\/trade-photos\/([^/]+)$/)
      if (adminPhotoMatch && request.method === 'GET') {
        return requireAdmin(account, env) ?? (await getTradeSnapshotPhoto(env, adminPhotoMatch[1]))
      }
      if (path === '/api/admin/reports' && request.method === 'GET') {
        return requireAdmin(account, env) ?? (await adminListReports(env))
      }
      const adminReportMatch = path.match(/^\/api\/admin\/reports\/([^/]+)$/)
      if (adminReportMatch && request.method === 'PATCH') {
        return requireAdmin(account, env) ?? (await adminResolveReport(env, adminReportMatch[1]))
      }

      return error('not found', 404)
    } catch (err) {
      console.error(err)
      return error('internal error', 500)
    }
  },
}
