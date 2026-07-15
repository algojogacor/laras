/// <reference types="bun-types" />

import { beforeAll, beforeEach, describe, expect, test } from "bun:test"
import { db } from "@/lib/db"
import { resetTestRuntime, testRuntime } from "./test-runtime"

// Dynamic imports
let createSessionToken: any
let AuthorizationError: any
let createOrganization: any
let getOrganization: any
let updateOrganization: any
let addMember: any
let removeMember: any
let changeMemberRole: any
let getMembers: any
let getUserOrganizations: any
let requestVerification: any
let requireActor: any

import { cleanDb, seedDb, IDS } from "./fixtures"

// Helper to get an actor context from an account ID
async function getActor(accountId: string) {
  const token = await createSessionToken(accountId)
  testRuntime.cookieValue = token
  return requireActor()
}

describe("Phase 7A+7B — Organization Workspaces", () => {
  beforeAll(async () => {
    process.env.AUTH_SECRET = "test-auth-secret-key-32-chars-long-or-more"

    const authLib = await import("@/lib/auth")
    createSessionToken = authLib.createSessionToken

    const authorizationLib = await import("@/lib/authorization")
    AuthorizationError = authorizationLib.AuthorizationError
    requireActor = authorizationLib.requireActor

    const orgLib = await import("@/lib/organizations")
    createOrganization = orgLib.createOrganization
    getOrganization = orgLib.getOrganization
    updateOrganization = orgLib.updateOrganization
    addMember = orgLib.addMember
    removeMember = orgLib.removeMember
    changeMemberRole = orgLib.changeMemberRole
    getMembers = orgLib.getMembers
    getUserOrganizations = orgLib.getUserOrganizations
    requestVerification = orgLib.requestVerification

    // Attempt a full clean + seed. If the DB is clean, this works.
    // If there are leftover org records, clean those first.
    try { await db.organizationMembership.deleteMany() } catch {}
    try { await db.organization.deleteMany() } catch {}
    await cleanDb()
    await seedDb()
  })

  beforeEach(async () => {
    resetTestRuntime()
    // Clean only organization-related tables to avoid FK issues with the base fixtures
    try { await db.organizationMembership.deleteMany() } catch {}
    try { await db.organization.deleteMany() } catch {}
  })

  // ============================================================================
  // 1. CREATE ORGANIZATION
  // ============================================================================
  describe("createOrganization", () => {
    test("creates an organization and assigns founder as owner", async () => {
      const actor = await getActor(IDS.accountA)

      const org = await createOrganization(actor, {
        name: "Acme University",
        slug: "acme-university",
        type: "institution",
        description: "A test university",
      })

      expect(org.name).toBe("Acme University")
      expect(org.slug).toBe("acme-university")
      expect(org.type).toBe("institution")
      expect(org.description).toBe("A test university")
      expect(org.verificationStatus).toBe("unverified")
      expect(org.id).toBeTruthy()

      // Founder should be an owner member
      const members = await db.organizationMembership.findMany({
        where: { organizationId: org.id },
      })
      expect(members.length).toBe(1)
      expect(members[0].userProfileId).toBe(actor.profileId)
      expect(members[0].role).toBe("owner")
    })

    test("rejects duplicate slug with CONFLICT", async () => {
      const actor = await getActor(IDS.accountA)

      await createOrganization(actor, {
        name: "First Org",
        slug: "first-org",
        type: "company",
      })

      expect(
        createOrganization(actor, {
          name: "Second Org",
          slug: "first-org",
          type: "company",
        })
      ).rejects.toThrow(new AuthorizationError("CONFLICT"))
    })

    test("rejects invalid slug with BAD_REQUEST", async () => {
      const actor = await getActor(IDS.accountA)

      expect(
        createOrganization(actor, {
          name: "Bad Slug",
          slug: "ab", // too short
          type: "company",
        })
      ).rejects.toThrow(new AuthorizationError("BAD_REQUEST"))
    })

    test("rejects invalid type with BAD_REQUEST", async () => {
      const actor = await getActor(IDS.accountA)

      expect(
        createOrganization(actor, {
          name: "Bad Type",
          slug: "bad-type",
          type: "invalid" as any,
        })
      ).rejects.toThrow(new AuthorizationError("BAD_REQUEST"))
    })

    test("rejects empty name with BAD_REQUEST", async () => {
      const actor = await getActor(IDS.accountA)

      expect(
        createOrganization(actor, {
          name: "",
          slug: "empty-name",
          type: "company",
        })
      ).rejects.toThrow(new AuthorizationError("BAD_REQUEST"))
    })
  })

  // ============================================================================
  // 2. GET ORGANIZATION
  // ============================================================================
  describe("getOrganization", () => {
    test("gets organization by slug", async () => {
      const actor = await getActor(IDS.accountA)
      const created = await createOrganization(actor, {
        name: "Findable Org",
        slug: "findable-org",
        type: "community",
      })

      const found = await getOrganization("findable-org")
      expect(found).not.toBeNull()
      expect(found!.id).toBe(created.id)
      expect(found!.name).toBe("Findable Org")
    })

    test("gets organization by ID", async () => {
      const actor = await getActor(IDS.accountA)
      const created = await createOrganization(actor, {
        name: "ID Lookup Org",
        slug: "id-lookup",
        type: "company",
      })

      const found = await getOrganization(created.id)
      expect(found).not.toBeNull()
      expect(found!.slug).toBe("id-lookup")
    })

    test("returns null for non-existent slug", async () => {
      const found = await getOrganization("nope-not-here")
      expect(found).toBeNull()
    })
  })

  // ============================================================================
  // 3. UPDATE ORGANIZATION
  // ============================================================================
  describe("updateOrganization", () => {
    test("owner can update organization details", async () => {
      const actor = await getActor(IDS.accountA)
      const org = await createOrganization(actor, {
        name: "Update Me",
        slug: "update-me",
        type: "company",
        description: "Before update",
      })

      const updated = await updateOrganization(org.id, {
        name: "Updated Name",
        description: "After update",
      }, actor)

      expect(updated.name).toBe("Updated Name")
      expect(updated.description).toBe("After update")
    })

    test("non-member cannot update organization", async () => {
      const founderActor = await getActor(IDS.accountA)
      const org = await createOrganization(founderActor, {
        name: "Protected Org",
        slug: "protected-org",
        type: "company",
      })

      const outsiderActor = await getActor(IDS.accountB)
      expect(
        updateOrganization(org.id, { name: "Hacked" }, outsiderActor)
      ).rejects.toThrow(new AuthorizationError("FORBIDDEN"))
    })

    test("member (non-admin) cannot update organization", async () => {
      const founderActor = await getActor(IDS.accountA)
      const org = await createOrganization(founderActor, {
        name: "Admin Only",
        slug: "admin-only",
        type: "company",
      })

      // Add Profile B as a regular member
      await addMember(org.id, IDS.profileB, "member", founderActor)

      const memberActor = await getActor(IDS.accountB)
      expect(
        updateOrganization(org.id, { name: "Member Changed" }, memberActor)
      ).rejects.toThrow(new AuthorizationError("FORBIDDEN"))
    })
  })

  // ============================================================================
  // 4. MEMBER MANAGEMENT
  // ============================================================================
  describe("member management", () => {
    test("owner can add a member", async () => {
      const founderActor = await getActor(IDS.accountA)
      const org = await createOrganization(founderActor, {
        name: "Team Org",
        slug: "team-org",
        type: "company",
      })

      const added = await addMember(org.id, IDS.profileB, "member", founderActor)
      expect(added.role).toBe("member")
      expect(added.userProfileId).toBe(IDS.profileB)
      expect(added.userProfile.fullName).toBe("User B")
    })

    test("owner can add an admin", async () => {
      const founderActor = await getActor(IDS.accountA)
      const org = await createOrganization(founderActor, {
        name: "Admin Test",
        slug: "admin-test",
        type: "company",
      })

      const added = await addMember(org.id, IDS.profileB, "admin", founderActor)
      expect(added.role).toBe("admin")
    })

    test("cannot add duplicate member", async () => {
      const founderActor = await getActor(IDS.accountA)
      const org = await createOrganization(founderActor, {
        name: "Dup Test",
        slug: "dup-test",
        type: "company",
      })

      await addMember(org.id, IDS.profileB, "member", founderActor)
      expect(
        addMember(org.id, IDS.profileB, "member", founderActor)
      ).rejects.toThrow(new AuthorizationError("CONFLICT"))
    })

    test("non-admin cannot add members", async () => {
      const founderActor = await getActor(IDS.accountA)
      const org = await createOrganization(founderActor, {
        name: "Gated Org",
        slug: "gated-org",
        type: "company",
      })

      const outsiderActor = await getActor(IDS.accountB)
      expect(
        addMember(org.id, IDS.profileB, "member", outsiderActor)
      ).rejects.toThrow(new AuthorizationError("FORBIDDEN"))
    })

    test("owner can remove a member", async () => {
      const founderActor = await getActor(IDS.accountA)
      const org = await createOrganization(founderActor, {
        name: "Remove Test",
        slug: "remove-test",
        type: "company",
      })

      await addMember(org.id, IDS.profileB, "member", founderActor)
      const result = await removeMember(org.id, IDS.profileB, founderActor)
      expect(result.removed).toBe(true)

      // Verify removal
      const membersAfter = await db.organizationMembership.findMany({
        where: { organizationId: org.id },
      })
      expect(membersAfter.length).toBe(1) // only founder remains
    })

    test("member can leave (self-removal)", async () => {
      const founderActor = await getActor(IDS.accountA)
      const org = await createOrganization(founderActor, {
        name: "Leave Test",
        slug: "leave-test",
        type: "company",
      })

      await addMember(org.id, IDS.profileB, "member", founderActor)

      const memberActor = await getActor(IDS.accountB)
      const result = await removeMember(org.id, IDS.profileB, memberActor)
      expect(result.removed).toBe(true)
    })

    test("non-admin cannot remove other members", async () => {
      const founderActor = await getActor(IDS.accountA)
      const org = await createOrganization(founderActor, {
        name: "Protect Members",
        slug: "protect-members",
        type: "company",
      })

      await addMember(org.id, IDS.profileB, "member", founderActor)
      // Add Profile C as another member (Profile C is admin in seed)
      const profileF = IDS.profileF
      await addMember(org.id, profileF, "member", founderActor)

      // Profile B tries to remove Profile F
      const memberActor = await getActor(IDS.accountB)
      expect(
        removeMember(org.id, profileF, memberActor)
      ).rejects.toThrow(new AuthorizationError("FORBIDDEN"))
    })

    test("only owner can change member roles", async () => {
      const founderActor = await getActor(IDS.accountA)
      const org = await createOrganization(founderActor, {
        name: "Role Change Test",
        slug: "role-change-test",
        type: "company",
      })

      await addMember(org.id, IDS.profileB, "member", founderActor)

      // Promote to admin
      const promoted = await changeMemberRole(org.id, IDS.profileB, "admin", founderActor)
      expect(promoted.role).toBe("admin")

      // Demote back to member
      const demoted = await changeMemberRole(org.id, IDS.profileB, "member", founderActor)
      expect(demoted.role).toBe("member")
    })

    test("admin cannot change member roles", async () => {
      const founderActor = await getActor(IDS.accountA)
      const org = await createOrganization(founderActor, {
        name: "Admin Limit Test",
        slug: "admin-limit-test",
        type: "company",
      })

      // Add Profile B as admin
      await addMember(org.id, IDS.profileB, "admin", founderActor)
      // Add Profile F as member
      await addMember(org.id, IDS.profileF, "member", founderActor)

      const adminActor = await getActor(IDS.accountB)
      expect(
        changeMemberRole(org.id, IDS.profileF, "admin", adminActor)
      ).rejects.toThrow(new AuthorizationError("FORBIDDEN"))
    })

    test("cannot change own role", async () => {
      const founderActor = await getActor(IDS.accountA)
      const org = await createOrganization(founderActor, {
        name: "Self Role Test",
        slug: "self-role-test",
        type: "company",
      })

      expect(
        changeMemberRole(org.id, IDS.profileA, "member", founderActor)
      ).rejects.toThrow(new AuthorizationError("FORBIDDEN"))
    })

    test("admin cannot add an owner", async () => {
      const founderActor = await getActor(IDS.accountA)
      const org = await createOrganization(founderActor, {
        name: "Owner Protect",
        slug: "owner-protect",
        type: "company",
      })

      // Add Profile B as admin
      await addMember(org.id, IDS.profileB, "admin", founderActor)

      const adminActor = await getActor(IDS.accountB)
      expect(
        addMember(org.id, IDS.profileF, "owner", adminActor)
      ).rejects.toThrow(new AuthorizationError("FORBIDDEN"))
    })
  })

  // ============================================================================
  // 5. CROSS-ORG ISOLATION
  // ============================================================================
  describe("cross-org isolation", () => {
    test("member of org A cannot see org B members", async () => {
      const founderActor = await getActor(IDS.accountA)
      const orgA = await createOrganization(founderActor, {
        name: "Org Alpha",
        slug: "org-alpha",
        type: "company",
      })

      await addMember(orgA.id, IDS.profileB, "member", founderActor)

      // Create Org B with Profile F as founder
      const founderFActor = await getActor(IDS.ownerF)
      const orgB = await createOrganization(founderFActor, {
        name: "Org Beta",
        slug: "org-beta",
        type: "community",
      })

      // Profile B tries to see Org B members
      const memberBActor = await getActor(IDS.accountB)
      expect(
        getMembers(orgB.id, memberBActor)
      ).rejects.toThrow(new AuthorizationError("NOT_FOUND"))
    })

    test("non-member cannot see org member list", async () => {
      const founderActor = await getActor(IDS.accountA)
      const org = await createOrganization(founderActor, {
        name: "Private Org",
        slug: "private-org",
        type: "company",
      })

      const outsiderActor = await getActor(IDS.accountB)
      expect(
        getMembers(org.id, outsiderActor)
      ).rejects.toThrow(new AuthorizationError("NOT_FOUND"))
    })

    test("member of org A cannot see org B detail with membership info", async () => {
      const founderActor = await getActor(IDS.accountA)
      const orgA = await createOrganization(founderActor, {
        name: "Org Alpha 2",
        slug: "org-alpha-2",
        type: "company",
      })

      // Create Org B
      const founderFActor = await getActor(IDS.ownerF)
      const orgB = await createOrganization(founderFActor, {
        name: "Org Beta 2",
        slug: "org-beta-2",
        type: "community",
      })

      // Profile A is NOT a member of org B
      const actorA = await getActor(IDS.accountA)
      const { getMemberRole } = await import("@/lib/organizations")
      const role = await getMemberRole(orgB.id, IDS.profileA)
      expect(role).toBeNull()
    })
  })

  // ============================================================================
  // 6. MEMBER LISTING
  // ============================================================================
  describe("getMembers", () => {
    test("returns all members for a valid org member", async () => {
      const founderActor = await getActor(IDS.accountA)
      const org = await createOrganization(founderActor, {
        name: "List Test",
        slug: "list-test",
        type: "company",
      })

      await addMember(org.id, IDS.profileB, "member", founderActor)
      await addMember(org.id, IDS.profileF, "admin", founderActor)

      const members = await getMembers(org.id, founderActor)
      expect(members.length).toBe(3)

      const roles = members.map((m: any) => m.role)
      expect(roles).toContain("owner")
      expect(roles).toContain("admin")
      expect(roles).toContain("member")
    })
  })

  // ============================================================================
  // 7. USER ORGANIZATIONS
  // ============================================================================
  describe("getUserOrganizations", () => {
    test("returns organizations for a user", async () => {
      const founderActor = await getActor(IDS.accountA)
      await createOrganization(founderActor, {
        name: "My Org 1",
        slug: "my-org-1",
        type: "company",
      })
      await createOrganization(founderActor, {
        name: "My Org 2",
        slug: "my-org-2",
        type: "community",
      })

      const orgs = await getUserOrganizations(IDS.profileA)
      expect(orgs.length).toBe(2)
      expect(orgs[0].role).toBe("owner")
      expect(orgs[1].role).toBe("owner")
    })

    test("returns organizations where user is a member", async () => {
      const founderActor = await getActor(IDS.accountA)
      const org = await createOrganization(founderActor, {
        name: "Shared Org",
        slug: "shared-org",
        type: "company",
      })

      await addMember(org.id, IDS.profileB, "member", founderActor)

      const orgs = await getUserOrganizations(IDS.profileB)
      expect(orgs.length).toBe(1)
      expect(orgs[0].slug).toBe("shared-org")
      expect(orgs[0].role).toBe("member")
    })

    test("returns empty array for user with no orgs", async () => {
      const orgs = await getUserOrganizations(IDS.profileB)
      expect(orgs).toEqual([])
    })
  })

  // ============================================================================
  // 8. VERIFICATION FLOW
  // ============================================================================
  describe("verification flow", () => {
    test("owner can request verification", async () => {
      const founderActor = await getActor(IDS.accountA)
      const org = await createOrganization(founderActor, {
        name: "Verify Me",
        slug: "verify-me",
        type: "company",
      })

      expect(org.verificationStatus).toBe("unverified")

      const updated = await requestVerification(org.id, founderActor)
      expect(updated.verificationStatus).toBe("pending")
    })

    test("non-member cannot request verification", async () => {
      const founderActor = await getActor(IDS.accountA)
      const org = await createOrganization(founderActor, {
        name: "Verify Guard",
        slug: "verify-guard",
        type: "company",
      })

      const outsiderActor = await getActor(IDS.accountB)
      expect(
        requestVerification(org.id, outsiderActor)
      ).rejects.toThrow(new AuthorizationError("FORBIDDEN"))
    })

    test("cannot request verification when already pending", async () => {
      const founderActor = await getActor(IDS.accountA)
      const org = await createOrganization(founderActor, {
        name: "Already Pending",
        slug: "already-pending",
        type: "company",
      })

      await requestVerification(org.id, founderActor)
      expect(
        requestVerification(org.id, founderActor)
      ).rejects.toThrow(new AuthorizationError("CONFLICT"))
    })
  })

  // ============================================================================
  // 9. SLUG UNIQUENESS
  // ============================================================================
  describe("slug uniqueness", () => {
    test("two organizations cannot share the same slug", async () => {
      const actor = await getActor(IDS.accountA)
      await createOrganization(actor, {
        name: "First Slug",
        slug: "unique-slug",
        type: "company",
      })

      expect(
        createOrganization(actor, {
          name: "Second Slug",
          slug: "unique-slug",
          type: "community",
        })
      ).rejects.toThrow(new AuthorizationError("CONFLICT"))
    })
  })
})
