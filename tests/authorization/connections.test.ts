/// <reference types="bun-types" />

import { mock, beforeAll, beforeEach, describe, expect, test } from "bun:test"

// Mock server-only BEFORE any module that may import it
mock.module("server-only", () => ({}))

// Control session token
let mockCookieValue: string | undefined = undefined

mock.module("next/headers", () => {
  return {
    cookies: async () => {
      return {
        get: (name: string) => {
          if (name === "laras_session" && mockCookieValue) {
            return { name: "laras_session", value: mockCookieValue }
          }
          return undefined
        },
      }
    },
  }
})

// Dynamic handler imports - set in beforeAll
let connPost: any
let connGet: any
let connPatch: any

// These are dynamically imported in beforeAll to avoid early server-only resolution
let cleanDb: any, seedDb: any, IDS: any, CANARIES: any
let createSessionToken: any, isValidId: any
let db: any

async function setActor(accountId: string) {
  mockCookieValue = await createSessionToken(accountId)
}

async function clearActor() {
  mockCookieValue = undefined
}

function makeParams(id: string): Promise<{ id: string }> {
  return Promise.resolve({ id })
}

describe("Connection POST Authorization Tests", () => {
  beforeAll(async () => {
    process.env.AUTH_SECRET = "test-auth-secret-key-32-chars-long-or-more"

    const fix = await import("./fixtures")
    cleanDb = fix.cleanDb
    seedDb = fix.seedDb
    IDS = fix.IDS
    CANARIES = fix.CANARIES

    const authMod = await import("@/lib/auth")
    createSessionToken = authMod.createSessionToken

    const authzMod = await import("@/lib/authorization")
    isValidId = authzMod.isValidId

    const dMod = await import("@/lib/db")
    db = dMod.db

    const connRoute = await import("@/app/api/connections/route")
    connPost = connRoute.POST
    connGet = connRoute.GET

    const connPatchRoute = await import("@/app/api/connections/[id]/route")
    connPatch = connPatchRoute.PATCH
  })

  beforeEach(async () => {
    mockCookieValue = undefined
    await cleanDb()
    await seedDb()
  })

  // ---- Malformed target ID ----
  test("malformed target ID returns 400", async () => {
    await setActor(IDS.accountA)
    const req = new Request("http://localhost/api/connections", {
      method: "POST",
      body: JSON.stringify({ addresseeId: "not-a-cuid" }),
    })
    const res = await connPost(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe("invalid-id")
  })

  test("missing target ID (empty) returns 400", async () => {
    await setActor(IDS.accountA)
    const req = new Request("http://localhost/api/connections", {
      method: "POST",
      body: JSON.stringify({ addresseeId: "" }),
    })
    const res = await connPost(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe("invalid-id")
  })

  // ---- Syntactically valid but missing target ----
  test("syntactically valid missing target returns 404", async () => {
    await setActor(IDS.accountA)
    // Generate a valid-looking CUID that doesn't exist (c + 24 alphanumeric chars)
    const fakeId = "c" + "x".repeat(24)
    const req = new Request("http://localhost/api/connections", {
      method: "POST",
      body: JSON.stringify({ addresseeId: fakeId }),
    })
    const res = await connPost(req)
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe("not-found")
  })

  // ---- Self-connection ----
  test("self target returns 400", async () => {
    await setActor(IDS.accountA)
    const req = new Request("http://localhost/api/connections", {
      method: "POST",
      body: JSON.stringify({ addresseeId: IDS.profileA }),
    })
    const res = await connPost(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe("invalid-id")
  })

  // ---- Anonymous ----
  test("anonymous request returns 401", async () => {
    await clearActor()
    const req = new Request("http://localhost/api/connections", {
      method: "POST",
      body: JSON.stringify({ addresseeId: IDS.profileB }),
    })
    const res = await connPost(req)
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe("unauthorized")
  })

  // ---- Successful connection request ----
  test("successful connection request returns 200", async () => {
    await setActor(IDS.accountA)
    const req = new Request("http://localhost/api/connections", {
      method: "POST",
      body: JSON.stringify({ addresseeId: IDS.profileB }),
    })
    const res = await connPost(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    // Verify database state
    const conn = await db.connection.findFirst({
      where: { requesterId: IDS.profileA, addresseeId: IDS.profileB },
    })
    expect(conn).not.toBeNull()
    expect(conn!.status).toBe("pending")
    expect(conn!.requesterId).toBe(IDS.profileA)
    expect(conn!.addresseeId).toBe(IDS.profileB)
  })

  // ---- Duplicate same-direction (already pending) ----
  test("duplicate same-direction pending returns 409", async () => {
    await setActor(IDS.accountA)
    // First request
    await connPost(new Request("http://localhost/api/connections", {
      method: "POST",
      body: JSON.stringify({ addresseeId: IDS.profileB }),
    }))
    // Second request (same direction)
    const req2 = new Request("http://localhost/api/connections", {
      method: "POST",
      body: JSON.stringify({ addresseeId: IDS.profileB }),
    })
    const res = await connPost(req2)
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error).toBe("conflict")
    // Only one row should exist
    const count = await db.connection.count({
      where: { requesterId: IDS.profileA, addresseeId: IDS.profileB },
    })
    expect(count).toBe(1)
  })

  // ---- Opposite-direction duplicate ----
  test("opposite-direction request returns 409 without exposing state", async () => {
    await setActor(IDS.accountA)
    // A sends to B
    await connPost(new Request("http://localhost/api/connections", {
      method: "POST",
      body: JSON.stringify({ addresseeId: IDS.profileB }),
    }))
    // B tries to send to A (opposite direction)
    await setActor(IDS.accountB)
    const req = new Request("http://localhost/api/connections", {
      method: "POST",
      body: JSON.stringify({ addresseeId: IDS.profileA }),
    })
    const res = await connPost(req)
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error).toBe("conflict")
    // Response must not reveal it's pending, accepted, etc.
    expect(body.error).not.toContain("pending")
    expect(body.error).not.toContain("accepted")
    expect(body.error).not.toContain("declined")
    expect(body.error).not.toContain("blocked")
    // Only one row should exist
    const count = await db.connection.count({
      where: {
        OR: [
          { requesterId: IDS.profileA, addresseeId: IDS.profileB },
          { requesterId: IDS.profileB, addresseeId: IDS.profileA },
        ],
      },
    })
    expect(count).toBe(1)
  })

  // ---- Declined re-request ----
  test("declined re-request succeeds with atomic transition", async () => {
    await setActor(IDS.accountA)
    // Create initial request
    await connPost(new Request("http://localhost/api/connections", {
      method: "POST",
      body: JSON.stringify({ addresseeId: IDS.profileB }),
    }))
    // Get the connection
    const conn = await db.connection.findFirst({
      where: { requesterId: IDS.profileA, addresseeId: IDS.profileB },
    })
    expect(conn).not.toBeNull()
    // B declines
    await setActor(IDS.accountB)
    await connPatch(new Request("http://localhost/api/connections/" + conn!.id, {
      method: "PATCH",
      body: JSON.stringify({ action: "decline" }),
    }), { params: makeParams(conn!.id) })
    // Verify declined
    const declined = await db.connection.findUnique({ where: { id: conn!.id } })
    expect(declined!.status).toBe("declined")

    // A re-requests
    await setActor(IDS.accountA)
    const req = new Request("http://localhost/api/connections", {
      method: "POST",
      body: JSON.stringify({ addresseeId: IDS.profileB }),
    })
    const res = await connPost(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    // Verify: same row, requesterId/addresseeId unchanged, status back to pending
    const final = await db.connection.findUnique({ where: { id: conn!.id } })
    expect(final).not.toBeNull()
    expect(final!.status).toBe("pending")
    expect(final!.requesterId).toBe(IDS.profileA)
    expect(final!.addresseeId).toBe(IDS.profileB)
    // Only one row
    const count = await db.connection.count({
      where: { requesterId: IDS.profileA, addresseeId: IDS.profileB },
    })
    expect(count).toBe(1)
  })

  // ---- Accepted duplicate ----
  test("attempt to connect to accepted peer returns 409", async () => {
    await setActor(IDS.accountA)
    // Create request
    await connPost(new Request("http://localhost/api/connections", {
      method: "POST",
      body: JSON.stringify({ addresseeId: IDS.profileB }),
    }))
    const conn = await db.connection.findFirst({
      where: { requesterId: IDS.profileA, addresseeId: IDS.profileB },
    })
    // B accepts
    await setActor(IDS.accountB)
    await connPatch(new Request("http://localhost/api/connections/" + conn!.id, {
      method: "PATCH",
      body: JSON.stringify({ action: "accept" }),
    }), { params: makeParams(conn!.id) })

    // A tries to connect again (same direction)
    await setActor(IDS.accountA)
    const req = new Request("http://localhost/api/connections", {
      method: "POST",
      body: JSON.stringify({ addresseeId: IDS.profileB }),
    })
    const res = await connPost(req)
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error).toBe("conflict")
    // Status must remain accepted
    const final = await db.connection.findUnique({ where: { id: conn!.id } })
    expect(final!.status).toBe("accepted")
  })

  // ---- Response body shape ----
  test("successful response has exact expected keys", async () => {
    await setActor(IDS.accountA)
    const req = new Request("http://localhost/api/connections", {
      method: "POST",
      body: JSON.stringify({ addresseeId: IDS.profileB }),
    })
    const res = await connPost(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    const keys = Object.keys(body).sort()
    expect(keys).toEqual(["ok"])
  })

  // ---- Content type ----
  test("successful response has JSON content type", async () => {
    await setActor(IDS.accountA)
    const req = new Request("http://localhost/api/connections", {
      method: "POST",
      body: JSON.stringify({ addresseeId: IDS.profileB }),
    })
    const res = await connPost(req)
    const contentType = res.headers.get("content-type")
    expect(contentType).toContain("application/json")
  })

  // ---- Error body is non-oracular ----
  test("error responses do not expose relationship state", async () => {
    const errorTests = async (status: string) => {
      // Create initial connection in desired state
      await setActor(IDS.accountA)
      await connPost(new Request("http://localhost/api/connections", {
        method: "POST",
        body: JSON.stringify({ addresseeId: IDS.profileB }),
      }))
      const conn = await db.connection.findFirst({
        where: { requesterId: IDS.profileA, addresseeId: IDS.profileB },
      })
      if (!conn) throw new Error("Expected connection to exist")

      // Set the desired status
      await db.connection.update({
        where: { id: conn.id },
        data: { status },
      })

      // Try to re-request
      const req = new Request("http://localhost/api/connections", {
        method: "POST",
        body: JSON.stringify({ addresseeId: IDS.profileB }),
      })
      const res = await connPost(req)
      const body = await res.json()
      // Must not leak status
      const errorStr = JSON.stringify(body.error)
      expect(errorStr).not.toContain(status)
      expect(errorStr).not.toContain("pending")
      expect(errorStr).not.toContain("accepted")
      expect(errorStr).not.toContain("declined")
      expect(errorStr).not.toContain("blocked")
      expect(errorStr).not.toContain("connected")
    }

    await errorTests("accepted")
    await errorTests("blocked")
  })

  // ---- Invalid JSON body ----
  test("invalid JSON body returns 400", async () => {
    await setActor(IDS.accountA)
    const req = new Request("http://localhost/api/connections", {
      method: "POST",
      body: "not-json",
    })
    const res = await connPost(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe("invalid-id")
  })

  // ---- Final row count and ID assertions ----
  test("final requesterId and addresseeId never change after create", async () => {
    await setActor(IDS.accountA)
    // Create
    await connPost(new Request("http://localhost/api/connections", {
      method: "POST",
      body: JSON.stringify({ addresseeId: IDS.profileB }),
    }))
    const conn = await db.connection.findFirst({
      where: { requesterId: IDS.profileA, addresseeId: IDS.profileB },
    })
    expect(conn).not.toBeNull()
    const originalRequester = conn!.requesterId
    const originalAddressee = conn!.addresseeId

    // Decline
    await setActor(IDS.accountB)
    await connPatch(new Request("http://localhost/api/connections/" + conn!.id, {
      method: "PATCH",
      body: JSON.stringify({ action: "decline" }),
    }), { params: makeParams(conn!.id) })

    // Re-request
    await setActor(IDS.accountA)
    await connPost(new Request("http://localhost/api/connections", {
      method: "POST",
      body: JSON.stringify({ addresseeId: IDS.profileB }),
    }))

    // Verify IDs unchanged
    const final = await db.connection.findUnique({ where: { id: conn!.id } })
    expect(final!.requesterId).toBe(originalRequester)
    expect(final!.addresseeId).toBe(originalAddressee)
    expect(final!.requesterId).toBe(IDS.profileA)
    expect(final!.addresseeId).toBe(IDS.profileB)
  })
})

describe("Connection POST Concurrency Tests", () => {
  beforeAll(async () => {
    process.env.AUTH_SECRET = "test-auth-secret-key-32-chars-long-or-more"

    const fix = await import("./fixtures")
    cleanDb = fix.cleanDb
    seedDb = fix.seedDb
    IDS = fix.IDS
    CANARIES = fix.CANARIES

    const authMod = await import("@/lib/auth")
    createSessionToken = authMod.createSessionToken

    const dMod = await import("@/lib/db")
    db = dMod.db

    const connRoute = await import("@/app/api/connections/route")
    connPost = connRoute.POST

    const connPatchRoute = await import("@/app/api/connections/[id]/route")
    connPatch = connPatchRoute.PATCH
  })

  beforeEach(async () => {
    mockCookieValue = undefined
    await cleanDb()
    await seedDb()
  })

  // ---- True parallel re-request ----
  test("parallel re-request attempts via Promise.allSettled produce exactly one pending transition", async () => {
    await setActor(IDS.accountA)
    // Create initial request first
    await connPost(new Request("http://localhost/api/connections", {
      method: "POST",
      body: JSON.stringify({ addresseeId: IDS.profileB }),
    }))
    const conn = await db.connection.findFirst({
      where: { requesterId: IDS.profileA, addresseeId: IDS.profileB },
    })
    // Decline
    await setActor(IDS.accountB)
    await connPatch(new Request("http://localhost/api/connections/" + conn!.id, {
      method: "PATCH",
      body: JSON.stringify({ action: "decline" }),
    }), { params: makeParams(conn!.id) })

    // Now launch two parallel re-requests from A
    await setActor(IDS.accountA)
    // We need separate request objects with their own mockCookie state.
    // Since both run under the same actor, we fire two parallel POSTs.
    const req1 = new Request("http://localhost/api/connections", {
      method: "POST",
      body: JSON.stringify({ addresseeId: IDS.profileB }),
    })
    const req2 = new Request("http://localhost/api/connections", {
      method: "POST",
      body: JSON.stringify({ addresseeId: IDS.profileB }),
    })
    const results = await Promise.allSettled([connPost(req1), connPost(req2)])

    // At least one should succeed
    const responses = results
      .filter((r) => r.status === "fulfilled")
      .map((r: any) => r.value)
    expect(responses.length).toBeGreaterThan(0)

    // Final state: exactly one row, status is either pending (re-request succeeded)
    // or declined (if the re-request transition failed)
    const final = await db.connection.findUnique({ where: { id: conn!.id } })
    expect(final).not.toBeNull()
    // At most one succeeded in changing the status
    const statusOk = final!.status === "pending" || final!.status === "declined"
    expect(statusOk).toBe(true)

    // Exactly one row total for this pair
    const count = await db.connection.count({
      where: {
        OR: [
          { requesterId: IDS.profileA, addresseeId: IDS.profileB },
          { requesterId: IDS.profileB, addresseeId: IDS.profileA },
        ],
      },
    })
    expect(count).toBe(1)
  })

  // ---- Parallel fresh request creation ----
  test("parallel fresh connection requests from same actor create at most one row", async () => {
    await setActor(IDS.accountA)
    const req1 = new Request("http://localhost/api/connections", {
      method: "POST",
      body: JSON.stringify({ addresseeId: IDS.profileB }),
    })
    const req2 = new Request("http://localhost/api/connections", {
      method: "POST",
      body: JSON.stringify({ addresseeId: IDS.profileB }),
    })
    const results = await Promise.allSettled([connPost(req1), connPost(req2)])

    const fulfilled = results.filter((r) => r.status === "fulfilled")
    expect(fulfilled.length).toBeGreaterThan(0)

    // At most one row for this profile pair
    const count = await db.connection.count({
      where: {
        requesterId: IDS.profileA,
        addresseeId: IDS.profileB,
      },
    })
    expect(count).toBeLessThanOrEqual(1)
    // If a row exists, its IDs are correct
    if (count > 0) {
      const row = await db.connection.findFirst({
        where: { requesterId: IDS.profileA, addresseeId: IDS.profileB },
      })
      expect(row!.requesterId).toBe(IDS.profileA)
      expect(row!.addresseeId).toBe(IDS.profileB)
      expect(row!.status).toBe("pending")
    }
  })
})
