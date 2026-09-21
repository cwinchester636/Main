// Talks to the SwapDeck Worker API (see worker/). Falls back to localhost
// for local development against `npm run dev` in worker/; set
// VITE_API_BASE_URL at build time to point at your deployed Worker.
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8787'

export class ApiError extends Error {
  constructor(message, status, cause) {
    super(message, cause ? { cause } : undefined)
    this.name = 'ApiError'
    this.status = status
  }
}

async function request(path, { method = 'GET', token, body } = {}) {
  const isForm = body instanceof FormData
  let res
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: {
        ...(body && !isForm ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: isForm ? body : body ? JSON.stringify(body) : undefined,
    })
  } catch (cause) {
    throw new ApiError('Can’t reach the SwapDeck server. Check your connection and try again.', 0, cause)
  }

  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new ApiError(data.error || `Request failed (${res.status})`, res.status)
  return data
}

// Not JSON, so it can't go through request() above — returns a Blob for
// direct use as an <img> src via URL.createObjectURL.
async function fetchBlob(path, token) {
  let res
  try {
    res = await fetch(`${API_BASE}${path}`, { headers: { Authorization: `Bearer ${token}` } })
  } catch (cause) {
    throw new ApiError('Can’t reach the SwapDeck server. Check your connection and try again.', 0, cause)
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new ApiError(data.error || `Request failed (${res.status})`, res.status)
  }
  return res.blob()
}

export const api = {
  createAccount: (body) => request('/api/accounts', { method: 'POST', body }),
  login: (body) => request('/api/login', { method: 'POST', body }),
  getMe: (token) => request('/api/me', { token }),
  updateMe: (token, body) => request('/api/me', { method: 'PATCH', token, body }),

  getCollection: (token) => request('/api/collection', { token }),
  addCollectionItem: (token, listType, card, photo) => {
    const form = new FormData()
    form.append('listType', listType)
    form.append('card', JSON.stringify(card))
    if (photo) form.append('photo', photo, 'card.jpg')
    return request('/api/collection', { method: 'POST', token, body: form })
  },
  removeCollectionItem: (token, itemId) =>
    request(`/api/collection/${itemId}`, { method: 'DELETE', token }),
  fetchCollectionItemPhoto: (token, itemId) => fetchBlob(`/api/collection/${itemId}/photo`, token),

  getMatches: (token) => request('/api/matches', { token }),

  getTrades: (token) => request('/api/trades', { token }),
  proposeTrade: (token, toAccountId, cashAmount = 0) =>
    request('/api/trades', { method: 'POST', token, body: { toAccountId, cashAmount } }),
  respondToTrade: (token, tradeId, action, cashAmount = 0) =>
    request(`/api/trades/${tradeId}`, { method: 'PATCH', token, body: { action, cashAmount } }),
  confirmTrade: (token, tradeId) =>
    request(`/api/trades/${tradeId}/confirm`, { method: 'POST', token }),

  getTradeMessages: (token, tradeId) => request(`/api/trades/${tradeId}/messages`, { token }),
  sendTradeMessage: (token, tradeId, body) =>
    request(`/api/trades/${tradeId}/messages`, { method: 'POST', token, body: { body } }),
  reportTrade: (token, tradeId, report) =>
    request(`/api/trades/${tradeId}/report`, { method: 'POST', token, body: report }),
  rateTrade: (token, tradeId, thumbsUp, comment) =>
    request(`/api/trades/${tradeId}/rating`, { method: 'POST', token, body: { thumbsUp, comment } }),

  adminListUsers: (token) => request('/api/admin/users', { token }),
  adminDeleteUser: (token, userId) => request(`/api/admin/users/${userId}`, { method: 'DELETE', token }),
  adminSetUserSuspended: (token, userId, suspended) =>
    request(`/api/admin/users/${userId}/suspend`, { method: 'PATCH', token, body: { suspended } }),
  adminListTrades: (token) => request('/api/admin/trades', { token }),
  adminFetchTradePhoto: (token, snapshotItemId) => fetchBlob(`/api/admin/trade-photos/${snapshotItemId}`, token),
  adminListReports: (token) => request('/api/admin/reports', { token }),
  adminResolveReport: (token, reportId) =>
    request(`/api/admin/reports/${reportId}`, { method: 'PATCH', token }),
}
