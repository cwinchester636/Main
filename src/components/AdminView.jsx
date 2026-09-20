import { useEffect, useState } from 'react'
import AvatarIcon from './AvatarIcon.jsx'
import CardChip from './CardChip.jsx'
import { api, ApiError } from '../api/client.js'

function formatDate(ts) {
  if (!ts) return null
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

const TRADE_STATUS_LABEL = {
  pending: 'Awaiting response',
  accepted: 'Accepted — not yet confirmed',
  declined: 'Declined',
  completed: 'Completed',
}

function AdminUsers({ token, currentAccountId }) {
  const [users, setUsers] = useState(null)
  const [error, setError] = useState('')
  const [deletingId, setDeletingId] = useState(null)

  const load = async () => {
    try {
      const { users: list } = await api.adminListUsers(token)
      setUsers(list)
      setError('')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load users.')
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleDelete = async (user) => {
    const confirmed = window.confirm(
      `Permanently delete ${user.username}? This removes their account, collection, and trade history — it can't be undone.`,
    )
    if (!confirmed) return

    setDeletingId(user.id)
    setError('')
    try {
      await api.adminDeleteUser(token, user.id)
      setUsers((prev) => prev.filter((u) => u.id !== user.id))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not delete user.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <>
      <p className="view-subtitle">
        {users ? `${users.length} account${users.length === 1 ? '' : 's'}, oldest first.` : 'Loading…'}
      </p>

      {error && <p className="form-error">{error}</p>}

      {users && (
        <div className="admin-user-list">
          {users.map((user) => (
            <div key={user.id} className="admin-user-row">
              <span className="match-avatar"><AvatarIcon value={user.avatar} size={32} /></span>
              <span className="admin-user-text">
                <strong>{user.username}</strong>
                <span className="section-hint">{user.email || 'no email'} · joined {formatDate(user.createdAt)}</span>
              </span>
              {user.id === currentAccountId ? (
                <span className="admin-user-you">you</span>
              ) : (
                <button
                  type="button"
                  className="button danger small"
                  disabled={deletingId === user.id}
                  onClick={() => handleDelete(user)}
                >
                  {deletingId === user.id ? 'Deleting…' : 'Delete'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  )
}

function AdminTradeCard({ trade }) {
  const { status } = trade
  return (
    <div className={`trade-card admin-trade-card trade-${status}`}>
      <div className="trade-card-header">
        <span className="trade-summary-text">
          <strong>{trade.from.username} ↔ {trade.to.username}</strong>
          <span className={`trade-status-badge status-${status}`}>{TRADE_STATUS_LABEL[status]}</span>
        </span>
      </div>

      <p className="section-hint">
        Proposed {formatDate(trade.createdAt)}
        {trade.completedAt ? ` · completed ${formatDate(trade.completedAt)}` : ''}
      </p>
      <p className="section-hint">
        {trade.from.username}: {trade.from.email || 'no email'}
        {trade.fromConfirmedAt ? ' · confirmed' : ''}
        {' · '}
        {trade.to.username}: {trade.to.email || 'no email'}
        {trade.toConfirmedAt ? ' · confirmed' : ''}
      </p>

      {(trade.fromOffered.length > 0 || trade.toOffered.length > 0) ? (
        <div className="admin-trade-cards">
          {trade.fromOffered.length > 0 && (
            <div className="match-detail-col">
              <h3>{trade.from.username} offered</h3>
              <div className="card-chip-list">
                {trade.fromOffered.map((card, i) => (
                  <CardChip key={i} card={card} compact />
                ))}
              </div>
            </div>
          )}
          {trade.toOffered.length > 0 && (
            <div className="match-detail-col">
              <h3>{trade.to.username} offered</h3>
              <div className="card-chip-list">
                {trade.toOffered.map((card, i) => (
                  <CardChip key={i} card={card} compact />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <p className="trade-hint">No overlapping cards were recorded at the time this was proposed.</p>
      )}
    </div>
  )
}

function AdminTrades({ token }) {
  const [trades, setTrades] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .adminListTrades(token)
      .then(({ trades: list }) => setTrades(list))
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load trades.'))
  }, [token])

  return (
    <>
      <p className="view-subtitle">
        {trades ? `${trades.length} trade${trades.length === 1 ? '' : 's'}, newest first — includes the cards each side offered.` : 'Loading…'}
      </p>

      {error && <p className="form-error">{error}</p>}

      {trades && trades.length === 0 && <p className="trade-hint">No trades proposed yet.</p>}

      {trades && trades.length > 0 && (
        <div className="trade-list">
          {trades.map((trade) => (
            <AdminTradeCard key={trade.id} trade={trade} />
          ))}
        </div>
      )}
    </>
  )
}

export default function AdminView({ token, currentAccountId }) {
  const [section, setSection] = useState('users')

  return (
    <div className="view">
      <h1>Admin</h1>
      <div className="admin-subtabs">
        <button
          type="button"
          className={`admin-subtab${section === 'users' ? ' active' : ''}`}
          onClick={() => setSection('users')}
        >
          Users
        </button>
        <button
          type="button"
          className={`admin-subtab${section === 'trades' ? ' active' : ''}`}
          onClick={() => setSection('trades')}
        >
          Trades
        </button>
      </div>

      {section === 'users' ? (
        <AdminUsers token={token} currentAccountId={currentAccountId} />
      ) : (
        <AdminTrades token={token} />
      )}
    </div>
  )
}
