import { useEffect, useRef, useState } from 'react'
import { searchCards } from '../data/cards.js'
import { LIVE_PROVIDERS, LIVE_GAME_IDS } from '../data/providers/index.js'

const MIN_LIVE_QUERY_LENGTH = 2
const DEBOUNCE_MS = 350

// Merges the always-available curated catalog with live results from the
// Pokemon/MTG/Yu-Gi-Oh APIs. Sports, One Piece, and Union Arena have no
// integrated live source, so they always come from the curated catalog.
// While a live search is in flight (or hasn't run yet), the curated cards
// for pokemon/mtg/yugioh are shown as an instant fallback so the picker is
// never empty; once live results land they take over for those games.
export function useCardSearch(query, gameFilter) {
  const [liveResults, setLiveResults] = useState([])
  const [liveStatus, setLiveStatus] = useState('idle') // idle | loading | done | error
  const controllerRef = useRef(null)

  const curatedResults = searchCards(query, gameFilter)

  useEffect(() => {
    controllerRef.current?.abort()

    const trimmed = query.trim()
    const gamesToQuery = gameFilter === 'all' ? LIVE_GAME_IDS : LIVE_GAME_IDS.filter((g) => g === gameFilter)

    if (trimmed.length < MIN_LIVE_QUERY_LENGTH || gamesToQuery.length === 0) {
      setLiveResults([])
      setLiveStatus('idle')
      return
    }

    const controller = new AbortController()
    controllerRef.current = controller
    setLiveStatus('loading')

    const timer = setTimeout(async () => {
      const settled = await Promise.allSettled(
        gamesToQuery.map((game) => LIVE_PROVIDERS[game](trimmed, { signal: controller.signal })),
      )
      if (controller.signal.aborted) return

      const succeeded = settled.filter((r) => r.status === 'fulfilled')
      if (succeeded.length === 0) {
        // Every provider rejected — log the real reasons rather than just
        // showing the generic "unavailable" message, since the three live
        // APIs have never been reachable from this project's dev sandbox
        // and this is the only way to see what actually broke for a real
        // user (network error, CORS, rate limit, etc).
        settled.forEach((r, i) => console.error(`live search failed for ${gamesToQuery[i]}:`, r.reason))
        setLiveStatus('error')
        setLiveResults([])
        return
      }
      setLiveResults(succeeded.flatMap((r) => r.value))
      setLiveStatus('done')
    }, DEBOUNCE_MS)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [query, gameFilter])

  const liveGameSet = new Set(LIVE_GAME_IDS)
  const nonLiveCurated = curatedResults.filter((card) => !liveGameSet.has(card.game))
  const liveGameCurated = curatedResults.filter((card) => liveGameSet.has(card.game))

  const results = [...nonLiveCurated, ...(liveStatus === 'done' ? liveResults : liveGameCurated)]

  return { results, liveStatus }
}
