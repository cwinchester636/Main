import { json } from '../utils.js'

const LIST_LIMIT = 50

export async function listNotifications(env, account) {
  const rows = await env.DB.prepare(
    `SELECT id, title, body, link_tab, read_at, created_at FROM notifications
     WHERE account_id = ? ORDER BY created_at DESC LIMIT ?`,
  )
    .bind(account.id, LIST_LIMIT)
    .all()

  const notifications = rows.results.map((row) => ({
    id: row.id,
    title: row.title,
    body: row.body,
    linkTab: row.link_tab,
    read: !!row.read_at,
    createdAt: row.created_at,
  }))
  const unreadCount = notifications.filter((n) => !n.read).length

  return json({ notifications, unreadCount })
}

// Marks everything as read in one shot rather than per-notification --
// opening the inbox (NotificationsModal.jsx) is what calls this, and
// "I looked at the list" is a reasonable definition of "seen" for a
// one-way activity feed like this one, same as most apps' notification
// inboxes.
export async function markNotificationsRead(env, account) {
  await env.DB.prepare('UPDATE notifications SET read_at = ? WHERE account_id = ? AND read_at IS NULL')
    .bind(Date.now(), account.id)
    .run()
  return json({ ok: true })
}
