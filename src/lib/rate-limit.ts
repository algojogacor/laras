/**
 * In-memory rate limiter (per-IP or per-user key).
 *
 * Uses a sliding-window counter per key. Suitable for single-instance deployments
 * (Vercel serverless, Docker, Koyeb single-replica). For multi-instance, upgrade
 * to Upstash Redis (@upstash/ratelimit) — the API below stays the same.
 *
 * Entries expire after the window completes; a periodic sweep prevents unbounded
 * growth from long-lived processes.
 */

type Bucket = {
  count: number
  resetAt: number // epoch ms
}

const buckets = new Map<string, Bucket>()

// Sweep expired entries every 5 minutes to prevent memory leak
const SWEEP_INTERVAL_MS = 5 * 60 * 1000
let lastSweep = Date.now()

function sweep(now: number) {
  if (now - lastSweep < SWEEP_INTERVAL_MS) return
  lastSweep = now
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key)
  }
}

export type RateLimitResult = {
  ok: boolean
  limit: number
  remaining: number
  resetAt: number
}

/**
 * Check rate limit for a key.
 *
 * @param key     Identifier (e.g., `ip:1.2.3.4` or `user:abc123`)
 * @param limit   Max requests allowed in the window
 * @param windowMs  Window duration in milliseconds
 * @returns       Result with ok flag + metadata for response headers
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now()
  sweep(now)

  const existing = buckets.get(key)

  if (!existing || existing.resetAt <= now) {
    // Fresh bucket
    const resetAt = now + windowMs
    buckets.set(key, { count: 1, resetAt })
    return { ok: true, limit, remaining: limit - 1, resetAt }
  }

  // Existing bucket within window
  if (existing.count >= limit) {
    return { ok: false, limit, remaining: 0, resetAt: existing.resetAt }
  }

  existing.count += 1
  return {
    ok: true,
    limit,
    remaining: limit - existing.count,
    resetAt: existing.resetAt,
  }
}

/**
 * Helper: extract client IP from request headers.
 * Falls back to "unknown" if no IP headers present (e.g., local dev).
 */
export function getClientIP(request: Request): string {
  const headers = request.headers
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    headers.get("cf-connecting-ip") ||
    "unknown"
  )
}

/**
 * Rate limit presets.
 * Tuned to be generous for normal use but block abuse.
 */
export const RATE_LIMITS = {
  // Auth: strict per-IP (prevent brute-force)
  auth: { limit: 10, windowMs: 60_000 }, // 10/min per IP
  signup: { limit: 5, windowMs: 60_000 }, // 5/min per IP (stricter — account creation)

  // LLM generation: per-user (prevent cost abuse)
  generate: { limit: 20, windowMs: 60_000 }, // 20/min per user
  summarize: { limit: 10, windowMs: 60_000 }, // 10/min per user

  // Generic API: per-IP
  api: { limit: 60, windowMs: 60_000 }, // 60/min per IP
} as const

/**
 * Apply rate limit to a request. Returns null if allowed, or a Response (429)
 * if the limit is exceeded.
 *
 * @example
 * const limited = applyRateLimit(request, "auth", `ip:${ip}`)
 * if (limited) return limited // 429 response
 */
export function applyRateLimit(
  request: Request,
  preset: keyof typeof RATE_LIMITS,
  key: string,
): Response | null {
  const { limit, windowMs } = RATE_LIMITS[preset]
  const result = rateLimit(key, limit, windowMs)

  if (result.ok) return null

  const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000)
  return new Response(
    JSON.stringify({
      error: "rate-limited",
      message: "Too many requests. Please slow down.",
      retryAfter,
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(retryAfter),
        "X-RateLimit-Limit": String(result.limit),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": String(Math.floor(result.resetAt / 1000)),
      },
    },
  )
}
