import { cardById } from '../data/cards.js'

// Cards can come from the curated catalog or a live API search, each with
// its own id scheme — so "the same card" is identified by game + name
// rather than by id. That's an intentional simplification: two different
// printings of a card will match here, which is the right call for a
// trade-matcher (any Charizard for any Charizard is still a real trade).
export function matchKey(card) {
  return `${card.game}::${card.name.trim().toLowerCase()}`
}

function dedupeByKey(cards) {
  const seen = new Map()
  for (const card of cards) {
    const key = matchKey(card)
    if (!seen.has(key)) seen.set(key, card)
  }
  return [...seen.values()]
}

// A "perfect" match is mutual: they have cards you want, AND you have cards
// they want, so an in-person trade needs no cash or shipping either way.
export function buildMatches(collectors, myHaves, myWants) {
  const wantKeys = new Set(myWants.map(matchKey))

  return collectors
    .map((collector) => {
      const collectorHaves = collector.haves.map(cardById).filter(Boolean)
      const collectorWants = collector.wants.map(cardById).filter(Boolean)
      const collectorWantKeys = new Set(collectorWants.map(matchKey))

      const theyHaveYouWant = dedupeByKey(collectorHaves.filter((card) => wantKeys.has(matchKey(card))))
      const youHaveTheyWant = dedupeByKey(myHaves.filter((card) => collectorWantKeys.has(matchKey(card))))
      const isMutual = theyHaveYouWant.length > 0 && youHaveTheyWant.length > 0
      const score = theyHaveYouWant.length + youHaveTheyWant.length

      return { collector, theyHaveYouWant, youHaveTheyWant, isMutual, score }
    })
    .filter((match) => match.score > 0)
    .sort((a, b) => {
      if (a.isMutual !== b.isMutual) return a.isMutual ? -1 : 1
      if (b.score !== a.score) return b.score - a.score
      return a.collector.distanceMi - b.collector.distanceMi
    })
}
