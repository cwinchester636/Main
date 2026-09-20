import { resolveCardPrice } from '../hooks/useCardPrice.js'

// "More than 15% apart" — the gap between the two sides' totals, relative
// to whichever side is worth more. A completely one-sided trade (one side
// priced at $0) always counts as imbalanced.
export const DISPARITY_THRESHOLD = 0.15

async function totalValue(cards) {
  const prices = await Promise.all(cards.map((card) => resolveCardPrice(card.sourceId ?? card.id)))
  return prices.reduce((sum, price) => sum + (price?.amount ?? 0), 0)
}

// Compares what's coming in ("theirCards", e.g. theyHaveYouWant) against
// what's going out ("yourCards", youHaveTheyWant) using the same live
// prices CardChip already shows. Cards with no known price simply don't
// count toward either total — this only ever warns when there's *known*
// value backing the disparity, never on a guess. Returns null when there's
// nothing priced on either side to compare at all.
export async function checkValueDisparity(theirCards, yourCards) {
  const [theirValue, yourValue] = await Promise.all([totalValue(theirCards), totalValue(yourCards)])
  if (theirValue === 0 && yourValue === 0) return null

  const larger = Math.max(theirValue, yourValue)
  const disparity = (larger - Math.min(theirValue, yourValue)) / larger

  return { theirValue, yourValue, disparity, imbalanced: disparity > DISPARITY_THRESHOLD }
}
