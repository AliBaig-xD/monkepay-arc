/** Fixed-window, in-memory rate limiter keyed by client IP. Fine for a single instance. */
export function rateLimit({ windowMs, max }: { windowMs: number; max: number }) {
  const hits = new Map<string, { n: number; reset: number }>()
  setInterval(() => {
    const now = Date.now()
    for (const [k, v] of hits) if (v.reset <= now) hits.delete(k)
  }, windowMs).unref()
  return (key: string) => {
    const now = Date.now()
    const h = hits.get(key)
    if (!h || h.reset <= now) { hits.set(key, { n: 1, reset: now + windowMs }); return true }
    h.n++
    return h.n <= max
  }
}
