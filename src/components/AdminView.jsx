import { useEffect, useState } from 'react'
import AvatarIcon from './AvatarIcon.jsx'
import { api, ApiError } from '../api/client.js'

function formatDate(ts) {
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function AdminView({ token, currentAccountId }) {
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
    <div className="view">
      <h1>Admin</h1>
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
    </div>
  )
}
