import { useMemo, useState } from 'react'
import { useLocalStorage } from './hooks/useLocalStorage.js'
import { MOCK_COLLECTORS } from './data/mockCollectors.js'
import { buildMatches } from './utils/matching.js'
import Onboarding from './components/Onboarding.jsx'
import BottomNav from './components/BottomNav.jsx'
import HomeView from './components/HomeView.jsx'
import CollectionView from './components/CollectionView.jsx'
import MatchesView from './components/MatchesView.jsx'
import ProfileView from './components/ProfileView.jsx'
import './App.css'

export default function App() {
  const [profile, setProfile] = useLocalStorage('swapdeck.profile', null)
  const [haves, setHaves] = useLocalStorage('swapdeck.haves.v2', [])
  const [wants, setWants] = useLocalStorage('swapdeck.wants.v2', [])
  const [proposedIds, setProposedIds] = useLocalStorage('swapdeck.proposed', [])
  const [tab, setTab] = useState('home')

  const matches = useMemo(() => buildMatches(MOCK_COLLECTORS, haves, wants), [haves, wants])

  if (!profile) {
    return <Onboarding onComplete={setProfile} />
  }

  const resetCollection = () => {
    setHaves([])
    setWants([])
    setProposedIds([])
  }

  const propose = (collectorId) => {
    setProposedIds((prev) => (prev.includes(collectorId) ? prev : [...prev, collectorId]))
  }

  return (
    <div className="app-shell">
      <div className="app-frame">
        <main className="app-main">
          {tab === 'home' && (
            <HomeView profile={profile} haves={haves} wants={wants} matches={matches} onNavigate={setTab} />
          )}
          {tab === 'collection' && (
            <CollectionView haves={haves} wants={wants} setHaves={setHaves} setWants={setWants} />
          )}
          {tab === 'matches' && (
            <MatchesView
              matches={matches}
              hasHaves={haves.length > 0}
              hasWants={wants.length > 0}
              proposedIds={proposedIds}
              onPropose={propose}
            />
          )}
          {tab === 'profile' && (
            <ProfileView profile={profile} setProfile={setProfile} onReset={resetCollection} />
          )}
        </main>
        <BottomNav active={tab} onChange={setTab} matchBadge={matches.filter((m) => m.isMutual).length} />
      </div>
    </div>
  )
}
