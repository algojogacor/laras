import { NextResponse, type NextRequest } from "next/server"
import { jwtVerify } from "jose"

const COOKIE_NAME = "laras_session"
const CSRF_COOKIE = "laras_csrf"
const CSRF_HEADER = "x-csrf-token"

// ---------------------------------------------------------------------------
// Public paths — no authentication required
// ---------------------------------------------------------------------------
const PUBLIC_PATHS = ["/", "/login", "/signup"]
const PUBLIC_PREFIXES = ["/api/auth", "/api/locale", "/verify", "/u", "/api/health"]

// ---------------------------------------------------------------------------
// CSRF-exempt paths — mutations that establish the CSRF token
// ---------------------------------------------------------------------------
const CSRF_EXEMPT_PATHS = [
  "/api/auth/login",
  "/api/auth/signup",
  "/api/auth/reset/request",
  "/api/auth/reset/confirm",
  "/api/health",
]

// ---------------------------------------------------------------------------
// Auth endpoint paths — rate-limited
// ---------------------------------------------------------------------------
const AUTH_API_PREFIXES = ["/api/auth/login", "/api/auth/signup"]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET
  if (!secret) throw new Error("AUTH_SECRET is not set")
  return new TextEncoder().encode(secret)
}

async function isAuthenticated(req: NextRequest): Promise<{
  authed: boolean
  suspended: boolean
  userId?: string
}> {
  const token = req.cookies.get(COOKIE_NAME)?.value
  if (!token) return { authed: false, suspended: false }
  try {
    const { payload } = await jwtVerify(token, getSecret())
    return {
      authed: true,
      suspended: payload.suspended === true,
      userId: payload.sub as string,
    }
  } catch {
    return { authed: false, suspended: false }
  }
}

/**
 * In-memory rate limiting for auth endpoints at the middleware level.
 * Simple sliding-window counter per IP.
 */
const authRateLimitMap = new Map<string, { count: number; resetAt: number }>()
const AUTH_RATE_LIMIT = 10
const AUTH_RATE_WINDOW = 60_000 // 1 minute

// Periodic sweep to prevent unbounded memory growth (Edge runtime)
let _lastSweep = Date.now()
function sweepRateLimitMap() {
  const now = Date.now()
  if (now - _lastSweep < 300_000) return // sweep every 5 minutes
  _lastSweep = now
  for (const [key, entry] of authRateLimitMap) {
    if (entry.resetAt <= now) {
      authRateLimitMap.delete(key)
    }
  }
}

function checkAuthRateLimit(ip: string): { ok: boolean; retryAfter?: number } {
  const now = Date.now()
  const entry = authRateLimitMap.get(ip)

  if (!entry || entry.resetAt <= now) {
    authRateLimitMap.set(ip, { count: 1, resetAt: now + AUTH_RATE_WINDOW })
    return { ok: true }
  }

  if (entry.count >= AUTH_RATE_LIMIT) {
    return { ok: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) }
  }

  entry.count += 1
  return { ok: true }
}

/**
 * Validate CSRF token using double-submit cookie pattern.
 */
function validateCsrfToken(req: NextRequest): boolean {
  const cookieToken = req.cookies.get(CSRF_COOKIE)?.value
  const headerToken = req.headers.get(CSRF_HEADER)?.trim()

  if (!cookieToken || !headerToken) return false
  if (cookieToken.length < 32 || headerToken.length < 32) return false

  // Constant-time comparison using Edge-compatible TextEncoder
  try {
    const encoder = new TextEncoder()
    const a = encoder.encode(cookieToken)
    const b = encoder.encode(headerToken)
    if (a.length !== b.length) return false
    let diff = 0
    for (let i = 0; i < a.length; i++) {
      diff |= a[i] ^ b[i]
    }
    return diff === 0
  } catch {
    return false
  }
}

/**
 * Determine if a request requires CSRF validation.
 */
function requiresCsrf(req: NextRequest): boolean {
  const method = req.method.toUpperCase()
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return false

  const { pathname } = req.nextUrl
  return !CSRF_EXEMPT_PATHS.some((p) => pathname.startsWith(p))
}

// ---------------------------------------------------------------------------
// MAIN MIDDLEWARE EXPORT
// ---------------------------------------------------------------------------

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const method = req.method.toUpperCase()

  // Periodic sweep of stale rate-limit entries
  sweepRateLimitMap()

  // ------------------------------------------------------------------
  // 1. Set security headers that can't be set via next.config.ts
  // ------------------------------------------------------------------
  const response = NextResponse.next()

  // CSP header — must be set in middleware for dynamic nonces/scripts
  response.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self'",
      "connect-src 'self' https://*.supabase.co",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; ")
  )

  // Cross-Origin isolation headers
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin")
  response.headers.set("Cross-Origin-Resource-Policy", "same-origin")

  // ------------------------------------------------------------------
  // 2. Allow static/asset routes through unconditionally
  // ------------------------------------------------------------------
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/logo") ||
    pathname.startsWith("/robots.txt") ||
    pathname.startsWith("/sitemap.xml")
  ) {
    return response
  }

  // ------------------------------------------------------------------
  // 3. Rate-limit auth endpoints at the edge
  // ------------------------------------------------------------------
  const isAuthEndpoint = AUTH_API_PREFIXES.some((p) => pathname.startsWith(p))
  if (isAuthEndpoint && method === "POST") {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown"

    const rateLimitResult = checkAuthRateLimit(ip)
    if (!rateLimitResult.ok) {
      return NextResponse.json(
        { error: "rate-limited", message: "Too many requests. Please slow down." },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateLimitResult.retryAfter ?? 60),
            "Content-Type": "application/json",
          },
        }
      )
    }
  }

  // ------------------------------------------------------------------
  // 4. CSRF validation for mutation requests
  // ------------------------------------------------------------------
  if (requiresCsrf(req)) {
    if (!validateCsrfToken(req)) {
      return NextResponse.json(
        { error: "csrf-invalid", message: "CSRF token missing or invalid" },
        { status: 403 }
      )
    }
  }

  // ------------------------------------------------------------------
  // 5. Allow public routes through
  // ------------------------------------------------------------------
  if (PUBLIC_PATHS.includes(pathname)) return response
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) return response

  // ------------------------------------------------------------------
  // 6. Auth check for protected routes
  // ------------------------------------------------------------------
  const { authed, suspended } = await isAuthenticated(req)

  if (!authed) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 })
    }
    const url = req.nextUrl.clone()
    url.pathname = "/login"
    url.searchParams.set("next", pathname)
    return NextResponse.redirect(url)
  }

  // ------------------------------------------------------------------
  // 7. Block suspended users at the edge
  // ------------------------------------------------------------------
  if (suspended) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "forbidden", message: "Account suspended" },
        { status: 403 }
      )
    }
    // Redirect to a suspended notice page
    const url = req.nextUrl.clone()
    url.pathname = "/login"
    url.searchParams.set("suspended", "1")
    return NextResponse.redirect(url)
  }

  return response
}

// ---------------------------------------------------------------------------
// Matcher: only run middleware on app routes (exclude static assets)
// ---------------------------------------------------------------------------
export const config = {
  matcher: [
    /*
     * Match all paths except static assets and Next internals.
     */
    "/((?!_next/static|_next/image|favicon.ico|logo.svg|robots.txt|sitemap.xml).*)",
  ],
}
