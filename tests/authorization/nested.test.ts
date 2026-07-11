/// <reference types="bun-types" />

import { mock, beforeAll, beforeEach, describe, expect, test } from "bun:test"
import { db } from "@/lib/db"

// Mock server-only
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

// Import route handlers dynamically
let appDocPost: any
let appDocDelete: any
let docVersionsGet: any
let profilePut: any

import { cleanDb, seedDb, IDS, CANARIES } from "./fixtures"
import { createSessionToken } from "@/lib/auth"

describe("Wave D Nested Resources and All-or-Nothing Authorization Tests", () => {
  beforeAll(async () => {
    process.env.AUTH_SECRET = "test-auth-secret-key-32-chars-long-or-more"

    const appDocRoute = await import("@/app/api/applications/[id]/documents/route")
    appDocPost = appDocRoute.POST
    appDocDelete = appDocRoute.DELETE

    const docVersionsRoute = await import("@/app/api/documents/[id]/versions/route")
    docVersionsGet = docVersionsRoute.GET

    const profileRoute = await import("@/app/api/profile/route")
    profilePut = profileRoute.PUT
  })

  beforeEach(async () => {
    mockCookieValue = undefined
    await cleanDb()
    await seedDb()
  })

  const makeParams = (id: string) => Promise.resolve({ id })

  // ============================================================================
  // 1. APPLICATION-DOCUMENT LINKS
  // ============================================================================
  describe("POST & DELETE /api/applications/[id]/documents", () => {
    test("User A can link their own document to their own application", async () => {
      // First delete the pre-seeded link to avoid duplicate conflict
      await db.applicationDocument.deleteMany({
        where: { applicationId: IDS.applicationA, documentId: IDS.documentA },
      })

      mockCookieValue = await createSessionToken(IDS.accountA)
      const req = new Request("http://localhost/api/applications/" + IDS.applicationA + "/documents", {
        method: "POST",
        body: JSON.stringify({ documentId: IDS.documentA }),
      })
      const res = await appDocPost(req, { params: makeParams(IDS.applicationA) })
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.ok).toBe(true)

      // Check DB
      const link = await db.applicationDocument.findFirst({
        where: { applicationId: IDS.applicationA, documentId: IDS.documentA },
      })
      expect(link).toBeDefined()
    })

    test("User A cannot link User B's document to User A's application (returns 404)", async () => {
      mockCookieValue = await createSessionToken(IDS.accountA)
      const req = new Request("http://localhost/api/applications/" + IDS.applicationA + "/documents", {
        method: "POST",
        body: JSON.stringify({ documentId: IDS.documentB }),
      })
      const res = await appDocPost(req, { params: makeParams(IDS.applicationA) })
      expect(res.status).toBe(404)
    })

    test("User A cannot link User A's document to User B's application (returns 404)", async () => {
      mockCookieValue = await createSessionToken(IDS.accountA)
      const req = new Request("http://localhost/api/applications/" + IDS.applicationB + "/documents", {
        method: "POST",
        body: JSON.stringify({ documentId: IDS.documentA }),
      })
      const res = await appDocPost(req, { params: makeParams(IDS.applicationB) })
      expect(res.status).toBe(404)
    })

    test("Linking same document twice returns 409 conflict", async () => {
      mockCookieValue = await createSessionToken(IDS.accountA)
      // The link already exists due to seeding, so POST directly

      const req = new Request("http://localhost/api/applications/" + IDS.applicationA + "/documents", {
        method: "POST",
        body: JSON.stringify({ documentId: IDS.documentA }),
      })
      const res = await appDocPost(req, { params: makeParams(IDS.applicationA) })
      expect(res.status).toBe(409)
    })

    test("User A can unlink their own document from their own application", async () => {
      mockCookieValue = await createSessionToken(IDS.accountA)
      // Use the pre-seeded link directly

      const req = new Request("http://localhost/api/applications/" + IDS.applicationA + "/documents?documentId=" + IDS.documentA, {
        method: "DELETE",
      })
      const res = await appDocDelete(req, { params: makeParams(IDS.applicationA) })
      expect(res.status).toBe(200)

      // Verify deletion
      const count = await db.applicationDocument.count({ where: { id: IDS.appDocA } })
      expect(count).toBe(0)
    })

    test("User A cannot delete a link belonging to User B (returns 404)", async () => {
      mockCookieValue = await createSessionToken(IDS.accountA)

      const req = new Request("http://localhost/api/applications/" + IDS.applicationB + "/documents?documentId=" + IDS.documentB, {
        method: "DELETE",
      })
      const res = await appDocDelete(req, { params: makeParams(IDS.applicationB) })
      expect(res.status).toBe(404)

      // Link still exists
      const count = await db.applicationDocument.count({ where: { id: IDS.appDocB } })
      expect(count).toBe(1)
    })

    test("User A cannot unlink a document they own from an application they do not own (returns 404)", async () => {
      mockCookieValue = await createSessionToken(IDS.accountA)
      // Manually seed link between B's application and A's document
      const link = await db.applicationDocument.create({
        data: { applicationId: IDS.applicationB, documentId: IDS.documentA },
      })

      const req = new Request("http://localhost/api/applications/" + IDS.applicationB + "/documents?documentId=" + IDS.documentA, {
        method: "DELETE",
      })
      const res = await appDocDelete(req, { params: makeParams(IDS.applicationB) })
      expect(res.status).toBe(404)
    })
  })

  // ============================================================================
  // 2. NESTED DOCUMENT VERSIONS
  // ============================================================================
  describe("GET /api/documents/[id]/versions", () => {
    test("User A can load versions of their own document", async () => {
      mockCookieValue = await createSessionToken(IDS.accountA)
      const req = new Request("http://localhost/api/documents/" + IDS.documentA + "/versions")
      const res = await docVersionsGet(req, { params: makeParams(IDS.documentA) })
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.versions).toBeArray()
    })

    test("User A cannot load versions of User B's document (returns 404)", async () => {
      mockCookieValue = await createSessionToken(IDS.accountA)
      const req = new Request("http://localhost/api/documents/" + IDS.documentB + "/versions")
      const res = await docVersionsGet(req, { params: makeParams(IDS.documentB) })
      expect(res.status).toBe(404)
    })
  })

  // ============================================================================
  // 3. PROFILE CHILD REPLACEMENT
  // ============================================================================
  describe("PUT /api/profile", () => {
    test("Client-supplied custom userProfileId in payload is ignored and caller profileId is used", async () => {
      mockCookieValue = await createSessionToken(IDS.accountA)

      const req = new Request("http://localhost/api/profile", {
        method: "PUT",
        body: JSON.stringify({
          experiences: [
            {
              userProfileId: IDS.profileB, // try to inject/link to user B's profile
              title: "Injected Title",
              organization: "Injected Org",
            },
          ],
        }),
      })

      const res = await profilePut(req)
      expect(res.status).toBe(200)

      // Experience is created but belongs to profileA, NOT profileB
      const exp = await db.experience.findFirst({
        where: { title: "Injected Title" },
      })
      expect(exp).toBeDefined()
      expect(exp?.userProfileId).toBe(IDS.profileA) // caller profileId took precedence
      expect(exp?.userProfileId).not.toBe(IDS.profileB)
    })
  })
})
