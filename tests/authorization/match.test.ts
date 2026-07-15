/// <reference types="bun-types" />

import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test"
import { cleanDb, seedDb, IDS, CANARIES } from "./fixtures"
import { resetTestRuntime, testRuntime } from "./test-runtime"

let createSessionToken: any
let requireActor: any
let handleAuthorizationError: any
let AuthorizationError: any
let analyzeMatch: any
let getExistingMatch: any

describe("Phase 3B — Opportunity Match Authorization Tests", () => {
  beforeAll(async () => {
    process.env.AUTH_SECRET = "test-auth-secret-key-32-chars-long-or-more"

    const authLib = await import("@/lib/auth")
    createSessionToken = authLib.createSessionToken

    const authorizationLib = await import("@/lib/authorization")
    requireActor = authorizationLib.requireActor
    handleAuthorizationError = authorizationLib.handleAuthorizationError
    AuthorizationError = authorizationLib.AuthorizationError

    const matchLib = await import("@/lib/opportunity-match")
    analyzeMatch = matchLib.analyzeMatch
    getExistingMatch = matchLib.getExistingMatch

    await cleanDb()
    await seedDb()
  })

  beforeEach(async () => {
    resetTestRuntime()
    await cleanDb()
    await seedDb()
  })

  // ============================================================================
  // 1. Owner can trigger match analysis
  // ============================================================================
  describe("POST /api/opportunities/[id]/match — analyze match", () => {
    test("owner triggers match analysis on their opportunity", async () => {
      testRuntime.cookieValue = await createSessionToken(IDS.accountA)

      const { POST } = await import("@/app/api/opportunities/[id]/match/route")

      const req = new Request(
        `http://localhost/api/opportunities/${IDS.opportunityA}/match`,
        { method: "POST" },
      )
      const res = await POST(req as any, { params: Promise.resolve({ id: IDS.opportunityA }) })
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.match).toBeDefined()
      expect(typeof body.match.overallScore).toBe("number")
      expect(body.match.overallScore).toBeGreaterThanOrEqual(0)
      expect(body.match.overallScore).toBeLessThanOrEqual(100)
      expect(body.match.categoryScores).toBeDefined()
      expect(body.match.categoryScores.requiredSkills).toBeDefined()
      expect(body.match.categoryScores.preferredSkills).toBeDefined()
      expect(body.match.categoryScores.experience).toBeDefined()
      expect(body.match.categoryScores.education).toBeDefined()
      expect(body.match.categoryScores.languages).toBeDefined()
      expect(Array.isArray(body.match.strengths)).toBe(true)
      expect(Array.isArray(body.match.gaps)).toBe(true)
      expect(Array.isArray(body.match.partial)).toBe(true)
      expect(body.match.analyzedAt).toBeDefined()
    })
  })

  // ============================================================================
  // 2. Cross-user access returns 404
  // ============================================================================
  describe("Cross-user access — NOT_FOUND", () => {
    test("user A cannot analyze user B's opportunity", async () => {
      testRuntime.cookieValue = await createSessionToken(IDS.accountA)

      const { POST } = await import("@/app/api/opportunities/[id]/match/route")

      const req = new Request(
        `http://localhost/api/opportunities/${IDS.opportunityB}/match`,
        { method: "POST" },
      )
      const res = await POST(req as any, { params: Promise.resolve({ id: IDS.opportunityB }) })
      // analyzeMatch throws "Opportunity not found" which maps to 404
      expect(res.status).toBe(404)
    })

    test("user B cannot analyze user A's opportunity", async () => {
      testRuntime.cookieValue = await createSessionToken(IDS.accountB)

      const { POST } = await import("@/app/api/opportunities/[id]/match/route")

      const req = new Request(
        `http://localhost/api/opportunities/${IDS.opportunityA}/match`,
        { method: "POST" },
      )
      const res = await POST(req as any, { params: Promise.resolve({ id: IDS.opportunityA }) })
      expect(res.status).toBe(404)
    })

    test("GET match is also cross-user scoped", async () => {
      testRuntime.cookieValue = await createSessionToken(IDS.accountA)

      const { GET } = await import("@/app/api/opportunities/[id]/match/route")

      const req = new Request(
        `http://localhost/api/opportunities/${IDS.opportunityB}/match`,
        { method: "GET" },
      )
      const res = await GET(req as any, { params: Promise.resolve({ id: IDS.opportunityB }) })
      // getExistingMatch returns null for cross-user, so returns { match: null }
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.match).toBeNull()
    })
  })

  // ============================================================================
  // 3. Unauthenticated receives 401
  // ============================================================================
  describe("Unauthenticated access — 401", () => {
    test("POST without session returns 401", async () => {
      const { POST } = await import("@/app/api/opportunities/[id]/match/route")

      const req = new Request(
        `http://localhost/api/opportunities/${IDS.opportunityA}/match`,
        { method: "POST" },
      )
      const res = await POST(req as any, { params: Promise.resolve({ id: IDS.opportunityA }) })
      expect(res.status).toBe(401)
    })

    test("GET without session returns 401", async () => {
      const { GET } = await import("@/app/api/opportunities/[id]/match/route")

      const req = new Request(
        `http://localhost/api/opportunities/${IDS.opportunityA}/match`,
        { method: "GET" },
      )
      const res = await GET(req as any, { params: Promise.resolve({ id: IDS.opportunityA }) })
      expect(res.status).toBe(401)
    })
  })

  // ============================================================================
  // 4. Match result is persisted to opportunity
  // ============================================================================
  describe("Match result persistence", () => {
    test("after analysis, opportunity.matchScore and matchDetail are updated", async () => {
      testRuntime.cookieValue = await createSessionToken(IDS.accountA)

      const { POST } = await import("@/app/api/opportunities/[id]/match/route")

      const req = new Request(
        `http://localhost/api/opportunities/${IDS.opportunityA}/match`,
        { method: "POST" },
      )
      const res = await POST(req as any, { params: Promise.resolve({ id: IDS.opportunityA }) })
      expect(res.status).toBe(200)
      const body = await res.json()

      // Verify the opportunity was updated in DB
      const db = (await import("@/lib/db")).db
      const updated = await db.opportunity.findUnique({
        where: { id: IDS.opportunityA },
        select: { matchScore: true, matchDetail: true },
      })
      expect(updated?.matchScore).toBe(body.match.overallScore)
      expect(updated?.matchDetail).toBeDefined()

      const parsed = JSON.parse(updated!.matchDetail!)
      expect(parsed.overallScore).toBe(body.match.overallScore)
      expect(parsed.categoryScores).toBeDefined()
    })

    test("GET returns previously computed match", async () => {
      testRuntime.cookieValue = await createSessionToken(IDS.accountA)

      // First analyze
      const { POST } = await import("@/app/api/opportunities/[id]/match/route")
      const postReq = new Request(
        `http://localhost/api/opportunities/${IDS.opportunityA}/match`,
        { method: "POST" },
      )
      await POST(postReq as any, { params: Promise.resolve({ id: IDS.opportunityA }) })

      // Then GET
      const { GET } = await import("@/app/api/opportunities/[id]/match/route")
      const getReq = new Request(
        `http://localhost/api/opportunities/${IDS.opportunityA}/match`,
        { method: "GET" },
      )
      const res = await GET(getReq as any, { params: Promise.resolve({ id: IDS.opportunityA }) })
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.match).toBeDefined()
      expect(body.match.overallScore).toBeGreaterThanOrEqual(0)
    })
  })

  // ============================================================================
  // 5. Invalid opportunity ID returns 400
  // ============================================================================
  describe("Invalid opportunity ID — 400", () => {
    test("POST with invalid ID returns 400", async () => {
      testRuntime.cookieValue = await createSessionToken(IDS.accountA)

      const { POST } = await import("@/app/api/opportunities/[id]/match/route")

      const req = new Request(
        "http://localhost/api/opportunities/not-a-valid-cuid/match",
        { method: "POST" },
      )
      const res = await POST(req as any, { params: Promise.resolve({ id: "not-a-valid-cuid" }) })
      expect(res.status).toBe(400)
    })

    test("GET with invalid ID returns 400", async () => {
      testRuntime.cookieValue = await createSessionToken(IDS.accountA)

      const { GET } = await import("@/app/api/opportunities/[id]/match/route")

      const req = new Request(
        "http://localhost/api/opportunities/not-a-valid-cuid/match",
        { method: "GET" },
      )
      const res = await GET(req as any, { params: Promise.resolve({ id: "not-a-valid-cuid" }) })
      expect(res.status).toBe(400)
    })
  })

  // ============================================================================
  // 6. analyzeMatch service-level tests
  // ============================================================================
  describe("analyzeMatch service function", () => {
    test("returns match result with correct structure", async () => {
      const result = await analyzeMatch(IDS.opportunityA, IDS.profileA)

      expect(result.overallScore).toBeGreaterThanOrEqual(0)
      expect(result.overallScore).toBeLessThanOrEqual(100)
      expect(result.categoryScores).toBeDefined()
      expect(Array.isArray(result.strengths)).toBe(true)
      expect(Array.isArray(result.gaps)).toBe(true)
      expect(Array.isArray(result.partial)).toBe(true)
      expect(result.analyzedAt).toBeDefined()
    })

    test("strengths include matching TypeScript and React skills", async () => {
      const result = await analyzeMatch(IDS.opportunityA, IDS.profileA)

      const strengthLabels = result.strengths.map(s => s.label)
      // TypeScript and React are required for opportunity A
      const hasTs = strengthLabels.some(l => l.toLowerCase().includes("typescript"))
      const hasReact = strengthLabels.some(l => l.toLowerCase().includes("react"))
      expect(hasTs || hasReact).toBe(true)
    })

    test("gaps include GraphQL (not in profile A skills)", async () => {
      const result = await analyzeMatch(IDS.opportunityA, IDS.profileA)

      const gapLabels = result.gaps.map(g => g.label)
      // GraphQL is required but not in profile
      const hasGraphql = gapLabels.some(l => l.toLowerCase().includes("graphql"))
      expect(hasGraphql).toBe(true)
    })

    test("throws for non-existent opportunity", async () => {
      await expect(
        analyzeMatch("c00000000000000000000000", IDS.profileA)
      ).rejects.toThrow("Opportunity not found")
    })

    test("throws for non-existent profile", async () => {
      await expect(
        analyzeMatch(IDS.opportunityA, "c00000000000000000000000")
      ).rejects.toThrow("Profile not found")
    })
  })
})
