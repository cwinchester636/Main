import { useCallback, useEffect, useState } from 'react'
import { useLocalStorage } from './hooks/useLocalStorage.js'
import { api, ApiError } from './api/client.js'
import Onboarding from './components/Onboarding.jsx'
import BottomNav from './components/BottomNav.jsx'
import HomeView from './components/HomeView.jsx'
import CollectionView from './components/CollectionView.jsx'
import MatchesView from './components/MatchesView.jsx'
import TradesView from './components/TradesView.jsx'
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
  const [globalError, setGlobalError] = useState('')
  const [tab, setTab] = useState('home')

  const loadEverything = useCallback(async (activeToken) => {
    try {
      const [collection, matchData, tradeData] = await Promise.all([
        api.getCollection(activeToken),
        api.getMatches(activeToken),
        api.getTrades(activeToken),
      ])
      setHaves(collection.haves)
      setWants(collection.wants)
      setMatches(matchData.matches)
      setTrades(tradeData)
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

  const addCard = async (listType, card) => {
    await api.addCollectionItem(token, listType, card)
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

  const logOut = () => {
    setToken(null)
    setAccount(null)
    setAuthStatus('anonymous')
  }

  const proposeTrade = async (toAccountId) => {
    await api.proposeTrade(token, toAccountId)
    const tradeData = await api.getTrades(token)
    setTrades(tradeData)
  }

  const respondToTrade = async (tradeId, action) => {
    await api.respondToTrade(token, tradeId, action)
    const tradeData = await api.getTrades(token)
    setTrades(tradeData)
  }

  const confirmTrade = async (tradeId) => {
    await api.confirmTrade(token, tradeId)
    const tradeData = await api.getTrades(token)
    setTrades(tradeData)
  }

  const proposedAccountIds = trades.sent
    .filter((t) => t.status === 'pending' || t.status === 'accepted' || t.status === 'completed')
    .map((t) => t.counterparty.id)
  const tradeBadge = trades.received.filter((t) => t.status === 'pending').length

  return (
    <div className="app-shell">
      <div className="app-frame">
        {globalError && (
          <div className="global-error">
            {globalError}
            <button type="button" className="link-button" onClick={() => loadEverything(token)}>Retry</button>
          </div>
        )}
        <main className="app-main">
          {tab === 'home' && (
            <HomeView account={account} haves={haves} wants={wants} matches={matches} onNavigate={setTab} />
          )}
          {tab === 'collection' && (
            <CollectionView haves={haves} wants={wants} onAdd={addCard} onRemove={removeCard} />
          )}
          {tab === 'matches' && (
            <MatchesView
              matches={matches}
              hasHaves={haves.length > 0}
              hasWants={wants.length > 0}
              proposedAccountIds={proposedAccountIds}
              onPropose={proposeTrade}
            />
          )}
          {tab === 'trades' && (
            <TradesView trades={trades} onRespond={respondToTrade} onConfirm={confirmTrade} />
          )}
          {tab === 'profile' && (
            <ProfileView account={account} onUpdate={updateProfile} onLogOut={logOut} />
          )}
        </main>
        <BottomNav
          active={tab}
          onChange={setTab}
          matchBadge={matches.filter((m) => m.isMutual).length}
          tradeBadge={tradeBadge}
        />
      </div>
    </div>
  )
}
