import { useCallback, useEffect, useState } from 'react'
import { useLocalStorage } from './hooks/useLocalStorage.js'
import { api, ApiError } from './api/client.js'
import Onboarding from './components/Onboarding.jsx'
import BottomNav from './components/BottomNav.jsx'
import HomeView from './components/HomeView.jsx'
import CollectionView from './components/CollectionView.jsx'
import MatchesView from './components/MatchesView.jsx'
import TradesView from './components/TradesView.jsx'
import EventsView from './components/EventsView.jsx'
import NotificationsModal from './components/NotificationsModal.jsx'
import AdminView from './components/AdminView.jsx'
import ProfileView from './components/ProfileView.jsx'
import './App.css'

export default function App() {
  const [token, setToken] = useLocalStorage('swapdeck.token', null)
  const [account, setAccount] = useState(null)
  const [authStatus, setAuthStatus] = useState('checking') // checking | authed | anonymous
  const [haves, setHaves] = useState([])
  const [wants, setWants] = useState([])
  const [matches, setMatches] = useState([])
  const [trades, setTrades] = useState({ sent: [], received: [] })
  const [events, setEvents] = useState([])
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [globalError, setGlobalError] = useState('')
  const [tab, setTab] = useState('home')

  const loadEverything = useCallback(async (activeToken) => {
    try {
      const [collection, matchData, tradeData, eventData, notificationData] = await Promise.all([
        api.getCollection(activeToken),
        api.getMatches(activeToken),
        api.getTrades(activeToken),
        api.getEvents(activeToken),
        api.getNotifications(activeToken),
      ])
      setHaves(collection.haves)
      setWants(collection.wants)
      setMatches(matchData.matches)
      setTrades(tradeData)
      setEvents(eventData.events)
      setNotifications(notificationData.notifications)
      setUnreadCount(notificationData.unreadCount)
      setGlobalError('')
    } catch (err) {
      setGlobalError(err instanceof ApiError ? err.message : 'Something went wrong loading your data.')
    }
  }, [])

  useEffect(() => {
    if (!token) {
      setAuthStatus('anonymous')
      return
    }
    api
      .getMe(token)
      .then(({ account: acct }) => {
        setAccount(acct)
        setAuthStatus('authed')
        return loadEverything(token)
      })
      .catch(() => {
        setToken(null)
        setAuthStatus('anonymous')
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (authStatus === 'checking') {
    return (
      <div className="app-shell">
        <div className="app-frame app-loading">Loading…</div>
      </div>
    )
  }

  if (authStatus === 'anonymous' || !account) {
    return (
      <Onboarding
        onComplete={({ account: acct, token: newToken }) => {
          setAccount(acct)
          setToken(newToken)
          setAuthStatus('authed')
          loadEverything(newToken)
        }}
      />
    )
  }

  const addCard = async (listType, card, photo) => {
    await api.addCollectionItem(token, listType, card, photo)
    await loadEverything(token)
  }

  const removeCard = async (listType, itemId) => {
    await api.removeCollectionItem(token, itemId)
    await loadEverything(token)
  }

  const updateProfile = async (updates) => {
    const { account: updated } = await api.updateMe(token, updates)
    setAccount(updated)
  }

  // Re-fetches rather than trusting a locally-computed isPro -- after a
  // purchase, the source of truth is what the server just verified against
  // RevenueCat (see api.verifyProPurchase / PaywallModal), not anything the
  // client concluded on its own.
  const refreshAccount = async () => {
    const { account: fresh } = await api.getMe(token)
    setAccount(fresh)
  }

  // Tapping "Log out" is the one thing that should actually end a session
  // server-side (see worker/src/routes/accounts.js logOut) -- everything
  // else (closing the app, clearing local storage some other way) leaves
  // this device's session valid, so reopening the app later doesn't
  // require signing in again. Best-effort: if the request fails (offline,
  // etc.), the local session still clears -- someone who tapped "Log out"
  // should never be stuck looking logged in.
  const logOut = () => {
    api.logOut(token).catch(() => {})
    setToken(null)
    setAccount(null)
    setAuthStatus('anonymous')
  }

  // Called after ProfileView has already told the server to delete the
  // account (see api.deleteMyAccount) -- this just clears local state so
  // the app falls back to Onboarding, same as logOut but with no session
  // left on the server to end.
  const deleteAccount = () => {
    setToken(null)
    setAccount(null)
    setAuthStatus('anonymous')
  }

  const proposeTrade = async (toAccountId, cashAmount) => {
    await api.proposeTrade(token, toAccountId, cashAmount)
    const tradeData = await api.getTrades(token)
    setTrades(tradeData)
  }

  const respondToTrade = async (tradeId, action, cashAmount) => {
    await api.respondToTrade(token, tradeId, action, cashAmount)
    const tradeData = await api.getTrades(token)
    setTrades(tradeData)
  }

  const confirmTrade = async (tradeId) => {
    await api.confirmTrade(token, tradeId)
    const tradeData = await api.getTrades(token)
    setTrades(tradeData)
  }

  // Refetches rather than inserting the created event locally -- the create
  // response doesn't include the server-computed distanceMiles/proximity
  // fields listEvents adds, and re-fetching is the simplest way to get
  // those without duplicating that computation on the client.
  const addEvent = async () => {
    const eventData = await api.getEvents(token)
    setEvents(eventData.events)
  }

  const removeEvent = (eventId) => {
    setEvents((prev) => prev.filter((e) => e.id !== eventId))
  }

  // Shared by both blocking (Matches/Trades) and unblocking (Profile's
  // blocked-users list) -- same toggle endpoint either way. Refetches
  // matches and trades since blocking affects both: the blocked account
  // stops appearing as a match, and any trade either side had pending
  // with the other gets auto-declined server-side.
  const toggleBlock = async (accountId) => {
    const result = await api.toggleBlock(token, accountId)
    const [matchData, tradeData] = await Promise.all([api.getMatches(token), api.getTrades(token)])
    setMatches(matchData.matches)
    setTrades(tradeData)
    return result
  }

  // Opening the inbox is treated as "seen" for the whole list, same as most
  // notification inboxes — see worker/src/routes/notifications.js
  // markNotificationsRead. The badge clears immediately rather than waiting
  // for a round trip; the mark-read call still happens, it just doesn't
  // block the UI from feeling instant.
  const openNotifications = () => {
    setNotificationsOpen(true)
    setUnreadCount(0)
    api.markNotificationsRead(token).catch(() => {})
  }

  const proposedAccountIds = trades.sent
    .filter((t) => t.status === 'pending' || t.status === 'accepted' || t.status === 'completed')
    .map((t) => t.counterparty.id)
  const tradeBadge = trades.received.filter((t) => t.status === 'pending').length

  return (
    <div className="app-shell">
      <div className="app-frame">
        <div className="app-header">
          <button type="button" className="bell-button" onClick={openNotifications} aria-label="Notifications">
            🔔
            {unreadCount > 0 && <span className="nav-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
          </button>
        </div>
        {globalError && (
          <div className="global-error">
            {globalError}
            <button type="button" className="link-button" onClick={() => loadEverything(token)}>Retry</button>
          </div>
        )}
        {account.isSuspended && (
          <div className="global-error">
            Your account has been suspended by an admin. You can still log in and manage your collection, but can't
            trade or message other users.
          </div>
        )}
        <main className="app-main">
          {tab === 'home' && (
            <HomeView account={account} haves={haves} wants={wants} matches={matches} onNavigate={setTab} />
          )}
          {tab === 'collection' && (
            <CollectionView
              haves={haves}
              wants={wants}
              onAdd={addCard}
              onRemove={removeCard}
              token={token}
              account={account}
              onPurchased={refreshAccount}
            />
          )}
          {tab === 'matches' && (
            <MatchesView
              matches={matches}
              hasHaves={haves.length > 0}
              hasWants={wants.length > 0}
              proposedAccountIds={proposedAccountIds}
              onPropose={proposeTrade}
              onBlock={toggleBlock}
              token={token}
              isSuspended={account.isSuspended}
            />
          )}
          {tab === 'trades' && (
            <TradesView
              trades={trades}
              matches={matches}
              onRespond={respondToTrade}
              onConfirm={confirmTrade}
              onBlock={toggleBlock}
              token={token}
              currentAccountId={account.id}
              isSuspended={account.isSuspended}
            />
          )}
          {tab === 'events' && (
            <EventsView
              events={events}
              token={token}
              currentAccountId={account.id}
              isAdmin={account.isAdmin}
              onCreated={addEvent}
              onDeleted={removeEvent}
            />
          )}
          {tab === 'admin' && account.isAdmin && (
            <AdminView token={token} currentAccountId={account.id} />
          )}
          {tab === 'profile' && (
            <ProfileView
              account={account}
              token={token}
              onUpdate={updateProfile}
              onLogOut={logOut}
              onDeleteAccount={deleteAccount}
              onToggleBlock={toggleBlock}
              onPurchased={refreshAccount}
            />
          )}
        </main>
        <BottomNav
          active={tab}
          onChange={setTab}
          matchBadge={matches.filter((m) => m.isMutual).length}
          tradeBadge={tradeBadge}
          showAdmin={account.isAdmin}
        />
      </div>

      {notificationsOpen && (
        <NotificationsModal
          notifications={notifications}
          onClose={() => setNotificationsOpen(false)}
          onNavigate={setTab}
        />
      )}
    </div>
  )
}
