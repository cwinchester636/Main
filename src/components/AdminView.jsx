import { useEffect, useState } from 'react'
import AvatarIcon from './AvatarIcon.jsx'
import CardChip from './CardChip.jsx'
import PhotoViewerModal from './PhotoViewerModal.jsx'
import TradeChatModal from './TradeChatModal.jsx'
import RatingBadge from './RatingBadge.jsx'
import RatingsListModal from './RatingsListModal.jsx'
import { api, ApiError } from '../api/client.js'
import { formatUSD } from '../utils/currency.js'

function formatDate(ts) {
  if (!ts) return null
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatDateTime(ts) {
  if (!ts) return null
  return new Date(ts).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

const REPORT_REASON_LABEL = {
  not_received: 'Never received the card',
  not_as_described: 'Card not as described',
  no_show: "Other person didn't show/respond",
  payment_dispute: "Cash wasn't paid as agreed",
  other: 'Something else',
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
  const [suspendingId, setSuspendingId] = useState(null)
  const [viewingRatingsFor, setViewingRatingsFor] = useState(null)

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

  const handleToggleSuspend = async (user) => {
    const nextSuspended = !user.isSuspended
    if (nextSuspended) {
      const confirmed = window.confirm(
        `Suspend ${user.username}? They'll be blocked from trading and messaging immediately, but can still log in and manage their collection.`,
      )
      if (!confirmed) return
    }

    setSuspendingId(user.id)
    setError('')
    try {
      await api.adminSetUserSuspended(token, user.id, nextSuspended)
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, isSuspended: nextSuspended } : u)))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not update this account.')
    } finally {
      setSuspendingId(null)
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
            <div key={user.id} className={`admin-user-row${user.isSuspended ? ' admin-user-suspended' : ''}`}>
              <span className="match-avatar"><AvatarIcon value={user.avatar} size={32} /></span>
              <span className="admin-user-text">
                <span className="match-name-row">
                  <strong>{user.username}</strong>
                  {user.isSuspended && <span className="trade-status-badge status-declined">Suspended</span>}
                </span>
                <span className="section-hint">{user.email || 'no email'} · joined {formatDate(user.createdAt)}</span>
                <RatingBadge rating={user.rating} onClick={() => setViewingRatingsFor(user)} />
              </span>
              {user.id === currentAccountId ? (
                <span className="admin-user-you">you</span>
              ) : (
                <span className="admin-user-actions">
                  <button
                    type="button"
                    className={`button small ${user.isSuspended ? 'secondary' : 'danger'}`}
                    disabled={suspendingId === user.id}
                    onClick={() => handleToggleSuspend(user)}
                  >
                    {suspendingId === user.id ? '…' : user.isSuspended ? 'Unsuspend' : 'Suspend'}
                  </button>
                  <button
                    type="button"
                    className="button danger small"
                    disabled={deletingId === user.id}
                    onClick={() => handleDelete(user)}
                  >
                    {deletingId === user.id ? 'Deleting…' : 'Delete'}
                  </button>
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {viewingRatingsFor && (
        <RatingsListModal
          token={token}
          accountId={viewingRatingsFor.id}
          username={viewingRatingsFor.username}
          onClose={() => setViewingRatingsFor(null)}
        />
      )}
    </>
  )
}

function AdminTradeCard({ trade, token }) {
  const { status } = trade
  const [viewingPhotoId, setViewingPhotoId] = useState(null)
  const [viewingRatingsFor, setViewingRatingsFor] = useState(null)

  return (
    <div className={`trade-card admin-trade-card trade-${status}`}>
      <div className="trade-card-header">
        <span className="trade-summary-text">
          <strong>{trade.from.username} ↔ {trade.to.username}</strong>
          <span className={`trade-status-badge status-${status}`}>{TRADE_STATUS_LABEL[status]}</span>
        </span>
      </div>

      <p className="section-hint">
        <RatingBadge rating={trade.from.rating} onClick={() => setViewingRatingsFor(trade.from)} />
        {trade.from.isSuspended && <span className="trade-status-badge status-declined">Suspended</span>}
        {' vs '}
        <RatingBadge rating={trade.to.rating} onClick={() => setViewingRatingsFor(trade.to)} />
        {trade.to.isSuspended && <span className="trade-status-badge status-declined">Suspended</span>}
      </p>

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

      {(trade.fromCash > 0 || trade.toCash > 0) && (
        <p className="section-hint">
          💵{trade.fromCash > 0 ? ` ${trade.from.username} added ${formatUSD(trade.fromCash)}` : ''}
          {trade.fromCash > 0 && trade.toCash > 0 ? ' · ' : ''}
          {trade.toCash > 0 ? `${trade.to.username} added ${formatUSD(trade.toCash)}` : ''}
        </p>
      )}

      {(trade.fromOffered.length > 0 || trade.toOffered.length > 0) ? (
        <div className="admin-trade-cards">
          {trade.fromOffered.length > 0 && (
            <div className="match-detail-col">
              <h3>{trade.from.username} offered</h3>
              <div className="card-chip-list">
                {trade.fromOffered.map((card) => (
                  <CardChip key={card.id} card={card} compact onViewPhoto={setViewingPhotoId} />
                ))}
              </div>
            </div>
          )}
          {trade.toOffered.length > 0 && (
            <div className="match-detail-col">
              <h3>{trade.to.username} offered</h3>
              <div className="card-chip-list">
                {trade.toOffered.map((card) => (
                  <CardChip key={card.id} card={card} compact onViewPhoto={setViewingPhotoId} />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <p className="trade-hint">No overlapping cards were recorded at the time this was proposed.</p>
      )}

      {viewingPhotoId && (
        <PhotoViewerModal
          token={token}
          itemId={viewingPhotoId}
          fetcher={api.adminFetchTradePhoto}
          onClose={() => setViewingPhotoId(null)}
        />
      )}

      {viewingRatingsFor && (
        <RatingsListModal
          token={token}
          accountId={viewingRatingsFor.id}
          username={viewingRatingsFor.username}
          onClose={() => setViewingRatingsFor(null)}
        />
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
            <AdminTradeCard key={trade.id} trade={trade} token={token} />
          ))}
        </div>
      )}
    </>
  )
}

function AdminReportCard({ report, token, onResolved }) {
  const [viewingChat, setViewingChat] = useState(false)
  const [resolving, setResolving] = useState(false)
  const [error, setError] = useState('')

  const handleResolve = async () => {
    setResolving(true)
    setError('')
    try {
      await api.adminResolveReport(token, report.id)
      onResolved(report.id)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not resolve this report.')
      setResolving(false)
    }
  }

  return (
    <div className={`trade-card admin-report-card report-${report.status}`}>
      <div className="trade-card-header">
        <span className="trade-summary-text">
          <strong>{report.trade.fromUsername} ↔ {report.trade.toUsername}</strong>
          <span className={`trade-status-badge status-${report.status === 'open' ? 'declined' : 'completed'}`}>
            {report.status === 'open' ? 'Open' : 'Resolved'}
          </span>
        </span>
      </div>

      <p className="section-hint">
        Reported by {report.reporter.username} ({report.reporter.email || 'no email'}) · {formatDateTime(report.createdAt)}
      </p>
      <p className="report-reason">{REPORT_REASON_LABEL[report.reason] ?? report.reason}</p>
      {report.description && <p className="report-description">{report.description}</p>}
      {report.lat != null && report.lng != null && (
        <p className="section-hint">
          📍{' '}
          <a
            href={`https://www.google.com/maps?q=${report.lat},${report.lng}`}
            target="_blank"
            rel="noreferrer"
          >
            {report.lat.toFixed(5)}, {report.lng.toFixed(5)}
          </a>
          {report.accuracyMeters != null ? ` (±${Math.round(report.accuracyMeters)}m)` : ''}
        </p>
      )}
      {report.status === 'resolved' && report.resolvedAt && (
        <p className="section-hint">Resolved {formatDateTime(report.resolvedAt)}</p>
      )}

      {error && <p className="form-error">{error}</p>}

      <div className="trade-actions">
        <button type="button" className="button secondary" onClick={() => setViewingChat(true)}>
          💬 View chat log
        </button>
        {report.status === 'open' && (
          <button type="button" className="button primary" disabled={resolving} onClick={handleResolve}>
            {resolving ? 'Resolving…' : 'Mark resolved'}
          </button>
        )}
      </div>

      {viewingChat && (
        <TradeChatModal token={token} tradeId={report.tradeId} readOnly onClose={() => setViewingChat(false)} />
      )}
    </div>
  )
}

function AdminReports({ token }) {
  const [reports, setReports] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .adminListReports(token)
      .then(({ reports: list }) => setReports(list))
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load reports.'))
  }, [token])

  const handleResolved = (reportId) => {
    setReports((prev) => prev.map((r) => (r.id === reportId ? { ...r, status: 'resolved', resolvedAt: Date.now() } : r)))
  }

  const openCount = reports?.filter((r) => r.status === 'open').length ?? 0

  return (
    <>
      <p className="view-subtitle">
        {reports ? `${openCount} open report${openCount === 1 ? '' : 's'} (${reports.length} total).` : 'Loading…'}
      </p>

      {error && <p className="form-error">{error}</p>}

      {reports && reports.length === 0 && <p className="trade-hint">No reports filed yet.</p>}

      {reports && reports.length > 0 && (
        <div className="trade-list">
          {reports.map((report) => (
            <AdminReportCard key={report.id} report={report} token={token} onResolved={handleResolved} />
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
        <button
          type="button"
          className={`admin-subtab${section === 'reports' ? ' active' : ''}`}
          onClick={() => setSection('reports')}
        >
          Reports
        </button>
      </div>

      {section === 'users' && <AdminUsers token={token} currentAccountId={currentAccountId} />}
      {section === 'trades' && <AdminTrades token={token} />}
      {section === 'reports' && <AdminReports token={token} />}
    </div>
  )
}
