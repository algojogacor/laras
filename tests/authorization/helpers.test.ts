/// <reference types="bun-types" />

import { beforeAll, beforeEach, describe, expect, test } from "bun:test"
import { db } from "@/lib/db"
import { resetTestRuntime, testRuntime } from "./test-runtime"

// Declare dynamic imports
let createSessionToken: any
let requireActor: any
let requireCurrentAdmin: any
let findOwnedDocument: any
let findOwnedApplication: any
let findOwnedInterviewSet: any
let findOwnedEnglishSession: any
let findOwnedEnglishCertificate: any
let findOwnedInterviewQuestion: any
let findOwnedApplicationDocumentPair: any
let AuthorizationError: any
let isValidId: any
let handleAuthorizationError: any

// Fixtures and DB imports
import { cleanDb, seedDb, CANARIES, IDS } from "./fixtures"

// Helper to mutate one character in a valid ID while keeping it syntactically valid
function getNonexistentId(validId: string): string {
  if (!validId || validId.length < 2) return "cyyyyyyyyyyyyyyyyyyyyyyyy"
  const char = validId[1]
  const newChar = char === "z" ? "y" : String.fromCharCode(char.charCodeAt(0) + 1)
  return "c" + newChar + validId.slice(2)
}

describe("Authorization Foundation Remediation Tests", () => {
  beforeAll(async () => {
    // Ensure test environment is verified and configured with test secret
    process.env.AUTH_SECRET = "test-auth-secret-key-32-chars-long-or-more"

    // Load modules dynamically after mocking is configured
    const authLib = await import("@/lib/auth")
    createSessionToken = authLib.createSessionToken

    const authorizationLib = await import("@/lib/authorization")
    requireActor = authorizationLib.requireActor
    requireCurrentAdmin = authorizationLib.requireCurrentAdmin
    findOwnedDocument = authorizationLib.findOwnedDocument
    findOwnedApplication = authorizationLib.findOwnedApplication
    findOwnedInterviewSet = authorizationLib.findOwnedInterviewSet
    findOwnedEnglishSession = authorizationLib.findOwnedEnglishSession
    findOwnedEnglishCertificate = authorizationLib.findOwnedEnglishCertificate
    findOwnedInterviewQuestion = authorizationLib.findOwnedInterviewQuestion
    findOwnedApplicationDocumentPair = authorizationLib.findOwnedApplicationDocumentPair
    AuthorizationError = authorizationLib.AuthorizationError
    isValidId = authorizationLib.isValidId
    handleAuthorizationError = authorizationLib.handleAuthorizationError

    // Clean and seed database.
    await cleanDb()
    await seedDb()
  })

  beforeEach(async () => {
    resetTestRuntime()
    // Reset Account A and Admin C roles back to their default seed roles
    await db.account.update({
      where: { id: IDS.accountA },
      data: { role: "user" },
    })
    await db.account.update({
      where: { id: IDS.adminC },
      data: { role: "admin" },
    })
  })

  // ============================================================================
  // 1. ROLE NORMALIZATION & ACTOR CONTEXT
  // ============================================================================

  test("requireActor resolves Account/Profile A from trusted session token", async () => {
    const token = await createSessionToken(IDS.accountA)
    testRuntime.cookieValue = token

    const actor = await requireActor()
    expect(actor.accountId).toBe(IDS.accountA)
    expect(actor.profileId).toBe(IDS.profileA)
    expect(actor.email).toBe("user-a@example.com")
    expect(actor.role).toBe("user")
  })

  test("exact DB value 'admin' matches admin normalized role", async () => {
    const token = await createSessionToken(IDS.adminC) // Role: "admin"
    testRuntime.cookieValue = token
    const actor = await requireActor()
    expect(actor.role).toBe("admin")
    expect(() => requireCurrentAdmin(actor)).not.toThrow()
  })

  test("exact DB value 'owner' matches owner normalized role", async () => {
    // Temporarily update Admin C's role to "owner"
    await db.account.update({
      where: { id: IDS.adminC },
      data: { role: "owner" },
    })
    const token = await createSessionToken(IDS.adminC)
    testRuntime.cookieValue = token
    const actor = await requireActor()
    expect(actor.role).toBe("owner")
    expect(() => requireCurrentAdmin(actor)).not.toThrow()
  })

  test("exact DB value 'user' matches user normalized role", async () => {
    const token = await createSessionToken(IDS.accountA) // Role: "user"
    testRuntime.cookieValue = token
    const actor = await requireActor()
    expect(actor.role).toBe("user")
    expect(() => requireCurrentAdmin(actor)).toThrow(new AuthorizationError("FORBIDDEN"))
  })

  test("malformed role values fail closed to user scope and are forbidden from admin routes", async () => {
    const invalidRoles = [
      "Admin",
      " ADMIN ",
      "Owner",
      " owner ",
      "moderator",
      "",
    ]

    for (const r of invalidRoles) {
      await db.account.update({
        where: { id: IDS.accountA },
        data: { role: r },
      })
      const token = await createSessionToken(IDS.accountA)
      testRuntime.cookieValue = token
      const actor = await requireActor()
      expect(actor.role).toBe("user")
      expect(() => requireCurrentAdmin(actor)).toThrow(new AuthorizationError("FORBIDDEN"))
    }
  })

  test("role comes from database lookup, not trusted from session token", async () => {
    const token = await createSessionToken(IDS.accountA)
    testRuntime.cookieValue = token

    // Initially "user"
    let actor = await requireActor()
    expect(actor.role).toBe("user")

    // Update in DB
    await db.account.update({
      where: { id: IDS.accountA },
      data: { role: "admin" },
    })

    // Next request should get normalized "admin" role
    actor = await requireActor()
    expect(actor.role).toBe("admin")
  })

  test("missing account from DB fails closed with UNAUTHORIZED", async () => {
    const token = await createSessionToken("cdeletedaccount0000000000a")
    testRuntime.cookieValue = token
    expect(requireActor()).rejects.toThrow(new AuthorizationError("UNAUTHORIZED"))
  })

  test("missing profile fails closed with NOT_FOUND on owned resource loaders", async () => {
    const token = await createSessionToken(IDS.accountE) // Account E has no profile
    testRuntime.cookieValue = token
    const actor = await requireActor()
    expect(actor.profileId).toBeNull()

    expect(findOwnedDocument(IDS.documentA, actor)).rejects.toThrow(new AuthorizationError("NOT_FOUND"))
  })

  test("token for Account A cannot produce Account B context", async () => {
    const token = await createSessionToken(IDS.accountA)
    testRuntime.cookieValue = token
    const actor = await requireActor()
    expect(actor.accountId).not.toBe(IDS.accountB)
    expect(actor.profileId).not.toBe(IDS.profileB)
  })

  // ============================================================================
  // 2. ID VALIDATION (isValidId)
  // ============================================================================

  test("isValidId validates standard CUID1 format strictly", () => {
    // Valid cases
    expect(isValidId(IDS.documentA)).toBe(true)
    expect(isValidId(IDS.profileB)).toBe(true)
    expect(isValidId("clygl3nco0000y81cfxtdtrw1")).toBe(true)

    // Invalid cases
    expect(isValidId("c1234")).toBe(false) // too short
    expect(isValidId("clygl3nco0000y81cfxtdtrw123")).toBe(false) // too long
    expect(isValidId("1lygl3nco0000y81cfxtdtrw1")).toBe(false) // doesn't start with c
    expect(isValidId("Clygl3nco0000y81cfxtdtrw1")).toBe(false) // uppercase C
    expect(isValidId("clygl3nco0000Y81cfxtdtrw1")).toBe(false) // uppercase chars
    expect(isValidId("clygl3nco0000y81cfxtdtrw ")).toBe(false) // contains whitespace
    expect(isValidId("clygl-nco0000y81cfxtdtrw1")).toBe(false) // contains hyphen
    expect(isValidId("clygl_nco0000y81cfxtdtrw1")).toBe(false) // contains underscore
    expect(isValidId("")).toBe(false) // empty string
    expect(isValidId(null)).toBe(false)
    expect(isValidId(undefined)).toBe(false)
    expect(isValidId(123 as any)).toBe(false) // not string
  })

  // ============================================================================
  // 3. EXHAUSTIVE SAFE HTTP ERROR MAPPING
  // ============================================================================

  test("handleAuthorizationError maps errors to exact HTTP response shapes", async () => {
    const cases: { code: any; status: number; errorStr: string }[] = [
      { code: "UNAUTHORIZED", status: 401, errorStr: "unauthorized" },
      { code: "FORBIDDEN", status: 403, errorStr: "forbidden" },
      { code: "NOT_FOUND", status: 404, errorStr: "not-found" },
      { code: "BAD_REQUEST", status: 400, errorStr: "invalid-id" },
      { code: "CONFLICT", status: 409, errorStr: "conflict" },
    ]

    for (const c of cases) {
      const err = new AuthorizationError(c.code, "Secret internal error message detail")
      const resp = handleAuthorizationError(err)
      expect(resp.status).toBe(c.status)
      expect(resp.headers.get("content-type")).toContain("application/json")
      const body = await resp.json()
      expect(body).toEqual({ error: c.errorStr })
      // Verify no extra/message fields leaked
      expect(Object.keys(body)).toEqual(["error"])
    }

    // Non-AuthorizationError test
    const genericErr = new Error("Database query failed: unique constraint at row 42")
    const genericResp = handleAuthorizationError(genericErr)
    expect(genericResp.status).toBe(500)
    const genericBody = await genericResp.json()
    expect(genericBody).toEqual({ error: "internal-server-error" })
    expect(Object.keys(genericBody)).toEqual(["error"])
  })

  // ============================================================================
  // 4. RESOURCE LOADERS COMPREHENSIVE COVERAGE
  // ============================================================================

  const loaders = [
    { name: "findOwnedDocument", fn: (id: string, actor: any) => findOwnedDocument(id, actor), validId: () => IDS.documentA, foreignId: () => IDS.documentB },
    { name: "findOwnedApplication", fn: (id: string, actor: any) => findOwnedApplication(id, actor), validId: () => IDS.applicationA, foreignId: () => IDS.applicationB },
    { name: "findOwnedInterviewSet", fn: (id: string, actor: any) => findOwnedInterviewSet(id, actor), validId: () => IDS.setA, foreignId: () => IDS.setB },
    { name: "findOwnedEnglishSession", fn: (id: string, actor: any) => findOwnedEnglishSession(id, actor), validId: () => IDS.sessionA, foreignId: () => IDS.sessionB },
    { name: "findOwnedEnglishCertificate", fn: (id: string, actor: any) => findOwnedEnglishCertificate(id, actor), validId: () => IDS.certA, foreignId: () => IDS.certB },
  ]

  for (const loader of loaders) {
    describe(loader.name, () => {
      test("succeeds for owner", async () => {
        const token = await createSessionToken(IDS.accountA)
        testRuntime.cookieValue = token
        const actor = await requireActor()

        const resource = await loader.fn(loader.validId(), actor)
        expect(resource.id).toBe(loader.validId())
      })

      test("throws NOT_FOUND for foreign valid ID", async () => {
        const token = await createSessionToken(IDS.accountA)
        testRuntime.cookieValue = token
        const actor = await requireActor()

        expect(loader.fn(loader.foreignId(), actor)).rejects.toThrow(new AuthorizationError("NOT_FOUND"))
      })

      test("throws NOT_FOUND for syntactically valid missing ID", async () => {
        const token = await createSessionToken(IDS.accountA)
        testRuntime.cookieValue = token
        const actor = await requireActor()

        const missingId = getNonexistentId(loader.validId())
        expect(loader.fn(missingId, actor)).rejects.toThrow(new AuthorizationError("NOT_FOUND"))
      })

      test("throws BAD_REQUEST for malformed ID", async () => {
        const token = await createSessionToken(IDS.accountA)
        testRuntime.cookieValue = token
        const actor = await requireActor()

        const malformedId = "clygl3nco" // too short
        expect(loader.fn(malformedId, actor)).rejects.toThrow(new AuthorizationError("BAD_REQUEST"))
      })

      test("exhibits narrow projection without account fields, passwordHash, session details, or role leakage", async () => {
        const token = await createSessionToken(IDS.accountA)
        testRuntime.cookieValue = token
        const actor = await requireActor()

        const resource = await loader.fn(loader.validId(), actor)
        expect(resource).not.toHaveProperty("passwordHash")
        expect(resource).not.toHaveProperty("accountId")
        expect(resource).not.toHaveProperty("email")
        if (loader.name !== "findOwnedInterviewSet") {
          expect(resource).not.toHaveProperty("role")
        }
        expect(resource).not.toHaveProperty("account")
        expect(resource).not.toHaveProperty("userProfile")
      })

      test("denies access to admin / owner role actors", async () => {
        // Admin C cannot bypass owner checks to query User A's resource
        const token = await createSessionToken(IDS.adminC)
        testRuntime.cookieValue = token
        const actor = await requireActor()
        expect(actor.role).toBe("admin")

        expect(loader.fn(loader.validId(), actor)).rejects.toThrow(new AuthorizationError("NOT_FOUND"))
      })
    })
  }

  // ============================================================================
  // 5. NESTED RESOURCE LOADERS COVERAGE
  // ============================================================================

  describe("findOwnedInterviewQuestion", () => {
    test("succeeds for matching parent + child belonging to owner", async () => {
      const token = await createSessionToken(IDS.accountA)
      testRuntime.cookieValue = token
      const actor = await requireActor()

      const q = await findOwnedInterviewQuestion(IDS.questionA, IDS.setA, actor)
      expect(q.id).toBe(IDS.questionA)
      expect(q.interviewSetId).toBe(IDS.setA)
      expect(q.question).toBe(CANARIES.questionA)
    })

    test("throws NOT_FOUND for Set A + Question B (wrong child)", async () => {
      const token = await createSessionToken(IDS.accountA)
      testRuntime.cookieValue = token
      const actor = await requireActor()

      expect(findOwnedInterviewQuestion(IDS.questionB, IDS.setA, actor)).rejects.toThrow(new AuthorizationError("NOT_FOUND"))
    })

    test("throws NOT_FOUND for Set B + Question A (foreign parent)", async () => {
      const token = await createSessionToken(IDS.accountA)
      testRuntime.cookieValue = token
      const actor = await requireActor()

      expect(findOwnedInterviewQuestion(IDS.questionA, IDS.setB, actor)).rejects.toThrow(new AuthorizationError("NOT_FOUND"))
    })

    test("throws NOT_FOUND for syntactically valid missing set or question", async () => {
      const token = await createSessionToken(IDS.accountA)
      testRuntime.cookieValue = token
      const actor = await requireActor()

      const missingQuestionId = getNonexistentId(IDS.questionA)
      const missingSetId = getNonexistentId(IDS.setA)

      expect(findOwnedInterviewQuestion(missingQuestionId, IDS.setA, actor)).rejects.toThrow(new AuthorizationError("NOT_FOUND"))
      expect(findOwnedInterviewQuestion(IDS.questionA, missingSetId, actor)).rejects.toThrow(new AuthorizationError("NOT_FOUND"))
    })

    test("throws BAD_REQUEST for malformed parent or child ID", async () => {
      const token = await createSessionToken(IDS.accountA)
      testRuntime.cookieValue = token
      const actor = await requireActor()

      expect(findOwnedInterviewQuestion("cshortq", IDS.setA, actor)).rejects.toThrow(new AuthorizationError("BAD_REQUEST"))
      expect(findOwnedInterviewQuestion(IDS.questionA, "cshortset", actor)).rejects.toThrow(new AuthorizationError("BAD_REQUEST"))
    })

    test("denies admin/owner access", async () => {
      const token = await createSessionToken(IDS.adminC)
      testRuntime.cookieValue = token
      const actor = await requireActor()

      expect(findOwnedInterviewQuestion(IDS.questionA, IDS.setA, actor)).rejects.toThrow(new AuthorizationError("NOT_FOUND"))
    })
  })

  describe("findOwnedApplicationDocumentPair", () => {
    test("succeeds for matching App A + Document A owned by caller", async () => {
      const token = await createSessionToken(IDS.accountA)
      testRuntime.cookieValue = token
      const actor = await requireActor()

      const pair = await findOwnedApplicationDocumentPair(IDS.applicationA, IDS.documentA, actor)
      expect(pair.applicationId).toBe(IDS.applicationA)
      expect(pair.documentId).toBe(IDS.documentA)
    })

    test("throws NOT_FOUND for App A + Document B (crossed owners)", async () => {
      const token = await createSessionToken(IDS.accountA)
      testRuntime.cookieValue = token
      const actor = await requireActor()

      expect(findOwnedApplicationDocumentPair(IDS.applicationA, IDS.documentB, actor)).rejects.toThrow(new AuthorizationError("NOT_FOUND"))
    })

    test("throws NOT_FOUND for App B + Document A (crossed owners)", async () => {
      const token = await createSessionToken(IDS.accountA)
      testRuntime.cookieValue = token
      const actor = await requireActor()

      expect(findOwnedApplicationDocumentPair(IDS.applicationB, IDS.documentA, actor)).rejects.toThrow(new AuthorizationError("NOT_FOUND"))
    })

    test("throws NOT_FOUND for valid missing parent/child", async () => {
      const token = await createSessionToken(IDS.accountA)
      testRuntime.cookieValue = token
      const actor = await requireActor()

      const missingAppId = getNonexistentId(IDS.applicationA)
      const missingDocId = getNonexistentId(IDS.documentA)

      expect(findOwnedApplicationDocumentPair(missingAppId, IDS.documentA, actor)).rejects.toThrow(new AuthorizationError("NOT_FOUND"))
      expect(findOwnedApplicationDocumentPair(IDS.applicationA, missingDocId, actor)).rejects.toThrow(new AuthorizationError("NOT_FOUND"))
    })

    test("throws BAD_REQUEST for malformed parent or child ID", async () => {
      const token = await createSessionToken(IDS.accountA)
      testRuntime.cookieValue = token
      const actor = await requireActor()

      expect(findOwnedApplicationDocumentPair("cshortapp", IDS.documentA, actor)).rejects.toThrow(new AuthorizationError("BAD_REQUEST"))
      expect(findOwnedApplicationDocumentPair(IDS.applicationA, "cshortdoc", actor)).rejects.toThrow(new AuthorizationError("BAD_REQUEST"))
    })

    test("denies admin/owner access", async () => {
      const token = await createSessionToken(IDS.adminC)
      testRuntime.cookieValue = token
      const actor = await requireActor()

      expect(findOwnedApplicationDocumentPair(IDS.applicationA, IDS.documentA, actor)).rejects.toThrow(new AuthorizationError("NOT_FOUND"))
    })
  })
})
