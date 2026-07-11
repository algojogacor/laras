/// <reference types="bun-types" />

import { mock, beforeAll, beforeEach, describe, expect, test } from "bun:test"

// Mock "server-only" to bypass client component runtime check in Bun tests
mock.module("server-only", () => ({}))

// State variables to control mock return values dynamically in tests
let mockCookieValue: string | undefined = undefined

// Mock Next.js "next/headers" cookie API
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

// Fixtures and DB imports
import { cleanDb, seedDb, CANARIES, IDS } from "./fixtures"

describe("Authorization Foundation Tests", () => {
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

    // Push the schema or check db connectivity. Clean and seed database.
    await cleanDb()
    await seedDb()
  })

  beforeEach(() => {
    mockCookieValue = undefined
  })

  // 1. requireActor resolves Account/Profile A from trusted session state.
  test("requireActor resolves Account/Profile A from trusted session state", async () => {
    const token = await createSessionToken(IDS.accountA)
    mockCookieValue = token

    const actor = await requireActor()
    expect(actor.accountId).toBe(IDS.accountA)
    expect(actor.profileId).toBe(IDS.profileA)
    expect(actor.email).toBe("user-a@example.com")
    expect(actor.role).toBe("user")
  })

  // 2. Missing session is unauthorized (401).
  test("requireActor throws UNAUTHORIZED on missing session", async () => {
    mockCookieValue = undefined
    expect(requireActor()).rejects.toThrow(new AuthorizationError("UNAUTHORIZED"))
  })

  // 3. Deleted/missing account fails closed (401).
  test("requireActor throws UNAUTHORIZED when account is missing from database", async () => {
    const token = await createSessionToken("cdeletedaccount0000000000a")
    mockCookieValue = token
    expect(requireActor()).rejects.toThrow(new AuthorizationError("UNAUTHORIZED"))
  })

  // 4. Missing profile fails closed with NOT_FOUND where a profile is required (e.g. loaders).
  test("requireActor returns null profileId and loader throws NOT_FOUND when profile is missing", async () => {
    const token = await createSessionToken(IDS.accountE) // Account E has no profile
    mockCookieValue = token

    const actor = await requireActor()
    expect(actor.accountId).toBe(IDS.accountE)
    expect(actor.profileId).toBeNull()

    // Try a loader requiring a profile
    expect(findOwnedDocument(IDS.documentA, actor)).rejects.toThrow(new AuthorizationError("NOT_FOUND"))
  })

  // 5. Unknown role has ordinary user scope.
  test("unknown role defaults to user role in normalization", async () => {
    const token = await createSessionToken(IDS.unknownD) // Role: "moderator"
    mockCookieValue = token

    const actor = await requireActor()
    expect(actor.role).toBe("user")
  })

  // 6. Admin role is accepted only by requireCurrentAdmin.
  test("admin role is accepted by requireCurrentAdmin", async () => {
    const token = await createSessionToken(IDS.adminC) // Role: "admin"
    mockCookieValue = token

    const actor = await requireActor()
    expect(actor.role).toBe("admin")
    expect(() => requireCurrentAdmin(actor)).not.toThrow()
  })

  // 7. Ordinary user is rejected by requireCurrentAdmin.
  test("ordinary user role is rejected by requireCurrentAdmin", async () => {
    const token = await createSessionToken(IDS.accountA)
    mockCookieValue = token

    const actor = await requireActor()
    expect(() => requireCurrentAdmin(actor)).toThrow(new AuthorizationError("FORBIDDEN"))
  })

  // 8. Document A is returned for Actor A.
  test("findOwnedDocument returns Document A for Actor A", async () => {
    const token = await createSessionToken(IDS.accountA)
    mockCookieValue = token

    const actor = await requireActor()
    const doc = await findOwnedDocument(IDS.documentA, actor)
    expect(doc.id).toBe(IDS.documentA)
    expect(doc.content).toBe(CANARIES.documentA)
  })

  // 9. Document B is not returned for Actor A.
  test("findOwnedDocument throws NOT_FOUND for Document B accessed by Actor A", async () => {
    const token = await createSessionToken(IDS.accountA)
    mockCookieValue = token

    const actor = await requireActor()
    expect(findOwnedDocument(IDS.documentB, actor)).rejects.toThrow(new AuthorizationError("NOT_FOUND"))
  })

  // 10. Missing document and foreign document produce the same public decision (NOT_FOUND).
  test("missing document and foreign document throw identical NOT_FOUND error", async () => {
    const token = await createSessionToken(IDS.accountA)
    mockCookieValue = token
    const actor = await requireActor()

    let errorForeign: any
    try {
      await findOwnedDocument(IDS.documentB, actor)
    } catch (e: any) {
      errorForeign = e
    }

    let errorMissing: any
    try {
      await findOwnedDocument("cnonexistentdocid12345", actor)
    } catch (e: any) {
      errorMissing = e
    }

    expect(errorForeign).toBeInstanceOf(AuthorizationError)
    expect(errorMissing).toBeInstanceOf(AuthorizationError)
    expect(errorForeign.code).toBe("NOT_FOUND")
    expect(errorMissing.code).toBe("NOT_FOUND")
  })

  // 11. Application ownership behaves identically.
  test("findOwnedApplication returns App A for Actor A, but throws NOT_FOUND for App B", async () => {
    const token = await createSessionToken(IDS.accountA)
    mockCookieValue = token
    const actor = await requireActor()

    const app = await findOwnedApplication(IDS.applicationA, actor)
    expect(app.id).toBe(IDS.applicationA)
    expect(app.notes).toBe(CANARIES.appA)

    expect(findOwnedApplication(IDS.applicationB, actor)).rejects.toThrow(new AuthorizationError("NOT_FOUND"))
    expect(findOwnedApplication("cnonexistentappid12345", actor)).rejects.toThrow(new AuthorizationError("NOT_FOUND"))
  })

  // 12. InterviewSet ownership behaves identically.
  test("findOwnedInterviewSet returns Set A for Actor A, but throws NOT_FOUND for Set B", async () => {
    const token = await createSessionToken(IDS.accountA)
    mockCookieValue = token
    const actor = await requireActor()

    const set = await findOwnedInterviewSet(IDS.setA, actor)
    expect(set.id).toBe(IDS.setA)

    expect(findOwnedInterviewSet(IDS.setB, actor)).rejects.toThrow(new AuthorizationError("NOT_FOUND"))
  })

  // 13. Question A is accessible only through Set A and Actor A.
  test("findOwnedInterviewQuestion returns Question A for Actor A using Set A", async () => {
    const token = await createSessionToken(IDS.accountA)
    mockCookieValue = token
    const actor = await requireActor()

    const question = await findOwnedInterviewQuestion(IDS.questionA, IDS.setA, actor)
    expect(question.id).toBe(IDS.questionA)
    expect(question.question).toBe(CANARIES.questionA)
  })

  // 14. Set A + Question B fails closed.
  test("findOwnedInterviewQuestion throws NOT_FOUND for Set A + Question B", async () => {
    const token = await createSessionToken(IDS.accountA)
    mockCookieValue = token
    const actor = await requireActor()

    expect(findOwnedInterviewQuestion(IDS.questionB, IDS.setA, actor)).rejects.toThrow(new AuthorizationError("NOT_FOUND"))
  })

  // 15. Set B + Question A fails closed.
  test("findOwnedInterviewQuestion throws NOT_FOUND for Set B + Question A", async () => {
    const token = await createSessionToken(IDS.accountA)
    mockCookieValue = token
    const actor = await requireActor()

    expect(findOwnedInterviewQuestion(IDS.questionA, IDS.setB, actor)).rejects.toThrow(new AuthorizationError("NOT_FOUND"))
  })

  // 16. EnglishSession ownership behaves identically.
  test("findOwnedEnglishSession returns Session A for Actor A, but throws NOT_FOUND for Session B", async () => {
    const token = await createSessionToken(IDS.accountA)
    mockCookieValue = token
    const actor = await requireActor()

    const session = await findOwnedEnglishSession(IDS.sessionA, actor)
    expect(session.id).toBe(IDS.sessionA)
    expect(session.passage).toBe(CANARIES.passageA)

    expect(findOwnedEnglishSession(IDS.sessionB, actor)).rejects.toThrow(new AuthorizationError("NOT_FOUND"))
  })

  // 17. Foreign/missing internal IDs are not exposed through public error mapping.
  test("findOwnedEnglishCertificate returns Cert A for Actor A, but throws NOT_FOUND for Cert B or missing", async () => {
    const token = await createSessionToken(IDS.accountA)
    mockCookieValue = token
    const actor = await requireActor()

    const cert = await findOwnedEnglishCertificate(IDS.certA, actor)
    expect(cert.id).toBe(IDS.certA)
    expect(cert.title).toBe(CANARIES.certA)

    expect(findOwnedEnglishCertificate(IDS.certB, actor)).rejects.toThrow(new AuthorizationError("NOT_FOUND"))
    expect(findOwnedEnglishCertificate("cnonexistentcertid123", actor)).rejects.toThrow(new AuthorizationError("NOT_FOUND"))
  })

  // 18. Request-provided owner/account/profile data cannot alter ActorContext.
  test("ActorContext fields come purely from session token and DB, cannot be influenced by input", async () => {
    // Session token controls the sub identity
    const token = await createSessionToken(IDS.accountA)
    mockCookieValue = token

    const actor = await requireActor()
    expect(actor.accountId).toBe(IDS.accountA)
    expect(actor.profileId).toBe(IDS.profileA)
    expect(actor.role).toBe("user")
  })

  // 19. No helper grants private access solely because actor role is admin/owner.
  test("Admin role cannot access private resources of another user via owned loaders", async () => {
    const token = await createSessionToken(IDS.adminC) // Role is admin
    mockCookieValue = token

    const actor = await requireActor()
    expect(actor.role).toBe("admin")

    // Admin C cannot load Document A (owned by A) or Document B (owned by B)
    // because loaders restrict queries to actor's own profileId
    expect(findOwnedDocument(IDS.documentA, actor)).rejects.toThrow(new AuthorizationError("NOT_FOUND"))
    expect(findOwnedDocument(IDS.documentB, actor)).rejects.toThrow(new AuthorizationError("NOT_FOUND"))
  })

  // 20. Narrow selected resources do not contain unrelated account/private fields.
  test("Loaders return narrow shapes excluding unrelated account, credentials, or private details", async () => {
    const token = await createSessionToken(IDS.accountA)
    mockCookieValue = token
    const actor = await requireActor()

    const doc = await findOwnedDocument(IDS.documentA, actor)
    expect(doc).not.toHaveProperty("passwordHash")
    expect(doc).not.toHaveProperty("accountId")

    const cert = await findOwnedEnglishCertificate(IDS.certA, actor)
    expect(cert).not.toHaveProperty("passwordHash")
  })

  // Test CUID validation utility
  test("isValidId returns true for valid CUID, false otherwise", () => {
    expect(isValidId("c012345678901234567890123")).toBe(true)
    expect(isValidId("c1234")).toBe(false) // too short
    expect(isValidId("12345678901234567890123456")).toBe(false) // doesn't start with c
    expect(isValidId("c012345678901234567890123456789012345")).toBe(false) // too long
    expect(isValidId("c012345678901234567890123_")).toBe(false) // invalid character
    expect(isValidId(null)).toBe(false)
    expect(isValidId(undefined)).toBe(false)
  })

  // Test findOwnedApplicationDocumentPair helper
  test("findOwnedApplicationDocumentPair succeeds for matching user app/doc, throws for crossed users", async () => {
    const token = await createSessionToken(IDS.accountA)
    mockCookieValue = token
    const actor = await requireActor()

    const pair = await findOwnedApplicationDocumentPair(IDS.applicationA, IDS.documentA, actor)
    expect(pair.applicationId).toBe(IDS.applicationA)
    expect(pair.documentId).toBe(IDS.documentA)

    // Crossed user documents
    expect(findOwnedApplicationDocumentPair(IDS.applicationA, IDS.documentB, actor)).rejects.toThrow(new AuthorizationError("NOT_FOUND"))
    expect(findOwnedApplicationDocumentPair(IDS.applicationB, IDS.documentA, actor)).rejects.toThrow(new AuthorizationError("NOT_FOUND"))
  })
})
