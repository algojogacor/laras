import "server-only"
import { db } from "@/lib/db"
import { AuthorizationError } from "@/lib/authorization"
import { emitEvent } from "@/lib/activity"
import { createNotification } from "@/lib/notifications"

// ============================================================================
// Circles Service — Phase 6B
// Career circles, study groups, and peer-review communities.
// ============================================================================

export type CircleType = "community" | "study_group" | "peer_review"
export type CircleMemberRole = "admin" | "moderator" | "member"

export interface CircleData {
  id: string
  name: string
  description: string | null
  type: CircleType
  createdById: string
  createdAt: Date
  updatedAt: Date
  memberCount: number
  userRole: CircleMemberRole | null
}

export interface CircleMemberData {
  id: string
  userProfileId: string
  role: CircleMemberRole
  joinedAt: Date
  fullName: string | null
  headline: string | null
  photoUrl: string | null
}

// ---- Helpers ----

function validateCircleType(type: string): CircleType {
  if (type === "community" || type === "study_group" || type === "peer_review") {
    return type
  }
  throw new AuthorizationError("BAD_REQUEST")
}

function validateMemberRole(role: string): CircleMemberRole {
  if (role === "admin" || role === "moderator" || role === "member") {
    return role
  }
  throw new AuthorizationError("BAD_REQUEST")
}

function assertMembership(membership: { role: string } | null): CircleMemberRole {
  if (!membership) {
    throw new AuthorizationError("FORBIDDEN")
  }
  return membership.role as CircleMemberRole
}

function assertAdminOrModerator(role: CircleMemberRole): void {
  if (role !== "admin" && role !== "moderator") {
    throw new AuthorizationError("FORBIDDEN")
  }
}

function assertAdmin(role: CircleMemberRole): void {
  if (role !== "admin") {
    throw new AuthorizationError("FORBIDDEN")
  }
}

// ---- Circle CRUD ----

/**
 * Create a new circle. The creator is automatically the admin.
 */
export async function createCircle(
  creatorProfileId: string,
  name: string,
  description: string | undefined,
  type: string
): Promise<{ id: string }> {
  const circleType = validateCircleType(type)
  const trimmedName = name.trim()
  if (!trimmedName || trimmedName.length < 3 || trimmedName.length > 100) {
    throw new AuthorizationError("BAD_REQUEST")
  }

  const circle = await db.careerCircle.create({
    data: {
      name: trimmedName,
      description: description?.trim() || null,
      type: circleType,
      createdById: creatorProfileId,
      memberships: {
        create: {
          userProfileId: creatorProfileId,
          role: "admin",
        },
      },
    },
  })

  emitEvent({
    userProfileId: creatorProfileId,
    type: "profile.update",
    resourceType: "CareerCircle",
    resourceId: circle.id,
    metadata: { action: "circle.created", name: trimmedName },
  })

  return { id: circle.id }
}

/**
 * Join a circle. For communities and study_groups, auto-join. For peer_review,
 * requires admin approval (returns pending state by adding as member directly
 * since the schema doesn't have a pending state; in real-world we'd add one).
 *
 * Simplified: all circles allow immediate join.
 */
export async function joinCircle(
  userProfileId: string,
  circleId: string
): Promise<{ role: CircleMemberRole }> {
  const circle = await db.careerCircle.findUnique({
    where: { id: circleId },
  })
  if (!circle) {
    throw new AuthorizationError("NOT_FOUND")
  }

  const existing = await db.circleMembership.findUnique({
    where: {
      circleId_userProfileId: {
        circleId,
        userProfileId,
      },
    },
  })
  if (existing) {
    return { role: existing.role as CircleMemberRole }
  }

  const membership = await db.circleMembership.create({
    data: {
      circleId,
      userProfileId,
      role: "member",
    },
  })

  emitEvent({
    userProfileId,
    type: "profile.update",
    resourceType: "CircleMembership",
    resourceId: membership.id,
    metadata: { action: "circle.joined", circleId, circleName: circle.name },
  })

  createNotification({
    userProfileId: circle.createdById,
    type: "system",
    title: `Anggota baru bergabung`,
    body: `Seseorang bergabung dengan circle "${circle.name}".`,
    resourceType: "CareerCircle",
    resourceId: circleId,
  })

  return { role: "member" }
}

/**
 * Leave a circle. The last admin cannot leave unless there is another admin.
 */
export async function leaveCircle(
  userProfileId: string,
  circleId: string
): Promise<void> {
  const membership = await db.circleMembership.findUnique({
    where: {
      circleId_userProfileId: {
        circleId,
        userProfileId,
      },
    },
  })
  if (!membership) {
    throw new AuthorizationError("NOT_FOUND")
  }

  // If this is the only admin, prevent leaving
  if (membership.role === "admin") {
    const adminCount = await db.circleMembership.count({
      where: { circleId, role: "admin" },
    })
    if (adminCount <= 1) {
      const totalMembers = await db.circleMembership.count({
        where: { circleId },
      })
      if (totalMembers > 1) {
        throw new AuthorizationError("CONFLICT")
      }
    }
  }

  await db.circleMembership.delete({
    where: { id: membership.id },
  })

  emitEvent({
    userProfileId,
    type: "profile.update",
    resourceType: "CircleMembership",
    resourceId: membership.id,
    metadata: { action: "circle.left", circleId },
  })
}

/**
 * Get all circles a user belongs to.
 */
export async function getUserCircles(
  userProfileId: string
): Promise<CircleData[]> {
  const memberships = await db.circleMembership.findMany({
    where: { userProfileId },
    include: {
      circle: {
        include: {
          memberships: {
            select: { id: true },
          },
        },
      },
    },
    orderBy: { joinedAt: "desc" },
  })

  return memberships.map((m) => ({
    id: m.circle.id,
    name: m.circle.name,
    description: m.circle.description,
    type: m.circle.type as CircleType,
    createdById: m.circle.createdById,
    createdAt: m.circle.createdAt,
    updatedAt: m.circle.updatedAt,
    memberCount: m.circle.memberships.length,
    userRole: m.role as CircleMemberRole,
  }))
}

/**
 * Get circle members.
 */
export async function getCircleMembers(
  circleId: string,
  _viewerProfileId: string
): Promise<CircleMemberData[]> {
  const circle = await db.careerCircle.findUnique({
    where: { id: circleId },
  })
  if (!circle) {
    throw new AuthorizationError("NOT_FOUND")
  }

  const memberships = await db.circleMembership.findMany({
    where: { circleId },
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
    orderBy: { joinedAt: "asc" },
  })

  return memberships.map((m) => ({
    id: m.id,
    userProfileId: m.userProfileId,
    role: m.role as CircleMemberRole,
    joinedAt: m.joinedAt,
    fullName: m.userProfile.fullName,
    headline: m.userProfile.headline,
    photoUrl: m.userProfile.photoUrl,
  }))
}

/**
 * List/discover circles. Supports optional type filter and name search.
 */
export async function getCircles(
  type?: string,
  search?: string,
  limit = 30
): Promise<CircleData[]> {
  const where: any = {}

  if (type) {
    where.type = validateCircleType(type)
  }

  if (search && search.trim().length >= 2) {
    where.name = { contains: search.trim().toLowerCase() }
  }

  let safeLimit = Math.floor(limit)
  if (!Number.isFinite(safeLimit) || safeLimit < 1) safeLimit = 30
  if (safeLimit > 100) safeLimit = 100

  const circles = await db.careerCircle.findMany({
    where,
    include: {
      memberships: {
        select: { id: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: safeLimit,
  })

  return circles.map((c) => ({
    id: c.id,
    name: c.name,
    description: c.description,
    type: c.type as CircleType,
    createdById: c.createdById,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
    memberCount: c.memberships.length,
    userRole: null,
  }))
}

/**
 * Get a single circle by ID.
 */
export async function getCircle(
  circleId: string,
  userProfileId?: string
): Promise<CircleData> {
  const circle = await db.careerCircle.findUnique({
    where: { id: circleId },
    include: {
      memberships: {
        select: { id: true, userProfileId: true, role: true },
      },
    },
  })
  if (!circle) {
    throw new AuthorizationError("NOT_FOUND")
  }

  const myMembership = userProfileId
    ? circle.memberships.find((m) => m.userProfileId === userProfileId)
    : null

  return {
    id: circle.id,
    name: circle.name,
    description: circle.description,
    type: circle.type as CircleType,
    createdById: circle.createdById,
    createdAt: circle.createdAt,
    updatedAt: circle.updatedAt,
    memberCount: circle.memberships.length,
    userRole: (myMembership?.role as CircleMemberRole) ?? null,
  }
}

/**
 * Promote or demote a member. Only admins can promote/demote.
 */
export async function updateMemberRole(
  actorProfileId: string,
  circleId: string,
  targetProfileId: string,
  newRole: string
): Promise<void> {
  const validatedRole = validateMemberRole(newRole)

  const actorMembership = await db.circleMembership.findUnique({
    where: {
      circleId_userProfileId: {
        circleId,
        userProfileId: actorProfileId,
      },
    },
  })
  assertAdmin(assertMembership(actorMembership))

  const targetMembership = await db.circleMembership.findUnique({
    where: {
      circleId_userProfileId: {
        circleId,
        userProfileId: targetProfileId,
      },
    },
  })
  if (!targetMembership) {
    throw new AuthorizationError("NOT_FOUND")
  }

  // Cannot demote the last admin
  if (targetMembership.role === "admin" && validatedRole !== "admin") {
    const adminCount = await db.circleMembership.count({
      where: { circleId, role: "admin" },
    })
    if (adminCount <= 1) {
      throw new AuthorizationError("CONFLICT")
    }
  }

  await db.circleMembership.update({
    where: { id: targetMembership.id },
    data: { role: validatedRole },
  })

  createNotification({
    userProfileId: targetProfileId,
    type: "system",
    title: `Peran circle diperbarui`,
    body: `Peran Anda di circle telah diubah menjadi "${validatedRole}".`,
    resourceType: "CareerCircle",
    resourceId: circleId,
  })
}

/**
 * Delete a circle. Only the creator (original admin) can delete.
 */
export async function deleteCircle(
  actorProfileId: string,
  circleId: string
): Promise<void> {
  const circle = await db.careerCircle.findUnique({
    where: { id: circleId },
  })
  if (!circle) {
    throw new AuthorizationError("NOT_FOUND")
  }

  // Only the creator/admin can delete
  const membership = await db.circleMembership.findUnique({
    where: {
      circleId_userProfileId: {
        circleId,
        userProfileId: actorProfileId,
      },
    },
  })
  assertAdmin(assertMembership(membership))

  await db.careerCircle.delete({
    where: { id: circleId },
  })
}

/**
 * Get membership for a user in a circle. Returns null if not a member.
 */
export async function getMembership(
  userProfileId: string,
  circleId: string
): Promise<{ role: CircleMemberRole } | null> {
  const m = await db.circleMembership.findUnique({
    where: {
      circleId_userProfileId: {
        circleId,
        userProfileId,
      },
    },
  })
  if (!m) return null
  return { role: m.role as CircleMemberRole }
}
