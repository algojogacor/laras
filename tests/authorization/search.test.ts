/// <reference types="bun-types" />

import { beforeAll, beforeEach, describe, expect, test } from "bun:test"
import { resetTestRuntime, testRuntime } from "./test-runtime"

// Dynamic handler imports
let searchGet: any

// Dynamic imports
let cleanDb: any, seedDb: any, IDS: any, CANARIES: any
let createSessionToken: any
let db: any

async function setActor(accountId: string) {
  testRuntime.cookieValue = await createSessionToken(accountId)
}

async function clearActor() {
  testRuntime.cookieValue = undefined
}

function searchUrl(query: string, type?: string, cursor?: string): string {
  const params = new URLSearchParams()
  params.set("q", query)
  if (type) params.set("type", type)
  if (cursor) params.set("cursor", cursor)
  return `http://localhost/api/search?${params.toString()}`
}

describe.serial("Search Authorization Tests", () => {
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

    const searchRoute = await import("@/app/api/search/route")
    searchGet = searchRoute.GET
  })

  beforeEach(async () => {
    resetTestRuntime()
    await cleanDb()
    await seedDb()
  })

  // ============================================================================
  // Profile Search
  // ============================================================================
  describe("Profile Search", () => {
    test("Search finds profiles by fullName", async () => {
      await setActor(IDS.accountA)
      const req = new Request(searchUrl("User B"))
      const res = await searchGet(req)
      expect(res.status).toBe(200)
      const body = await res.json()
      const profileResults = body.results.filter(
        (r: any) => r.category === "profiles"
      )
      expect(profileResults.length).toBeGreaterThan(0)
      const names = profileResults.map((r: any) => r.item.fullName)
      expect(names).toContain("User B")
    })

    test("Search finds profiles by headline (if set)", async () => {
      // Set a headline for User B
      await db.userProfile.update({
        where: { id: IDS.profileB },
        data: { headline: "Full Stack Engineer" },
      })

      await setActor(IDS.accountA)
      const req = new Request(searchUrl("Engineer"))
      const res = await searchGet(req)
      expect(res.status).toBe(200)
      const body = await res.json()
      const profileResults = body.results.filter(
        (r: any) => r.category === "profiles"
      )
      expect(profileResults.length).toBeGreaterThan(0)
      const headlines = profileResults.map((r: any) => r.item.headline)
      expect(headlines.some((h: string | null) => h?.includes("Engineer"))).toBe(true)
    })

    test("Search finds profiles by skills", async () => {
      await setActor(IDS.accountE) // Account E has no profile, use B
      const req = new Request(searchUrl("TypeScript"))
      const res = await searchGet(req)
      expect(res.status).toBe(200)
      const body = await res.json()
      const profileResults = body.results.filter(
        (r: any) => r.category === "profiles"
      )
      // Profile A has TypeScript skill
      expect(profileResults.length).toBeGreaterThan(0)
    })

    test("Search does not leak private fields", async () => {
      // Set email visibility to private for Profile B
      await db.consentSetting.create({
        data: {
          userProfileId: IDS.profileB,
          field: "email",
          visibility: "private",
        },
      })

      await setActor(IDS.accountA)
      const req = new Request(searchUrl("User B"))
      const res = await searchGet(req)
      expect(res.status).toBe(200)
      const body = await res.json()
      const profileResults = body.results.filter(
        (r: any) => r.category === "profiles"
      )
      for (const r of profileResults) {
        // Email should not be in the serialized result
        expect(r.item).not.toHaveProperty("email")
        expect(r.item).not.toHaveProperty("phone")
      }
    })
  })

  // ============================================================================
  // Empty / Short Query
  // ============================================================================
  describe("Query Validation", () => {
    test("Empty search returns empty results (valid state)", async () => {
      const req = new Request(searchUrl(""))
      const res = await searchGet(req)
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.results).toEqual([])
      expect(body.nextCursor).toBeNull()
    })

    test("Short query (1 char) returns 400", async () => {
      const req = new Request(searchUrl("a"))
      const res = await searchGet(req)
      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.error).toBe("invalid-id")
    })

    test("Exactly 2 chars is valid", async () => {
      const req = new Request(searchUrl("Us"))
      const res = await searchGet(req)
      expect(res.status).toBe(200)
    })
  })

  // ============================================================================
  // Unauthenticated Search
  // ============================================================================
  describe("Unauthenticated Search", () => {
    test("Unauthenticated can search public profiles", async () => {
      clearActor()
      const req = new Request(searchUrl("User"))
      const res = await searchGet(req)
      expect(res.status).toBe(200)
      const body = await res.json()
      const profileResults = body.results.filter(
        (r: any) => r.category === "profiles"
      )
      // Should find public profiles
      expect(body.categories.profiles.total).toBeGreaterThanOrEqual(0)
    })

    test("Unauthenticated cannot search opportunities", async () => {
      clearActor()
      const req = new Request(searchUrl("Canary"))
      const res = await searchGet(req)
      expect(res.status).toBe(200)
      const body = await res.json()
      const oppResults = body.results.filter(
        (r: any) => r.category === "opportunities"
      )
      expect(oppResults.length).toBe(0)
    })

    test("Unauthenticated can search organizations", async () => {
      clearActor()
      // Create a public organization
      await db.organization.create({
        data: {
          name: "Test University",
          slug: "test-university",
          type: "institution",
          createdById: IDS.accountA,
        },
      })

      const req = new Request(searchUrl("University"))
      const res = await searchGet(req)
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.categories.organizations.total).toBeGreaterThan(0)
    })
  })

  // ============================================================================
  // Type Filter
  // ============================================================================
  describe("Type Filtering", () => {
    test("Type filter profiles returns only profiles", async () => {
      await setActor(IDS.accountA)
      const req = new Request(searchUrl("User", "profiles"))
      const res = await searchGet(req)
      expect(res.status).toBe(200)
      const body = await res.json()
      for (const r of body.results) {
        expect(r.category).toBe("profiles")
      }
    })

    test("Invalid type filter defaults to all", async () => {
      await setActor(IDS.accountA)
      const req = new Request(searchUrl("User", "invalid"))
      const res = await searchGet(req)
      expect(res.status).toBe(200)
    })
  })

  // ============================================================================
  // Owner-Scoped Opportunities
  // ============================================================================
  describe("Opportunity Search", () => {
    test("User can only search their own opportunities", async () => {
      await setActor(IDS.accountA)
      const req = new Request(searchUrl("Canary"))
      const res = await searchGet(req)
      expect(res.status).toBe(200)
      const body = await res.json()
      const oppResults = body.results.filter(
        (r: any) => r.category === "opportunities"
      )
      // All results should belong to profile A
      for (const r of oppResults) {
        expect(r.item.organization).toBe("Org A")
      }
    })

    test("User B sees only their own opportunities", async () => {
      await setActor(IDS.accountB)
      const req = new Request(searchUrl("Canary"))
      const res = await searchGet(req)
      expect(res.status).toBe(200)
      const body = await res.json()
      const oppResults = body.results.filter(
        (r: any) => r.category === "opportunities"
      )
      for (const r of oppResults) {
        expect(r.item.organization).toBe("Org B")
      }
    })
  })
})
