import { cookies } from "next/headers"
import {
  refreshSession,
  setSessionCookie,
  setRefreshCookie,
  clearSessionCookie,
  REFRESH_COOKIE_NAME,
} from "@/lib/auth"
import { createCsrfToken } from "@/lib/csrf"
import { applyRateLimit, getClientIP } from "@/lib/rate-limit"
import { safeNextResponse } from "@/lib/authorization"

/**
 * POST /api/auth/refresh
 *
 * Refresh token rotation endpoint. Reads the `laras_refresh` httpOnly cookie,
 * verifies it against the database-stored refresh token version, and if valid,
 * issues a new session token, a new refresh token, and a fresh CSRF token.
 *
 * On failure (expired, revoked, suspended user, or tampered token), all auth
 * cookies are cleared and a 401 is returned.
 *
 * Rate-limited per IP using the "auth" preset (10 req/min).
 */
export async function POST(request: Request) {
  // 1. Rate limit: prevent refresh-token brute-forcing
  const limited = applyRateLimit(request, "auth", `refresh:${getClientIP(request)}`)
  if (limited) return limited

  try {
    // 2. Read refresh token from the httpOnly cookie
    const cookieStore = await cookies()
    const refreshToken = cookieStore.get(REFRESH_COOKIE_NAME)?.value

    if (!refreshToken) {
      const response = safeNextResponse({ error: "no-refresh-token" }, { status: 401 })
      await clearSessionCookie()
      return response
    }

    // 3. Verify the refresh token against the DB version and rotate
    const tokens = await refreshSession(refreshToken)
    if (!tokens) {
      // Invalid, expired, revoked, or suspended user — clear everything
      const response = safeNextResponse({ error: "invalid-refresh-token" }, { status: 401 })
      await clearSessionCookie()
      return response
    }

    // 4. Set new cookies (session + refresh rotation)
    await setSessionCookie(tokens.sessionToken)
    await setRefreshCookie(tokens.refreshToken)

    // 5. Issue a fresh CSRF token for subsequent mutation requests
    const csrfToken = await createCsrfToken()

    // 6. Return success with CSRF token in header
    const response = safeNextResponse({ ok: true })
    response.headers.set("X-CSRF-Token", csrfToken)
    return response
  } catch (error) {
    console.error("[refresh] Unexpected error:", (error as Error).message)
    const response = safeNextResponse({ error: "internal-error" }, { status: 500 })
    await clearSessionCookie()
    return response
  }
}

/**
 * GET /api/auth/refresh
 *
 * Returns a fresh CSRF token. The client can call this endpoint after page load
 * or after an expired CSRF cookie to acquire a new token for mutation requests.
 *
 * This endpoint is read-only and does not require CSRF validation itself.
 */
export async function GET() {
  const csrfToken = await createCsrfToken()
  const response = safeNextResponse({ ok: true })
  response.headers.set("X-CSRF-Token", csrfToken)
  return response
}
