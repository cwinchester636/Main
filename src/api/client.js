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
  let res
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch (cause) {
    throw new ApiError('Can’t reach the SwapDeck server. Check your connection and try again.', 0, cause)
  }

  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new ApiError(data.error || `Request failed (${res.status})`, res.status)
  return data
}

export const api = {
  createAccount: (body) => request('/api/accounts', { method: 'POST', body }),
  getMe: (token) => request('/api/me', { token }),
  updateMe: (token, body) => request('/api/me', { method: 'PATCH', token, body }),

  getCollection: (token) => request('/api/collection', { token }),
  addCollectionItem: (token, listType, card) =>
    request('/api/collection', { method: 'POST', token, body: { listType, card } }),
  removeCollectionItem: (token, itemId) =>
    request(`/api/collection/${itemId}`, { method: 'DELETE', token }),

  getMatches: (token) => request('/api/matches', { token }),

  getTrades: (token) => request('/api/trades', { token }),
  proposeTrade: (token, toAccountId) =>
    request('/api/trades', { method: 'POST', token, body: { toAccountId } }),
  respondToTrade: (token, tradeId, action) =>
    request(`/api/trades/${tradeId}`, { method: 'PATCH', token, body: { action } }),
  confirmTrade: (token, tradeId) =>
    request(`/api/trades/${tradeId}/confirm`, { method: 'POST', token }),
}
