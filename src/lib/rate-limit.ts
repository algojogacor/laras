/**
 * Lightweight in-memory rate limiter (sliding window).
 * Use for auth + generation endpoints to mitigate brute-force / abuse.
 * State is per-process (sufficient for single-instance deploys; stack specifies local-memory caching).
 */

type Bucket = { count: number; resetAt: number }

const buckets = new Map<string, Bucket>()

// Periodically prune expired buckets to bound memory.
let lastPrune = Date.now()
function prune(now: number) {
  if (now - lastPrune < 60_000) return
  lastPrune = now
  for (const [k, b] of buckets) {
    if (b.resetAt <= now) buckets.delete(k)
  }
}

export type RateLimitResult = { ok: true } | { ok: false; retryAfter: number }

/**
 * @param key     identifier (e.g. `auth:${ip}` or `gen:${userId}`)
 * @param limit   max requests in the window
 * @param windowMs window size in ms
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now()
  prune(now)
  const existing = buckets.get(key)
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return { ok: true }
  }
  if (existing.count >= limit) {
    return { ok: false, retryAfter: Math.ceil((existing.resetAt - now) / 1000) }
  }
  existing.count += 1
  return { ok: true }
}

/** Extract a best-effort client identifier from a Request. */
export function clientKey(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for")
  if (fwd) return fwd.split(",")[0]!.trim()
  const real = req.headers.get("x-real-ip")
  if (real) return real.trim()
  return "unknown"
}

/** Convenience: apply a 429 response if rate-limited. */
export function rateLimitResponse(
  req: Request,
  scope: string,
  limit: number,
  windowMs: number
): Response | null {
  const ip = clientKey(req)
  const res = rateLimit(`${scope}:${ip}`, limit, windowMs)
  if (res.ok) return null
  return new Response(
    JSON.stringify({ error: "rate-limited", retryAfter: res.retryAfter }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(res.retryAfter),
      },
    }
  )
}
