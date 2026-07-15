/// <reference types="bun-types" />

import { beforeAll, beforeEach, describe, expect, test } from "bun:test"
import { db } from "@/lib/db"
import { resetTestRuntime, testRuntime } from "./test-runtime"

// Dynamic imports
let createSessionToken: any
let requireActor: any
let AuthorizationError: any
let hasCapability: any
let requireCapability: any
let getEffectiveCapabilities: any
let hasDefaultCapability: any
let CAPABILITIES: any
let DEFAULT_ROLE_CAPABILITIES: any

import { cleanDb, seedDb, IDS } from "./fixtures"

describe("Phase 4A — Granular Capability and Permission Engine", () => {
  beforeAll(async () => {
    process.env.AUTH_SECRET = "test-auth-secret-key-32-chars-long-or-more"

    const authLib = await import("@/lib/auth")
    createSessionToken = authLib.createSessionToken

    const authorizationLib = await import("@/lib/authorization")
    requireActor = authorizationLib.requireActor
    AuthorizationError = authorizationLib.AuthorizationError

    const permissionsLib = await import("@/lib/permissions")
    hasCapability = permissionsLib.hasCapability
    requireCapability = permissionsLib.requireCapability
    getEffectiveCapabilities = permissionsLib.getEffectiveCapabilities
    hasDefaultCapability = permissionsLib.hasDefaultCapability
    CAPABILITIES = permissionsLib.CAPABILITIES
    DEFAULT_ROLE_CAPABILITIES = permissionsLib.DEFAULT_ROLE_CAPABILITIES

    // Seed permissions into DB
    const { PrismaClient } = await import("@prisma/client")
    const seedDb2 = new PrismaClient()

    // Seed Permission rows and RolePermission defaults
    const caps = Object.values(CAPABILITIES) as string[]
    for (const c of caps) {
      await seedDb2.permission.upsert({
        where: { capability: c },
        update: {},
        create: { capability: c, description: `Test: ${c}` },
      })
    }

    // Seed default role-permission mappings
    for (const role of ["owner", "admin", "moderator", "user"]) {
      const roleDefaults = (DEFAULT_ROLE_CAPABILITIES as Record<string, ReadonlySet<string>>)[role]
      for (const c of caps) {
        const granted = roleDefaults.has(c)
        await seedDb2.rolePermission.upsert({
          where: { role_capability: { role, capability: c } },
          update: { granted },
          create: { role, capability: c, granted },
        })
      }
    }

    await seedDb2.$disconnect()

    await cleanDb()
    await seedDb()
  })

  beforeEach(async () => {
    resetTestRuntime()
    await cleanDb()
    await seedDb()
  })

  // ============================================================================
  // 1. DEFAULT ROLE-TO-CAPABILITY MAPPINGS
  // ============================================================================
  describe("Default role-to-capability mappings", () => {
    test("owner has all defined capabilities", () => {
      const allCaps = Object.values(CAPABILITIES) as string[]
      const ownerCaps = DEFAULT_ROLE_CAPABILITIES["owner"] as ReadonlySet<string>
      for (const c of allCaps) {
        expect(ownerCaps.has(c)).toBe(true)
      }
    })

    test("admin has most capabilities but not roles.manage", () => {
      const adminCaps = DEFAULT_ROLE_CAPABILITIES["admin"] as ReadonlySet<string>
      expect(adminCaps.has("roles.manage")).toBe(false)
      expect(adminCaps.has("users.read")).toBe(true)
      expect(adminCaps.has("announcements.manage")).toBe(true)
      expect(adminCaps.has("licenses.manage")).toBe(true)
      expect(adminCaps.has("verification.manage")).toBe(true)
    })

    test("admin does not have system.maintenance", () => {
      const adminCaps = DEFAULT_ROLE_CAPABILITIES["admin"] as ReadonlySet<string>
      expect(adminCaps.has("system.maintenance")).toBe(false)
    })

    test("moderator has moderation.*, users.read, audit.read, content.review", () => {
      const modCaps = DEFAULT_ROLE_CAPABILITIES["moderator"] as ReadonlySet<string>
      expect(modCaps.has("moderation.cases.read")).toBe(true)
      expect(modCaps.has("moderation.cases.manage")).toBe(true)
      expect(modCaps.has("moderation.appeals.read")).toBe(true)
      expect(modCaps.has("moderation.appeals.manage")).toBe(true)
      expect(modCaps.has("users.read")).toBe(true)
      expect(modCaps.has("audit.read")).toBe(true)
      expect(modCaps.has("content.review")).toBe(true)
    })

    test("moderator does not have roles.manage or announcements.manage", () => {
      const modCaps = DEFAULT_ROLE_CAPABILITIES["moderator"] as ReadonlySet<string>
      expect(modCaps.has("roles.manage")).toBe(false)
      expect(modCaps.has("announcements.manage")).toBe(false)
      expect(modCaps.has("licenses.manage")).toBe(false)
      expect(modCaps.has("verification.manage")).toBe(false)
    })

    test("user has no admin capabilities", () => {
      const userCaps = DEFAULT_ROLE_CAPABILITIES["user"] as ReadonlySet<string>
      expect(userCaps.size).toBe(0)
    })
  })

  // ============================================================================
  // 2. hasCapability — ROLE-BASED
  // ============================================================================
  describe("hasCapability — role-based resolution", () => {
    test("owner has roles.manage capability", async () => {
      testRuntime.cookieValue = await createSessionToken(IDS.ownerF)
      const actor = await requireActor()
      expect(actor.role).toBe("owner")
      const result = await hasCapability(actor, "roles.manage")
      expect(result).toBe(true)
    })

    test("admin is denied roles.manage (owner-only)", async () => {
      testRuntime.cookieValue = await createSessionToken(IDS.adminC)
      const actor = await requireActor()
      expect(actor.role).toBe("admin")
      const result = await hasCapability(actor, "roles.manage")
      expect(result).toBe(false)
    })

    test("admin has users.read", async () => {
      testRuntime.cookieValue = await createSessionToken(IDS.adminC)
      const actor = await requireActor()
      const result = await hasCapability(actor, "users.read")
      expect(result).toBe(true)
    })

    test("moderator has moderation.cases.read", async () => {
      testRuntime.cookieValue = await createSessionToken(IDS.moderatorG)
      const actor = await requireActor()
      const result = await hasCapability(actor, "moderation.cases.read")
      expect(result).toBe(true)
    })

    test("moderator is denied roles.manage", async () => {
      testRuntime.cookieValue = await createSessionToken(IDS.moderatorG)
      const actor = await requireActor()
      const result = await hasCapability(actor, "roles.manage")
      expect(result).toBe(false)
    })

    test("moderator is denied announcements.manage", async () => {
      testRuntime.cookieValue = await createSessionToken(IDS.moderatorG)
      const actor = await requireActor()
      const result = await hasCapability(actor, "announcements.manage")
      expect(result).toBe(false)
    })

    test("user has no admin capabilities", async () => {
      testRuntime.cookieValue = await createSessionToken(IDS.accountA)
      const actor = await requireActor()
      expect(actor.role).toBe("user")
      const result = await hasCapability(actor, "users.read")
      expect(result).toBe(false)
    })

    test("unknown capability is denied for all roles", async () => {
      testRuntime.cookieValue = await createSessionToken(IDS.ownerF)
      const actor = await requireActor()
      const result = await hasCapability(actor, "nonexistent.capability")
      expect(result).toBe(false)
    })
  })

  // ============================================================================
  // 3. requireCapability — THROWS ON DENY
  // ============================================================================
  describe("requireCapability", () => {
    test("owner passes requireCapability for roles.manage", async () => {
      testRuntime.cookieValue = await createSessionToken(IDS.ownerF)
      const actor = await requireActor()
      await expect(requireCapability(actor, "roles.manage")).resolves.toBeUndefined()
    })

    test("admin throws FORBIDDEN for roles.manage", async () => {
      testRuntime.cookieValue = await createSessionToken(IDS.adminC)
      const actor = await requireActor()
      await expect(requireCapability(actor, "roles.manage")).rejects.toThrow(
        new AuthorizationError("FORBIDDEN")
      )
    })

    test("moderator throws FORBIDDEN for announcements.manage", async () => {
      testRuntime.cookieValue = await createSessionToken(IDS.moderatorG)
      const actor = await requireActor()
      await expect(requireCapability(actor, "announcements.manage")).rejects.toThrow(
        new AuthorizationError("FORBIDDEN")
      )
    })

    test("user throws FORBIDDEN for any admin capability", async () => {
      testRuntime.cookieValue = await createSessionToken(IDS.accountA)
      const actor = await requireActor()
      await expect(requireCapability(actor, "users.read")).rejects.toThrow(
        new AuthorizationError("FORBIDDEN")
      )
    })

    test("unknown capability throws FORBIDDEN even for owner", async () => {
      testRuntime.cookieValue = await createSessionToken(IDS.ownerF)
      const actor = await requireActor()
      await expect(requireCapability(actor, "nonexistent.capability")).rejects.toThrow(
        new AuthorizationError("FORBIDDEN")
      )
    })
  })

  // ============================================================================
  // 4. getEffectiveCapabilities — MERGED SET
  // ============================================================================
  describe("getEffectiveCapabilities", () => {
    test("owner gets many capabilities", async () => {
      testRuntime.cookieValue = await createSessionToken(IDS.ownerF)
      const actor = await requireActor()
      const caps = await getEffectiveCapabilities(actor)
      expect(caps.size).toBeGreaterThan(10)
      expect(caps.has("roles.manage")).toBe(true)
      expect(caps.has("users.read")).toBe(true)
    })

    test("admin gets capabilities without roles.manage", async () => {
      testRuntime.cookieValue = await createSessionToken(IDS.adminC)
      const actor = await requireActor()
      const caps = await getEffectiveCapabilities(actor)
      expect(caps.has("users.read")).toBe(true)
      expect(caps.has("roles.manage")).toBe(false)
      expect(caps.has("announcements.manage")).toBe(true)
    })

    test("moderator gets moderation.* only", async () => {
      testRuntime.cookieValue = await createSessionToken(IDS.moderatorG)
      const actor = await requireActor()
      const caps = await getEffectiveCapabilities(actor)
      expect(caps.has("moderation.cases.read")).toBe(true)
      expect(caps.has("users.read")).toBe(true)
      expect(caps.has("announcements.manage")).toBe(false)
      expect(caps.has("roles.manage")).toBe(false)
    })

    test("user gets empty set", async () => {
      testRuntime.cookieValue = await createSessionToken(IDS.accountA)
      const actor = await requireActor()
      const caps = await getEffectiveCapabilities(actor)
      // User should have no admin capabilities, but may include scoped assignments (none seeded)
      expect(caps.has("roles.manage")).toBe(false)
      expect(caps.has("announcements.manage")).toBe(false)
    })
  })

  // ============================================================================
  // 5. SCOPED ASSIGNMENTS
  // ============================================================================
  describe("Scoped assignments", () => {
    test("scoped assignment grants capability with matching scope", async () => {
      // Grant user A a scoped assignment for moderation.cases.read
      await db.scopedAssignment.create({
        data: {
          accountId: IDS.accountA,
          capability: "moderation.cases.read",
          scope: "community:abc123",
          grantedById: IDS.ownerF,
        },
      })

      testRuntime.cookieValue = await createSessionToken(IDS.accountA)
      const actor = await requireActor()

      const result = await hasCapability(actor, "moderation.cases.read", "community:abc123")
      expect(result).toBe(true)
    })

    test("scoped assignment denies with non-matching scope", async () => {
      // Grant user A a scoped assignment for moderation.cases.read with "community:abc123"
      await db.scopedAssignment.create({
        data: {
          accountId: IDS.accountA,
          capability: "moderation.cases.read",
          scope: "community:abc123",
          grantedById: IDS.ownerF,
        },
      })

      testRuntime.cookieValue = await createSessionToken(IDS.accountA)
      const actor = await requireActor()

      // Request with different scope — scoped assignment does NOT match
      const result = await hasCapability(actor, "moderation.cases.read", "community:xyz999")
      // User role does not have this capability, and scoped assignment scope doesn't match
      expect(result).toBe(false)
    })

    test("scoped assignment without scope filter grants any scope", async () => {
      // Grant user A a scoped assignment without a specific scope
      await db.scopedAssignment.create({
        data: {
          accountId: IDS.accountA,
          capability: "moderation.cases.read",
          scope: null,
          grantedById: IDS.ownerF,
        },
      })

      testRuntime.cookieValue = await createSessionToken(IDS.accountA)
      const actor = await requireActor()

      // No scope filter requested — any assignment works
      const result = await hasCapability(actor, "moderation.cases.read")
      expect(result).toBe(true)
    })

    test("expired scoped assignment is denied", async () => {
      const pastDate = new Date(Date.now() - 86400000) // yesterday
      await db.scopedAssignment.create({
        data: {
          accountId: IDS.accountA,
          capability: "moderation.cases.read",
          scope: null,
          grantedById: IDS.ownerF,
          expiresAt: pastDate,
        },
      })

      testRuntime.cookieValue = await createSessionToken(IDS.accountA)
      const actor = await requireActor()

      const result = await hasCapability(actor, "moderation.cases.read")
      expect(result).toBe(false)
    })

    test("non-expired scoped assignment is granted", async () => {
      const futureDate = new Date(Date.now() + 86400000) // tomorrow
      await db.scopedAssignment.create({
        data: {
          accountId: IDS.accountA,
          capability: "moderation.cases.read",
          scope: null,
          grantedById: IDS.ownerF,
          expiresAt: futureDate,
        },
      })

      testRuntime.cookieValue = await createSessionToken(IDS.accountA)
      const actor = await requireActor()

      const result = await hasCapability(actor, "moderation.cases.read")
      expect(result).toBe(true)
    })
  })

  // ============================================================================
  // 6. hasDefaultCapability — SYNCHRONOUS FALLBACK
  // ============================================================================
  describe("hasDefaultCapability — synchronous", () => {
    test("owner has roles.manage", () => {
      expect(hasDefaultCapability("owner", "roles.manage")).toBe(true)
    })

    test("admin does not have roles.manage", () => {
      expect(hasDefaultCapability("admin", "roles.manage")).toBe(false)
    })

    test("moderator has moderation.cases.read", () => {
      expect(hasDefaultCapability("moderator", "moderation.cases.read")).toBe(true)
    })

    test("user does not have any admin capability", () => {
      expect(hasDefaultCapability("user", "users.read")).toBe(false)
      expect(hasDefaultCapability("user", "announcements.manage")).toBe(false)
    })

    test("unknown role returns false (deny-by-default)", () => {
      expect(hasDefaultCapability("superadmin", "users.read")).toBe(false)
    })

    test("unknown capability returns false for any role", () => {
      expect(hasDefaultCapability("owner", "nonexistent.capability")).toBe(false)
    })
  })

  // ============================================================================
  // 7. DENY-BY-DEFAULT FOR UNKNOWN ROLES
  // ============================================================================
  describe("Deny-by-default", () => {
    test("unknown role string fails closed in hasCapability", async () => {
      await db.account.update({
        where: { id: IDS.accountA },
        data: { role: "superadmin" },
      })

      testRuntime.cookieValue = await createSessionToken(IDS.accountA)
      const actor = await requireActor()
      // Unknown role normalizes to "user" by authorization rules, but let's test
      // that an unknown role in the permissions system gets denied
      expect(actor.role).toBe("user") // normalization kicks in

      // Even if we construct a synthetic actor with a truly unknown role
      const unknownActor = { ...actor, role: "superadmin" as any }
      const result = await hasCapability(unknownActor, "users.read")
      expect(result).toBe(false)
    })

    test("deny-by-default in requireCapability for unknown capability", async () => {
      testRuntime.cookieValue = await createSessionToken(IDS.ownerF)
      const actor = await requireActor()
      await expect(requireCapability(actor, "this.does.not.exist")).rejects.toThrow(
        new AuthorizationError("FORBIDDEN")
      )
    })
  })

  // ============================================================================
  // 8. LIVE ROLE CHANGE REFLECTS IN CAPABILITIES
  // ============================================================================
  describe("Live role change reflects in capabilities", () => {
    test("user promoted to admin gains admin capabilities", async () => {
      testRuntime.cookieValue = await createSessionToken(IDS.accountA)
      let actor = await requireActor()
      expect(actor.role).toBe("user")
      expect(await hasCapability(actor, "users.read")).toBe(false)

      // Promote to admin
      await db.account.update({ where: { id: IDS.accountA }, data: { role: "admin" } })

      actor = await requireActor()
      expect(actor.role).toBe("admin")
      expect(await hasCapability(actor, "users.read")).toBe(true)
    })

    test("admin demoted to user loses capabilities", async () => {
      testRuntime.cookieValue = await createSessionToken(IDS.adminC)
      let actor = await requireActor()
      expect(actor.role).toBe("admin")
      expect(await hasCapability(actor, "users.read")).toBe(true)

      // Demote to user
      await db.account.update({ where: { id: IDS.adminC }, data: { role: "user" } })

      actor = await requireActor()
      expect(actor.role).toBe("user")
      expect(await hasCapability(actor, "users.read")).toBe(false)
    })
  })
})
