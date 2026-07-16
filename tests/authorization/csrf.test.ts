/// <reference types="bun-types" />

import { beforeEach, describe, expect, test } from "bun:test"
import {
  generateCsrfToken,
  validateCsrfToken,
  requiresCsrf,
  CSRF_HEADER,
} from "@/lib/csrf"
import { testRuntime, resetTestRuntime } from "./test-runtime"

// Build a minimal mock Request for server-side CSRF testing.
// Cookie is simulated via testRuntime.csrfCookieValue (the mock for
// next/headers cookies() reads this global).
function mockRequest(opts: {
  method?: string
  pathname?: string
  headerValue?: string | null
  origin?: string | null
}): Request {
  const {
    method = "POST",
    pathname = "/api/profile",
    headerValue,
    origin = "https://app.example.com",
  } = opts

  const headers = new Headers()
  headers.set("host", "app.example.com")
  if (origin) headers.set("origin", origin)
  if (headerValue !== undefined && headerValue !== null) {
    headers.set(CSRF_HEADER, headerValue)
  }

  return new Request(`https://app.example.com${pathname}`, {
    method,
    headers,
  })
}

// Helper to set the CSRF cookie in the mocked cookie store
function setCsrfCookie(value: string | null) {
  testRuntime.csrfCookieValue = value ?? undefined
}

describe("CSRF — token generation", () => {
  test("generates a 64-character hex token", () => {
    const token = generateCsrfToken()
    expect(token).toMatch(/^[0-9a-f]{64}$/)
  })

  test("generates unique tokens on each call", () => {
    const a = generateCsrfToken()
    const b = generateCsrfToken()
    const c = generateCsrfToken()
    expect(a).not.toBe(b)
    expect(b).not.toBe(c)
    expect(a).not.toBe(c)
  })
})

describe("CSRF — requiresCsrf", () => {
  test("GET is exempt", () => {
    expect(requiresCsrf(mockRequest({ method: "GET" }))).toBe(false)
  })

  test("HEAD is exempt", () => {
    expect(requiresCsrf(mockRequest({ method: "HEAD" }))).toBe(false)
  })

  test("OPTIONS is exempt", () => {
    expect(requiresCsrf(mockRequest({ method: "OPTIONS" }))).toBe(false)
  })

  test("POST requires CSRF", () => {
    expect(requiresCsrf(mockRequest({ method: "POST" }))).toBe(true)
  })

  test("PUT requires CSRF", () => {
    expect(requiresCsrf(mockRequest({ method: "PUT" }))).toBe(true)
  })

  test("PATCH requires CSRF", () => {
    expect(requiresCsrf(mockRequest({ method: "PATCH" }))).toBe(true)
  })

  test("DELETE requires CSRF", () => {
    expect(requiresCsrf(mockRequest({ method: "DELETE" }))).toBe(true)
  })

  test("login is exempt", () => {
    expect(requiresCsrf(mockRequest({ method: "POST", pathname: "/api/auth/login" }))).toBe(false)
  })

  test("signup is exempt", () => {
    expect(requiresCsrf(mockRequest({ method: "POST", pathname: "/api/auth/signup" }))).toBe(false)
  })

  test("health is exempt", () => {
    expect(requiresCsrf(mockRequest({ method: "POST", pathname: "/api/health" }))).toBe(false)
  })

  test("profile POST is not exempt", () => {
    expect(requiresCsrf(mockRequest({ method: "POST", pathname: "/api/profile" }))).toBe(true)
  })
})

describe("CSRF — validateCsrfToken (double-submit)", () => {
  const validToken = "a".repeat(64) // 64 hex characters

  beforeEach(() => {
    resetTestRuntime()
  })

  test("valid cookie + matching header → pass", async () => {
    setCsrfCookie(validToken)
    const req = mockRequest({ headerValue: validToken })
    expect(await validateCsrfToken(req)).toBe(true)
  })

  test("missing cookie → fail", async () => {
    setCsrfCookie(null)
    const req = mockRequest({ headerValue: validToken })
    expect(await validateCsrfToken(req)).toBe(false)
  })

  test("missing header → fail", async () => {
    setCsrfCookie(validToken)
    const req = mockRequest({ headerValue: null })
    expect(await validateCsrfToken(req)).toBe(false)
  })

  test("both missing → fail", async () => {
    setCsrfCookie(null)
    const req = mockRequest({ headerValue: null })
    expect(await validateCsrfToken(req)).toBe(false)
  })

  test("malformed cookie (too short) → fail", async () => {
    setCsrfCookie("abc")
    const req = mockRequest({ headerValue: validToken })
    expect(await validateCsrfToken(req)).toBe(false)
  })

  test("malformed header (too short) → fail", async () => {
    setCsrfCookie(validToken)
    const req = mockRequest({ headerValue: "abc" })
    expect(await validateCsrfToken(req)).toBe(false)
  })

  test("mismatch (different valid-length tokens) → fail", async () => {
    setCsrfCookie("a".repeat(64))
    const req = mockRequest({ headerValue: "b".repeat(64) })
    expect(await validateCsrfToken(req)).toBe(false)
  })

  test("case-sensitive mismatch → fail", async () => {
    setCsrfCookie("a".repeat(64))
    const req = mockRequest({ headerValue: "A".repeat(64) })
    expect(await validateCsrfToken(req)).toBe(false)
  })

  test("valid token with real generated token → pass", async () => {
    const token = generateCsrfToken()
    setCsrfCookie(token)
    const req = mockRequest({ headerValue: token })
    expect(await validateCsrfToken(req)).toBe(true)
  })
})

describe("CSRF — auth lifecycle exemptions", () => {
  test("POST /api/auth/login is CSRF-exempt", () => {
    expect(requiresCsrf(mockRequest({ method: "POST", pathname: "/api/auth/login" }))).toBe(false)
  })

  test("POST /api/auth/signup is CSRF-exempt", () => {
    expect(requiresCsrf(mockRequest({ method: "POST", pathname: "/api/auth/signup" }))).toBe(false)
  })

  test("POST /api/auth/reset/request is CSRF-exempt", () => {
    expect(requiresCsrf(mockRequest({ method: "POST", pathname: "/api/auth/reset/request" }))).toBe(false)
  })

  test("POST /api/auth/reset/confirm is CSRF-exempt", () => {
    expect(requiresCsrf(mockRequest({ method: "POST", pathname: "/api/auth/reset/confirm" }))).toBe(false)
  })

  test("POST /api/auth/logout is NOT exempt (requires CSRF)", () => {
    expect(requiresCsrf(mockRequest({ method: "POST", pathname: "/api/auth/logout" }))).toBe(true)
  })

  test("POST /api/auth/delete is NOT exempt (requires CSRF)", () => {
    expect(requiresCsrf(mockRequest({ method: "POST", pathname: "/api/auth/delete" }))).toBe(true)
  })

  test("POST /api/auth/refresh is NOT exempt (requires CSRF)", () => {
    expect(requiresCsrf(mockRequest({ method: "POST", pathname: "/api/auth/refresh" }))).toBe(true)
  })
})
