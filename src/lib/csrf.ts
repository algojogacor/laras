import crypto from "crypto"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

const CSRF_COOKIE = "laras_csrf"
const CSRF_HEADER = "X-CSRF-Token"
const CSRF_TOKEN_BYTES = 32
const CSRF_MAX_AGE = 60 * 60 * 24 // 24 hours

/**
 * Generate a cryptographically random CSRF token.
 * Uses crypto.randomBytes for strong entropy.
 */
export function generateCsrfToken(): string {
  return crypto.randomBytes(CSRF_TOKEN_BYTES).toString("hex")
}

/**
 * Set the CSRF token as an httpOnly cookie and return it for the response header.
 *
 * Double-submit cookie pattern:
 * - Cookie is httpOnly (inaccessible to JS, protected from XSS)
 * - Token is also returned in response header for client to store
 * - Client sends token in X-CSRF-Token header on subsequent requests
 * - Server compares cookie value with header value
 */
export async function setCsrfCookie(token: string): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(CSRF_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: CSRF_MAX_AGE,
  })
}

/**
 * Clear the CSRF cookie.
 */
export async function clearCsrfCookie(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(CSRF_COOKIE)
}

/**
 * Generate a new CSRF token and set it as a cookie.
 * Returns the token so it can be included in the response header.
 */
export async function createCsrfToken(): Promise<string> {
  const token = generateCsrfToken()
  await setCsrfCookie(token)
  return token
}

/**
 * Read the CSRF token from the request.
 * Checks both cookie and X-CSRF-Token header.
 */
export async function readCsrfToken(request: Request): Promise<{
  cookieToken: string | undefined
  headerToken: string | undefined
}> {
  // Read from cookie
  let cookieToken: string | undefined
  try {
    const cookieStore = await cookies()
    cookieToken = cookieStore.get(CSRF_COOKIE)?.value
  } catch {
    // cookies() may throw if called outside a request context
  }

  // Read from header
  const headerToken = request.headers.get(CSRF_HEADER)?.trim() || undefined

  return { cookieToken, headerToken }
}

/**
 * Validate CSRF token using double-submit cookie pattern.
 *
 * Compares the token from the CSRF cookie with the token from the
 * X-CSRF-Token header. Both must be present and identical.
 *
 * Returns true if valid, false otherwise.
 */
export async function validateCsrfToken(request: Request): Promise<boolean> {
  const { cookieToken, headerToken } = await readCsrfToken(request)
  if (!cookieToken || !headerToken) return false
  if (cookieToken.length !== CSRF_TOKEN_BYTES * 2) return false
  if (headerToken.length !== CSRF_TOKEN_BYTES * 2) return false

  // Constant-time comparison to prevent timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(cookieToken),
    Buffer.from(headerToken)
  )
}

/**
 * Check whether a request needs CSRF validation.
 *
 * Exempted methods: GET, HEAD, OPTIONS (safe/read-only)
 * Exempted paths: login, signup, health check
 *
 * All other mutation requests (POST, PATCH, PUT, DELETE) need CSRF.
 */
export function requiresCsrf(request: Request): boolean {
  const method = request.method.toUpperCase()

  // Safe methods are exempt
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
    return false
  }

  const url = new URL(request.url)
  const pathname = url.pathname

  // Exempt auth endpoints that establish the CSRF token
  const exemptPaths = [
    "/api/auth/login",
    "/api/auth/signup",
    "/api/auth/reset/request",
    "/api/auth/reset/confirm",
    "/api/health",
  ]

  if (exemptPaths.some((p) => pathname.startsWith(p))) {
    return false
  }

  return true
}

/**
 * Apply CSRF validation to a request.
 *
 * Returns null if CSRF check passes or is not required.
 * Returns a 403 Response if CSRF check fails.
 */
export async function applyCsrf(request: Request): Promise<Response | null> {
  if (!requiresCsrf(request)) return null

  const valid = await validateCsrfToken(request)
  if (!valid) {
    return NextResponse.json(
      { error: "csrf-invalid", message: "CSRF token missing or invalid" },
      { status: 403 }
    )
  }

  return null
}

export { CSRF_COOKIE, CSRF_HEADER }
