/**
 * Client-side fetch wrapper that automatically attaches the CSRF token.
 *
 * Uses the double-submit cookie pattern: reads the laras_csrf cookie (which is
 * intentionally non-httpOnly — see src/lib/csrf.ts) and sends its value in the
 * X-CSRF-Token header on mutation requests.
 *
 * Only import this in client components / browser code.
 */

const CSRF_COOKIE = "laras_csrf"
const CSRF_HEADER = "X-CSRF-Token"
const MUTATION_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"])

function getCsrfTokenFromCookie(): string | null {
  if (typeof document === "undefined") return null
  const match = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${CSRF_COOKIE}=([^;]*)`)
  )
  return match ? match[1] : null
}

export async function apiClient(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const method = (options.method || "GET").toUpperCase()
  const needsCsrf = MUTATION_METHODS.has(method)

  const headers = new Headers(options.headers)

  // Set default Content-Type for requests with a body
  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json")
  }

  // Attach CSRF token from cookie for mutation requests
  if (needsCsrf) {
    const csrfToken = getCsrfTokenFromCookie()
    if (csrfToken) {
      headers.set(CSRF_HEADER, csrfToken)
    }
  }

  return fetch(url, {
    ...options,
    method,
    headers,
    credentials: "include",
  })
}

export { getCsrfTokenFromCookie, CSRF_COOKIE, CSRF_HEADER }
