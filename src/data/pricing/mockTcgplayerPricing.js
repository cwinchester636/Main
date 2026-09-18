// Mock pricing data, shaped like TCGplayer's real Pricing API response
// (marketPrice/lowPrice/midPrice/highPrice in USD) so swapping in the real
// thing later is a drop-in change. See README "Card pricing" section for
// why this isn't live TCGplayer data yet: scraping tcgplayer.com directly
// would violate their Terms of Service and doesn't work technically (no
// CORS support for browser fetches), and the real Pricing API requires a
// TCGplayer Developer account plus a backend to hold the client secret.
//
// Values below are illustrative estimates only, not real market prices.
const MOCK_MARKET_PRICE_USD = {
  // One Piece Card Game
  'op-luffy-leader': 14.99,
  'op-zoro': 3.25,
  'op-nami': 0.35,
  'op-sanji': 2.75,
  'op-chopper': 1.1,
  'op-robin': 4.5,
  'op-law-leader': 12.5,
  'op-shanks': 45,
  'op-ace': 18,
  'op-kaido': 20,
  'op-mihawk': 6,
  'op-hancock': 15,
  'op-yamato': 35,
  'op-katakuri': 22,
  'op-kid': 3.75,

  // Union Arena
  'ua-naruto': 28,
  'ua-sasuke': 4.25,
  'ua-tanjiro': 32,
  'ua-nezuko': 14,
  'ua-deku': 24,
  'ua-bakugo': 3.5,
  'ua-yuji': 26,
  'ua-gojo': 60,
  'ua-ichigo': 22,
  'ua-rukia': 3,
  'ua-lelouch': 18,
  'ua-cc': 9,
  'ua-luffy': 30,
  'ua-levi': 20,
  'ua-eren': 5.5,
}

const round2 = (n) => Math.round(n * 100) / 100

function buildEntry(marketPrice) {
  return {
    marketPrice,
    lowPrice: round2(marketPrice * 0.65),
    midPrice: round2(marketPrice * 0.92),
    highPrice: round2(marketPrice * 1.75),
    currency: 'USD',
  }
}

const MOCK_PRICES = Object.fromEntries(
  Object.entries(MOCK_MARKET_PRICE_USD).map(([id, market]) => [id, buildEntry(market)]),
)

export function getCardPrice(cardId) {
  return MOCK_PRICES[cardId] ?? null
}
