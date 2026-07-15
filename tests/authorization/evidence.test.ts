/// <reference types="bun-types" />

import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test"
import { cleanDb, seedDb, IDS, CANARIES } from "./fixtures"
import { resetTestRuntime, testRuntime } from "./test-runtime"

let createSessionToken: any
let requireActor: any
let handleAuthorizationError: any
let AuthorizationError: any

describe("Phase 2A — Evidence Graph Authorization Tests", () => {
  beforeAll(async () => {
    process.env.AUTH_SECRET = "test-auth-secret-key-32-chars-long-or-more"

    const authLib = await import("@/lib/auth")
    createSessionToken = authLib.createSessionToken

    const authorizationLib = await import("@/lib/authorization")
    requireActor = authorizationLib.requireActor
    handleAuthorizationError = authorizationLib.handleAuthorizationError
    AuthorizationError = authorizationLib.AuthorizationError

    await cleanDb()
    await seedDb()
  })

  beforeEach(async () => {
    resetTestRuntime()
    await cleanDb()
    await seedDb()
  })

  // ============================================================================
  // 1. LIST — GET /api/profile/evidence
  // ============================================================================
  describe("GET /api/profile/evidence — list evidence", () => {
    test("owner lists their own evidence", async () => {
      testRuntime.cookieValue = await createSessionToken(IDS.accountA)
      const { GET } = await import("@/app/api/profile/evidence/route")
      const res = await GET()
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(Array.isArray(body.evidence)).toBe(true)
      expect(body.evidence.length).toBe(1)
      expect(body.evidence[0].title).toBe(CANARIES.evidenceA)
    })

    test("evidence list excludes other user data", async () => {
      testRuntime.cookieValue = await createSessionToken(IDS.accountA)
      const { GET } = await import("@/app/api/profile/evidence/route")
      const res = await GET()
      const body = await res.json()
      const titles = body.evidence.map((e: any) => e.title)
      expect(titles).not.toContain(CANARIES.evidenceB)
      expect(titles).not.toContain(CANARIES.evidenceF)
    })

    test("unauthenticated receives 401", async () => {
      const { GET } = await import("@/app/api/profile/evidence/route")
      const res = await GET()
      expect(res.status).toBe(401)
    })

    test("profileless account receives 404", async () => {
      testRuntime.cookieValue = await createSessionToken(IDS.accountE)
      const { GET } = await import("@/app/api/profile/evidence/route")
      const res = await GET()
      expect(res.status).toBe(404)
    })
  })

  // ============================================================================
  // 2. CREATE — POST /api/profile/evidence
  // ============================================================================
  describe("POST /api/profile/evidence — create evidence", () => {
    test("owner creates evidence successfully", async () => {
      testRuntime.cookieValue = await createSessionToken(IDS.accountA)
      const { POST } = await import("@/app/api/profile/evidence/route")
      const body = JSON.stringify({
        type: "project",
        title: "My New Project",
        description: "A project I built",
        sourceUrl: "https://github.com/me/project",
      })
      const req = new Request("http://localhost/api/profile/evidence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      })
      const res = await POST(req as any)
      expect(res.status).toBe(201)
      const data = await res.json()
      expect(data.evidence.title).toBe("My New Project")
      expect(data.evidence.type).toBe("project")
      expect(data.evidence.verificationStatus).toBe("self-reported")
      expect(data.evidence.id).toBeTruthy()
    })

    test("create evidence with metric type", async () => {
      testRuntime.cookieValue = await createSessionToken(IDS.accountA)
      const { POST } = await import("@/app/api/profile/evidence/route")
      const body = JSON.stringify({
        type: "metric",
        title: "Revenue Growth",
        metricValue: "150% increase",
        metricContext: "YoY comparison 2024-2025",
      })
      const req = new Request("http://localhost/api/profile/evidence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      })
      const res = await POST(req as any)
      expect(res.status).toBe(201)
      const data = await res.json()
      expect(data.evidence.metricValue).toBe("150% increase")
    })

    test("create with invalid type returns 400", async () => {
      testRuntime.cookieValue = await createSessionToken(IDS.accountA)
      const { POST } = await import("@/app/api/profile/evidence/route")
      const body = JSON.stringify({ type: "invalid", title: "Bad" })
      const req = new Request("http://localhost/api/profile/evidence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      })
      const res = await POST(req as any)
      expect(res.status).toBe(400)
    })

    test("create with empty title returns 400", async () => {
      testRuntime.cookieValue = await createSessionToken(IDS.accountA)
      const { POST } = await import("@/app/api/profile/evidence/route")
      const body = JSON.stringify({ type: "project", title: "   " })
      const req = new Request("http://localhost/api/profile/evidence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      })
      const res = await POST(req as any)
      expect(res.status).toBe(400)
    })

    test("unauthenticated create returns 401", async () => {
      const { POST } = await import("@/app/api/profile/evidence/route")
      const body = JSON.stringify({ type: "project", title: "Test" })
      const req = new Request("http://localhost/api/profile/evidence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      })
      const res = await POST(req as any)
      expect(res.status).toBe(401)
    })

    test("linked experience must belong to owner", async () => {
      testRuntime.cookieValue = await createSessionToken(IDS.accountA)
      const { POST } = await import("@/app/api/profile/evidence/route")
      // Try to link to user B's experience
      const expB = await import("@/lib/db").then(m =>
        m.db.experience.findFirst({ where: { userProfileId: IDS.profileB } })
      )
      if (expB) {
        const body = JSON.stringify({
          type: "project",
          title: "Hijack Attempt",
          experienceId: expB.id,
        })
        const req = new Request("http://localhost/api/profile/evidence", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
        })
        const res = await POST(req as any)
        expect(res.status).toBe(404)
      }
    })
  })

  // ============================================================================
  // 3. UPDATE — PATCH /api/profile/evidence
  // ============================================================================
  describe("PATCH /api/profile/evidence — update evidence", () => {
    test("owner updates their own evidence", async () => {
      testRuntime.cookieValue = await createSessionToken(IDS.accountA)
      const { PATCH } = await import("@/app/api/profile/evidence/route")
      const body = JSON.stringify({
        id: IDS.evidenceA,
        title: "Updated Title A",
      })
      const req = new Request("http://localhost/api/profile/evidence", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body,
      })
      const res = await PATCH(req as any)
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.evidence.title).toBe("Updated Title A")
    })

    test("cannot update another user's evidence", async () => {
      testRuntime.cookieValue = await createSessionToken(IDS.accountA)
      const { PATCH } = await import("@/app/api/profile/evidence/route")
      const body = JSON.stringify({
        id: IDS.evidenceB,
        title: "Hijack Attempt",
      })
      const req = new Request("http://localhost/api/profile/evidence", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body,
      })
      const res = await PATCH(req as any)
      expect(res.status).toBe(404)
      // Verify evidenceB title unchanged
      const { db } = await import("@/lib/db")
      const evidenceB = await db.evidence.findUnique({ where: { id: IDS.evidenceB } })
      expect(evidenceB!.title).toBe(CANARIES.evidenceB)
    })

    test("unauthenticated update returns 401", async () => {
      const { PATCH } = await import("@/app/api/profile/evidence/route")
      const body = JSON.stringify({ id: IDS.evidenceA, title: "X" })
      const req = new Request("http://localhost/api/profile/evidence", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body,
      })
      const res = await PATCH(req as any)
      expect(res.status).toBe(401)
    })

    test("invalid id returns 400", async () => {
      testRuntime.cookieValue = await createSessionToken(IDS.accountA)
      const { PATCH } = await import("@/app/api/profile/evidence/route")
      const res = await PATCH(
        new Request("http://localhost/api/profile/evidence", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: "not-a-cuid", title: "X" }),
        }) as any
      )
      expect(res.status).toBe(400)
    })
  })

  // ============================================================================
  // 4. DELETE — DELETE /api/profile/evidence
  // ============================================================================
  describe("DELETE /api/profile/evidence — delete evidence", () => {
    test("owner deletes their own evidence", async () => {
      testRuntime.cookieValue = await createSessionToken(IDS.accountA)
      const { DELETE } = await import("@/app/api/profile/evidence/route")
      const url = `http://localhost/api/profile/evidence?id=${IDS.evidenceA}`
      const res = await DELETE(new Request(url) as any)
      expect(res.status).toBe(200)
      // Verify deleted
      const { db } = await import("@/lib/db")
      const evidence = await db.evidence.findUnique({ where: { id: IDS.evidenceA } })
      expect(evidence).toBeNull()
    })

    test("cannot delete another user's evidence", async () => {
      testRuntime.cookieValue = await createSessionToken(IDS.accountA)
      const { DELETE } = await import("@/app/api/profile/evidence/route")
      const url = `http://localhost/api/profile/evidence?id=${IDS.evidenceB}`
      const res = await DELETE(new Request(url) as any)
      expect(res.status).toBe(404)
      // Verify evidenceB still exists
      const { db } = await import("@/lib/db")
      const evidenceB = await db.evidence.findUnique({ where: { id: IDS.evidenceB } })
      expect(evidenceB).not.toBeNull()
    })

    test("unauthenticated delete returns 401", async () => {
      const { DELETE } = await import("@/app/api/profile/evidence/route")
      const url = `http://localhost/api/profile/evidence?id=${IDS.evidenceA}`
      const res = await DELETE(new Request(url) as any)
      expect(res.status).toBe(401)
    })

    test("missing id returns 400", async () => {
      testRuntime.cookieValue = await createSessionToken(IDS.accountA)
      const { DELETE } = await import("@/app/api/profile/evidence/route")
      const res = await DELETE(new Request("http://localhost/api/profile/evidence") as any)
      expect(res.status).toBe(400)
    })

    test("admin cannot bypass ownership for delete", async () => {
      testRuntime.cookieValue = await createSessionToken(IDS.adminC)
      const { DELETE } = await import("@/app/api/profile/evidence/route")
      const url = `http://localhost/api/profile/evidence?id=${IDS.evidenceA}`
      const res = await DELETE(new Request(url) as any)
      expect(res.status).toBe(404)
    })
  })

  // ============================================================================
  // 5. CACHE HEADERS
  // ============================================================================
  describe("Evidence API cache headers", () => {
    test("GET returns Cache-Control: private, no-store", async () => {
      testRuntime.cookieValue = await createSessionToken(IDS.accountA)
      const { GET } = await import("@/app/api/profile/evidence/route")
      const res = await GET()
      expect(res.headers.get("Cache-Control")).toBe("private, no-store")
    })

    test("POST returns Cache-Control: private, no-store", async () => {
      testRuntime.cookieValue = await createSessionToken(IDS.accountA)
      const { POST } = await import("@/app/api/profile/evidence/route")
      const body = JSON.stringify({ type: "other", title: "Cache Test" })
      const req = new Request("http://localhost/api/profile/evidence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      })
      const res = await POST(req as any)
      expect(res.headers.get("Cache-Control")).toBe("private, no-store")
    })
  })
})
