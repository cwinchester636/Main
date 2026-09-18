import { cardById } from '../data/cards.js'

// A "perfect" match is mutual: they have cards you want, AND you have cards
// they want, so an in-person trade needs no cash or shipping either way.
export function buildMatches(collectors, myHaves, myWants) {
  const haveSet = new Set(myHaves)
  const wantSet = new Set(myWants)

  return collectors
    .map((collector) => {
      const theyHaveYouWant = collector.haves.filter((id) => wantSet.has(id))
      const youHaveTheyWant = collector.wants.filter((id) => haveSet.has(id))
      const isMutual = theyHaveYouWant.length > 0 && youHaveTheyWant.length > 0
      const score = theyHaveYouWant.length + youHaveTheyWant.length

      return {
        collector,
        theyHaveYouWant: theyHaveYouWant.map(cardById),
        youHaveTheyWant: youHaveTheyWant.map(cardById),
        isMutual,
        score,
      }
    })
    .filter((match) => match.score > 0)
    .sort((a, b) => {
      if (a.isMutual !== b.isMutual) return a.isMutual ? -1 : 1
      if (b.score !== a.score) return b.score - a.score
      return a.collector.distanceMi - b.collector.distanceMi
    })
}
