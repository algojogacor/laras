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

  // Messaging / communication (Phase 10C)
  messaging: { limit: 30, windowMs: 60_000 }, // 30 messages/min per user

  // Connections / networking (Phase 10C)
  connections: { limit: 10, windowMs: 60_000 }, // 10 connection requests/min per user

  // Reports / moderation (Phase 10C)
  reports: { limit: 5, windowMs: 60_000 }, // 5 reports/min per user

  // Mentorship (Phase 10C)
  mentorship: { limit: 10, windowMs: 60_000 }, // 10 mentorship ops/min per user

  // Circles (Phase 10C)
  circles: { limit: 10, windowMs: 60_000 }, // 10 circle ops/min per user

  // Blocks (Phase 10C)
  blocks: { limit: 5, windowMs: 60_000 }, // 5 blocks/min per user

  // Appeals (Phase 10C)
  appeals: { limit: 5, windowMs: 3600_000 }, // 5 appeals/hour per user (stricter)
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

/**
 * Check if a key would be rate-limited without consuming a request.
 * Useful for pre-flight checks and UI indicators.
 *
 * @param key     Identifier (e.g., `user:abc123`)
 * @param preset  Rate limit preset to check against
 * @returns       true if the next request would be rate-limited
 */
export function isRateLimited(
  key: string,
  preset: keyof typeof RATE_LIMITS,
): boolean {
  const { limit, windowMs } = RATE_LIMITS[preset]
  const now = Date.now()
  sweep(now)

  const existing = buckets.get(key)
  if (!existing || existing.resetAt <= now) return false

  return existing.count >= limit
}

/** Reset all rate-limit buckets — for test cleanup only. */
export function resetRateLimitBuckets() {
  buckets.clear()
  lastSweep = Date.now()
}

/**
 * Generate standard rate limit response headers from a RateLimitResult.
 * Attach these to every API response for transparency and client-side throttling.
 */
export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.floor(result.resetAt / 1000)),
  }
}

/**
 * Apply rate limiting and return headers for inclusion in a normal response.
 * Returns null if rate-limited (caller should return 429), or headers if allowed.
 */
export function consumeRateLimit(
  preset: keyof typeof RATE_LIMITS,
  key: string,
): { headers: Record<string, string> } | null {
  const { limit, windowMs } = RATE_LIMITS[preset]
  const result = rateLimit(key, limit, windowMs)

  if (!result.ok) return null

  return { headers: rateLimitHeaders(result) }
}
