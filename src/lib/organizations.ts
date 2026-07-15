import "server-only"
import { db } from "@/lib/db"
import { AuthorizationError, isValidId } from "@/lib/authorization"
import type { ActorContext } from "@/lib/authorization"

// ============================================================================
// ORGANIZATION SERVICE — Phase 7A+7B
// ============================================================================
// Organization roles: owner > admin > member
// The founder (creator) is automatically assigned the "owner" role.
// Only owners can change member roles. Owners and admins can remove members.
// Cross-org isolation: all queries are scoped to orgId; cross-org access → 404.

export type OrganizationRole = "owner" | "admin" | "member"
export type OrganizationType = "institution" | "company" | "community" | "government"
export type VerificationStatus = "unverified" | "pending" | "verified" | "rejected"

export const ORGANIZATION_ROLES: readonly OrganizationRole[] = ["owner", "admin", "member"] as const
export const ORGANIZATION_TYPES: readonly OrganizationType[] = ["institution", "company", "community", "government"] as const

// ---------------------------------------------------------------------------
// Slug validation — URL-safe, lowercase, hyphens only
// ---------------------------------------------------------------------------
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const SLUG_MIN = 3
const SLUG_MAX = 64

export function isValidSlug(slug: string | null | undefined): slug is string {
  if (!slug || typeof slug !== "string") return false
  if (slug.length < SLUG_MIN || slug.length > SLUG_MAX) return false
  return SLUG_RE.test(slug)
}

// ---------------------------------------------------------------------------
// Membership helpers
// ---------------------------------------------------------------------------

async function getMembership(orgId: string, userProfileId: string) {
  return db.organizationMembership.findUnique({
    where: {
      organizationId_userProfileId: {
        organizationId: orgId,
        userProfileId,
      },
    },
    select: { id: true, role: true, joinedAt: true },
  })
}

function requireOrgRole(membership: { role: string } | null, ...roles: OrganizationRole[]): void {
  if (!membership || !roles.includes(membership.role as OrganizationRole)) {
    throw new AuthorizationError("FORBIDDEN")
  }
}

function requireOrgOwnerOrAdmin(membership: { role: string } | null): void {
  requireOrgRole(membership, "owner", "admin")
}

function requireOrgOwner(membership: { role: string } | null): void {
  requireOrgRole(membership, "owner")
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface CreateOrganizationInput {
  name: string
  slug: string
  type: OrganizationType
  description?: string
  website?: string
  logoUrl?: string
}

export interface UpdateOrganizationInput {
  name?: string
  description?: string
  website?: string
  logoUrl?: string
  type?: OrganizationType
}

/**
 * Create a new organization. The founder (actor) becomes the owner.
 */
export async function createOrganization(
  actor: ActorContext,
  input: CreateOrganizationInput
) {
  if (!actor.profileId) throw new AuthorizationError("NOT_FOUND")

  const { name, slug, type, description, website, logoUrl } = input

  if (!name || typeof name !== "string" || name.trim().length === 0 || name.length > 200) {
    throw new AuthorizationError("BAD_REQUEST")
  }
  if (!isValidSlug(slug)) {
    throw new AuthorizationError("BAD_REQUEST")
  }
  if (!ORGANIZATION_TYPES.includes(type)) {
    throw new AuthorizationError("BAD_REQUEST")
  }

  // Check slug uniqueness
  const existing = await db.organization.findUnique({ where: { slug }, select: { id: true } })
  if (existing) {
    throw new AuthorizationError("CONFLICT")
  }

  const org = await db.organization.create({
    data: {
      name: name.trim(),
      slug,
      type,
      description: description ?? null,
      website: website ?? null,
      logoUrl: logoUrl ?? null,
      createdById: actor.accountId,
      memberships: {
        create: {
          userProfileId: actor.profileId,
          role: "owner",
        },
      },
    },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      logoUrl: true,
      website: true,
      type: true,
      verificationStatus: true,
      createdAt: true,
    },
  })

  return org
}

/**
 * Get an organization by slug or ID.
 * Returns null if not found (caller decides 404/403).
 */
export async function getOrganization(slugOrId: string) {
  // Try slug first (most common), then ID
  let org = await db.organization.findUnique({
    where: { slug: slugOrId },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      logoUrl: true,
      website: true,
      type: true,
      verificationStatus: true,
      verifiedAt: true,
      createdById: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { memberships: true } },
    },
  })

  if (!org && isValidId(slugOrId)) {
    org = await db.organization.findUnique({
      where: { id: slugOrId },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        logoUrl: true,
        website: true,
        type: true,
        verificationStatus: true,
        verifiedAt: true,
        createdById: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { memberships: true } },
      },
    })
  }

  return org
}

/**
 * Check if the actor is a member of the given organization.
 * Returns the membership role if a member, null otherwise.
 */
export async function getMemberRole(
  orgId: string,
  userProfileId: string
): Promise<OrganizationRole | null> {
  const m = await getMembership(orgId, userProfileId)
  return m ? (m.role as OrganizationRole) : null
}

/**
 * Check if the actor is a member of the given organization.
 * Throws FORBIDDEN if not.
 */
export async function requireOrgMember(orgId: string, userProfileId: string): Promise<OrganizationRole> {
  const m = await getMembership(orgId, userProfileId)
  if (!m) throw new AuthorizationError("NOT_FOUND")
  return m.role as OrganizationRole
}

/**
 * Update organization details. Owner or admin only.
 */
export async function updateOrganization(
  orgId: string,
  data: UpdateOrganizationInput,
  actor: ActorContext
) {
  if (!actor.profileId) throw new AuthorizationError("NOT_FOUND")

  const membership = await getMembership(orgId, actor.profileId)
  requireOrgOwnerOrAdmin(membership)

  const updateData: Record<string, unknown> = {}
  if (data.name !== undefined) {
    if (typeof data.name !== "string" || data.name.trim().length === 0 || data.name.length > 200) {
      throw new AuthorizationError("BAD_REQUEST")
    }
    updateData.name = data.name.trim()
  }
  if (data.description !== undefined) {
    updateData.description = typeof data.description === "string" ? data.description : null
  }
  if (data.website !== undefined) {
    updateData.website = typeof data.website === "string" ? data.website : null
  }
  if (data.logoUrl !== undefined) {
    updateData.logoUrl = typeof data.logoUrl === "string" ? data.logoUrl : null
  }
  if (data.type !== undefined) {
    if (!ORGANIZATION_TYPES.includes(data.type)) {
      throw new AuthorizationError("BAD_REQUEST")
    }
    updateData.type = data.type
  }

  const updated = await db.organization.update({
    where: { id: orgId },
    data: updateData,
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      logoUrl: true,
      website: true,
      type: true,
      verificationStatus: true,
      verifiedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  return updated
}

/**
 * Add a member to an organization. Owner or admin only.
 */
export async function addMember(
  orgId: string,
  userProfileId: string,
  role: OrganizationRole = "member",
  actor: ActorContext
) {
  if (!actor.profileId) throw new AuthorizationError("NOT_FOUND")

  const membership = await getMembership(orgId, actor.profileId)
  requireOrgOwnerOrAdmin(membership)

  // Only owner can assign owner role
  if (role === "owner" && membership!.role !== "owner") {
    throw new AuthorizationError("FORBIDDEN")
  }

  if (!isValidId(userProfileId)) {
    throw new AuthorizationError("BAD_REQUEST")
  }

  // Verify the user profile exists
  const profile = await db.userProfile.findUnique({
    where: { id: userProfileId },
    select: { id: true },
  })
  if (!profile) throw new AuthorizationError("NOT_FOUND")

  // Check if already a member
  const existing = await getMembership(orgId, userProfileId)
  if (existing) {
    throw new AuthorizationError("CONFLICT")
  }

  const created = await db.organizationMembership.create({
    data: {
      organizationId: orgId,
      userProfileId,
      role,
    },
    include: {
      userProfile: {
        select: {
          id: true,
          fullName: true,
          headline: true,
          photoUrl: true,
        },
      },
    },
  })

  return created
}

/**
 * Remove a member from an organization. Owner or admin can remove.
 * Members can remove themselves (leave).
 * Owners cannot be removed except by themselves or another owner.
 */
export async function removeMember(
  orgId: string,
  userProfileId: string,
  actor: ActorContext
) {
  if (!actor.profileId) throw new AuthorizationError("NOT_FOUND")

  // Self-removal (leave) is always allowed
  const isSelfRemoval = actor.profileId === userProfileId

  if (!isSelfRemoval) {
    const actorMembership = await getMembership(orgId, actor.profileId)
    requireOrgOwnerOrAdmin(actorMembership)

    // Cannot remove an owner unless you're also an owner
    const targetMembership = await getMembership(orgId, userProfileId)
    if (!targetMembership) throw new AuthorizationError("NOT_FOUND")

    if (targetMembership.role === "owner" && actorMembership!.role !== "owner") {
      throw new AuthorizationError("FORBIDDEN")
    }
  } else {
    // Verify the member exists before trying to remove
    const targetMembership = await getMembership(orgId, userProfileId)
    if (!targetMembership) throw new AuthorizationError("NOT_FOUND")
  }

  await db.organizationMembership.delete({
    where: {
      organizationId_userProfileId: {
        organizationId: orgId,
        userProfileId,
      },
    },
  })

  return { removed: true }
}

/**
 * Change a member's role. Owner only.
 */
export async function changeMemberRole(
  orgId: string,
  userProfileId: string,
  newRole: OrganizationRole,
  actor: ActorContext
) {
  if (!actor.profileId) throw new AuthorizationError("NOT_FOUND")

  const actorMembership = await getMembership(orgId, actor.profileId)
  requireOrgOwner(actorMembership)

  if (!ORGANIZATION_ROLES.includes(newRole)) {
    throw new AuthorizationError("BAD_REQUEST")
  }

  const targetMembership = await getMembership(orgId, userProfileId)
  if (!targetMembership) throw new AuthorizationError("NOT_FOUND")

  // Cannot change own role (would leave org without owner)
  if (actor.profileId === userProfileId) {
    throw new AuthorizationError("FORBIDDEN")
  }

  const updated = await db.organizationMembership.update({
    where: {
      organizationId_userProfileId: {
        organizationId: orgId,
        userProfileId,
      },
    },
    data: { role: newRole },
    include: {
      userProfile: {
        select: {
          id: true,
          fullName: true,
          headline: true,
          photoUrl: true,
        },
      },
    },
  })

  return updated
}

/**
 * Get members of an organization. Actor must be a member to see the list.
 */
export async function getMembers(orgId: string, actor: ActorContext) {
  if (!actor.profileId) throw new AuthorizationError("NOT_FOUND")

  // Actor must be a member to see the member list
  await requireOrgMember(orgId, actor.profileId)

  const members = await db.organizationMembership.findMany({
    where: { organizationId: orgId },
    orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
    include: {
      userProfile: {
        select: {
          id: true,
          fullName: true,
          headline: true,
          photoUrl: true,
        },
      },
    },
  })

  return members
}

/**
 * Get organizations the user belongs to.
 */
export async function getUserOrganizations(userProfileId: string) {
  if (!isValidId(userProfileId)) return []

  const memberships = await db.organizationMembership.findMany({
    where: { userProfileId },
    include: {
      organization: {
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          logoUrl: true,
          type: true,
          verificationStatus: true,
          _count: { select: { memberships: true } },
        },
      },
    },
    orderBy: { joinedAt: "desc" },
  })

  return memberships.map((m) => ({
    ...m.organization,
    role: m.role as OrganizationRole,
    memberCount: m.organization._count.memberships,
    joinedAt: m.joinedAt,
  }))
}

/**
 * Request verification for an organization. Owner or admin only.
 */
export async function requestVerification(orgId: string, actor: ActorContext) {
  if (!actor.profileId) throw new AuthorizationError("NOT_FOUND")

  const membership = await getMembership(orgId, actor.profileId)
  requireOrgOwnerOrAdmin(membership)

  const org = await db.organization.findUnique({
    where: { id: orgId },
    select: { id: true, verificationStatus: true },
  })
  if (!org) throw new AuthorizationError("NOT_FOUND")

  if (org.verificationStatus !== "unverified" && org.verificationStatus !== "rejected") {
    throw new AuthorizationError("CONFLICT")
  }

  const updated = await db.organization.update({
    where: { id: orgId },
    data: { verificationStatus: "pending" },
    select: {
      id: true,
      name: true,
      slug: true,
      verificationStatus: true,
    },
  })

  return updated
}

/**
 * Verify an organization (admin/moderator platform action).
 * The actor must be a platform admin/owner.
 */
export async function verifyOrganization(orgId: string, actor: ActorContext) {
  // Platform-level authorization: imported dynamically to avoid circular deps
  const { requireCapability, CAPABILITIES } = await import("@/lib/permissions")
  await requireCapability(actor, CAPABILITIES.VERIFICATION_MANAGE)

  const org = await db.organization.findUnique({
    where: { id: orgId },
    select: { id: true, verificationStatus: true },
  })
  if (!org) throw new AuthorizationError("NOT_FOUND")

  const updated = await db.organization.update({
    where: { id: orgId },
    data: {
      verificationStatus: "verified",
      verifiedAt: new Date(),
    },
    select: {
      id: true,
      name: true,
      slug: true,
      verificationStatus: true,
      verifiedAt: true,
    },
  })

  return updated
}

/**
 * Organization-scoped opportunity creation (Phase 7B).
 * An org admin can create an opportunity that is visible to org members.
 */
export async function createOrganizationOpportunity(
  orgId: string,
  actor: ActorContext,
  data: {
    title: string
    type?: string
    description?: string
    requirements?: string
    deadline?: string
    location?: string
  }
) {
  if (!actor.profileId) throw new AuthorizationError("NOT_FOUND")

  const membership = await getMembership(orgId, actor.profileId)
  requireOrgOwnerOrAdmin(membership)

  if (!data.title || typeof data.title !== "string" || data.title.trim().length === 0) {
    throw new AuthorizationError("BAD_REQUEST")
  }

  const opp = await db.opportunity.create({
    data: {
      userProfileId: actor.profileId,
      type: data.type ?? "job",
      title: data.title.trim(),
      organization: (await db.organization.findUnique({ where: { id: orgId }, select: { name: true } }))?.name ?? null,
      description: data.description ?? null,
      requirements: data.requirements ?? null,
      deadline: data.deadline ?? null,
      location: data.location ?? null,
      source: "org",
      notes: `org:${orgId}`,
    },
    select: {
      id: true,
      type: true,
      title: true,
      organization: true,
      description: true,
      requirements: true,
      deadline: true,
      location: true,
      status: true,
      createdAt: true,
    },
  })

  return opp
}
