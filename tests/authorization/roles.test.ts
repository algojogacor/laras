/// <reference types="bun-types" />

import { beforeAll, beforeEach, describe, expect, test } from "bun:test"
import { db } from "@/lib/db"
import { resetTestRuntime, testRuntime } from "./test-runtime"

// Dynamic imports
let createSessionToken: any
let normalizeRole: any
let isOwnerRole: any
let isAdminRole: any
let requireActor: any
let requireCurrentAdmin: any
let requireCurrentOwner: any
let AuthorizationError: any

import { cleanDb, seedDb, IDS } from "./fixtures"

describe("Phase 1D — Role Model and Governance Tests", () => {
  beforeAll(async () => {
    process.env.AUTH_SECRET = "test-auth-secret-key-32-chars-long-or-more"

    const authLib = await import("@/lib/auth")
    createSessionToken = authLib.createSessionToken

    const authorizationLib = await import("@/lib/authorization")
    normalizeRole = authorizationLib.normalizeRole
    isOwnerRole = authorizationLib.isOwnerRole
    isAdminRole = authorizationLib.isAdminRole
    requireActor = authorizationLib.requireActor
    requireCurrentAdmin = authorizationLib.requireCurrentAdmin
    requireCurrentOwner = authorizationLib.requireCurrentOwner
    AuthorizationError = authorizationLib.AuthorizationError

    await cleanDb()
    await seedDb()
  })

  beforeEach(async () => {
    resetTestRuntime()
    // Full clean + reseed for test isolation (some tests delete accounts)
    await cleanDb()
    await seedDb()
  })

  // ============================================================================
  // 1. ROLE NORMALIZATION
  // ============================================================================
  describe("normalizeRole — exact four-role contract", () => {
    test('exact "owner" returns "owner"', () => {
      expect(normalizeRole("owner")).toBe("owner")
    })

    test('exact "admin" returns "admin"', () => {
      expect(normalizeRole("admin")).toBe("admin")
    })

    test('exact "moderator" returns "moderator"', () => {
      expect(normalizeRole("moderator")).toBe("moderator")
    })

    test('exact "user" returns "user"', () => {
      expect(normalizeRole("user")).toBe("user")
    })

    test('uppercase "OWNER" fails closed to "user"', () => {
      expect(normalizeRole("OWNER")).toBe("user")
    })

    test('uppercase "ADMIN" fails closed to "user"', () => {
      expect(normalizeRole("ADMIN")).toBe("user")
    })

    test('uppercase "MODERATOR" fails closed to "user"', () => {
      expect(normalizeRole("MODERATOR")).toBe("user")
    })

    test('uppercase "USER" fails closed to "user"', () => {
      expect(normalizeRole("USER")).toBe("user")
    })

    test('whitespace " admin " fails closed to "user"', () => {
      expect(normalizeRole(" admin ")).toBe("user")
    })

    test('whitespace " owner " fails closed to "user"', () => {
      expect(normalizeRole(" owner ")).toBe("user")
    })

    test("empty string fails closed to user", () => {
      expect(normalizeRole("")).toBe("user")
    })

    test("null fails closed to user", () => {
      expect(normalizeRole(null)).toBe("user")
    })

    test("undefined fails closed to user", () => {
      expect(normalizeRole(undefined)).toBe("user")
    })

    test('unknown role "superadmin" fails closed to user', () => {
      expect(normalizeRole("superadmin")).toBe("user")
    })

    test('legacy malformed "role_admin" fails closed to user', () => {
      expect(normalizeRole("role_admin")).toBe("user")
    })

    test('prefix match "administrator" fails closed to user', () => {
      expect(normalizeRole("administrator")).toBe("user")
    })
  })

  // ============================================================================
  // 2. ROLE GUARD HELPERS
  // ============================================================================
  describe("isOwnerRole", () => {
    test('true for "owner"', () => expect(isOwnerRole("owner")).toBe(true))
    test('false for "admin"', () => expect(isOwnerRole("admin")).toBe(false))
    test('false for "moderator"', () => expect(isOwnerRole("moderator")).toBe(false))
    test('false for "user"', () => expect(isOwnerRole("user")).toBe(false))
    test("false for null", () => expect(isOwnerRole(null)).toBe(false))
    test("false for undefined", () => expect(isOwnerRole(undefined)).toBe(false))
    test('false for "OWNER"', () => expect(isOwnerRole("OWNER")).toBe(false))
  })

  describe("isAdminRole", () => {
    test('true for "owner"', () => expect(isAdminRole("owner")).toBe(true))
    test('true for "admin"', () => expect(isAdminRole("admin")).toBe(true))
    test('false for "moderator"', () => expect(isAdminRole("moderator")).toBe(false))
    test('false for "user"', () => expect(isAdminRole("user")).toBe(false))
    test("false for null", () => expect(isAdminRole(null)).toBe(false))
    test("false for undefined", () => expect(isAdminRole(undefined)).toBe(false))
  })

  // ============================================================================
  // 3. requireCurrentAdmin — permits owner + admin ONLY
  // ============================================================================
  describe("requireCurrentAdmin", () => {
    test("owner passes", async () => {
      testRuntime.cookieValue = await createSessionToken(IDS.ownerF)
      const actor = await requireActor()
      expect(() => requireCurrentAdmin(actor)).not.toThrow()
    })

    test("admin passes", async () => {
      testRuntime.cookieValue = await createSessionToken(IDS.adminC)
      const actor = await requireActor()
      expect(() => requireCurrentAdmin(actor)).not.toThrow()
    })

    test("moderator is denied", async () => {
      testRuntime.cookieValue = await createSessionToken(IDS.moderatorG)
      const actor = await requireActor()
      expect(actor.role).toBe("moderator")
      expect(() => requireCurrentAdmin(actor)).toThrow(new AuthorizationError("FORBIDDEN"))
    })

    test("user is denied", async () => {
      testRuntime.cookieValue = await createSessionToken(IDS.accountA)
      const actor = await requireActor()
      expect(() => requireCurrentAdmin(actor)).toThrow(new AuthorizationError("FORBIDDEN"))
    })

    test("unknown role is denied", async () => {
      // Set a truly unknown role on account A
      await db.account.update({ where: { id: IDS.accountA }, data: { role: "superadmin" } })
      testRuntime.cookieValue = await createSessionToken(IDS.accountA)
      const actor = await requireActor()
      expect(actor.role).toBe("user") // normalized
      expect(() => requireCurrentAdmin(actor)).toThrow(new AuthorizationError("FORBIDDEN"))
    })
  })

  // ============================================================================
  // 4. requireCurrentOwner — permits owner ONLY
  // ============================================================================
  describe("requireCurrentOwner", () => {
    test("owner passes", async () => {
      testRuntime.cookieValue = await createSessionToken(IDS.ownerF)
      const actor = await requireActor()
      expect(() => requireCurrentOwner(actor)).not.toThrow()
    })

    test("admin is denied", async () => {
      testRuntime.cookieValue = await createSessionToken(IDS.adminC)
      const actor = await requireActor()
      expect(() => requireCurrentOwner(actor)).toThrow(new AuthorizationError("FORBIDDEN"))
    })

    test("moderator is denied", async () => {
      testRuntime.cookieValue = await createSessionToken(IDS.moderatorG)
      const actor = await requireActor()
      expect(() => requireCurrentOwner(actor)).toThrow(new AuthorizationError("FORBIDDEN"))
    })

    test("user is denied", async () => {
      testRuntime.cookieValue = await createSessionToken(IDS.accountA)
      const actor = await requireActor()
      expect(() => requireCurrentOwner(actor)).toThrow(new AuthorizationError("FORBIDDEN"))
    })
  })

  // ============================================================================
  // 5. LIVE ROLE REFRESH — role from DB, not JWT
  // ============================================================================
  describe("live role refresh from database", () => {
    test("user promoted to moderator is recognized on next request", async () => {
      testRuntime.cookieValue = await createSessionToken(IDS.accountA)
      let actor = await requireActor()
      expect(actor.role).toBe("user")

      await db.account.update({ where: { id: IDS.accountA }, data: { role: "moderator" } })

      actor = await requireActor()
      expect(actor.role).toBe("moderator")
    })

    test("moderator promoted to admin receives admin access on next request", async () => {
      // Promote moderator to admin
      await db.account.update({ where: { id: IDS.moderatorG }, data: { role: "admin" } })

      testRuntime.cookieValue = await createSessionToken(IDS.moderatorG)
      const actor = await requireActor()
      expect(actor.role).toBe("admin")
      expect(() => requireCurrentAdmin(actor)).not.toThrow()
    })

    test("admin demoted to user loses admin access on next request", async () => {
      testRuntime.cookieValue = await createSessionToken(IDS.adminC)
      let actor = await requireActor()
      expect(actor.role).toBe("admin")

      await db.account.update({ where: { id: IDS.adminC }, data: { role: "user" } })

      actor = await requireActor()
      expect(actor.role).toBe("user")
      expect(() => requireCurrentAdmin(actor)).toThrow(new AuthorizationError("FORBIDDEN"))
    })

    test("old JWT cannot preserve stale admin privilege after demotion", async () => {
      // Create token while admin
      testRuntime.cookieValue = await createSessionToken(IDS.adminC)
      let actor = await requireActor()
      expect(actor.role).toBe("admin")

      // Demote in DB
      await db.account.update({ where: { id: IDS.adminC }, data: { role: "user" } })

      // Same token, next request — role reloaded from DB
      actor = await requireActor()
      expect(actor.role).toBe("user")
    })

    test("deleted account receives 401", async () => {
      testRuntime.cookieValue = await createSessionToken(IDS.accountA)
      let actor = await requireActor()
      expect(actor.accountId).toBe(IDS.accountA)

      // Delete the account
      await db.userProfile.deleteMany({ where: { accountId: IDS.accountA } })
      await db.account.delete({ where: { id: IDS.accountA } })

      // Next request must fail
      await expect(requireActor()).rejects.toThrow(new AuthorizationError("UNAUTHORIZED"))
    })

    test("unknown database role becomes user scope", async () => {
      // Set a truly unknown role that is NOT in the canonical set
      await db.account.update({ where: { id: IDS.accountA }, data: { role: "chieftain" } })
      testRuntime.cookieValue = await createSessionToken(IDS.accountA)
      const actor = await requireActor()
      expect(actor.role).toBe("user") // fail-closed
    })
  })
})
