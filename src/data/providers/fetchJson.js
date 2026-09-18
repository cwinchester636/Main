// Shared fetch wrapper: applies a timeout, merges it with a caller-provided
// AbortSignal (so a stale in-flight search can be cancelled when the user
// keeps typing), and normalizes network/HTTP failures into one error type
// the UI can catch and show a friendly "live search unavailable" message for.
export class LiveSearchError extends Error {
  constructor(message, cause) {
    super(message)
    this.name = 'LiveSearchError'
    this.cause = cause
  }
}

export async function fetchJson(url, { signal, timeoutMs = 8000 } = {}) {
  const controller = new AbortController()
  let timedOut = false
  const timer = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, timeoutMs)

  const onCallerAbort = () => controller.abort()
  if (signal) {
    if (signal.aborted) controller.abort()
    else signal.addEventListener('abort', onCallerAbort)
  }

  try {
    const res = await fetch(url, { signal: controller.signal })
    if (!res.ok && res.status !== 400 && res.status !== 404) {
      throw new LiveSearchError(`Request failed with status ${res.status}`)
    }
    return await res.json()
  } catch (err) {
    if (err.name === 'AbortError') {
      if (timedOut) throw new LiveSearchError('Request timed out', err)
      throw err // caller-initiated abort — not a real failure, let it propagate as-is
    }
    if (err instanceof LiveSearchError) throw err
    throw new LiveSearchError('Network request failed', err)
  } finally {
    clearTimeout(timer)
    if (signal) signal.removeEventListener('abort', onCallerAbort)
  }
}
