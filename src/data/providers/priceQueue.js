// A card list can render dozens of CardChips at once, each wanting a live
// price on mount — without this, that's dozens of simultaneous requests to
// a free, keyless public API. Caps how many price lookups run in parallel
// across the whole app; everything past that just waits its turn.
const MAX_CONCURRENT = 4
let active = 0
const queue = []

export function withPriceQueue(fn) {
  return new Promise((resolve, reject) => {
    const run = async () => {
      active++
      try {
        resolve(await fn())
      } catch (err) {
        reject(err)
      } finally {
        active--
        queue.shift()?.()
      }
    }
    if (active < MAX_CONCURRENT) run()
    else queue.push(run)
  })
}
