import { db } from "@/lib/db"
import { AuthorizationError } from "@/lib/authorization"

// ---------------------------------------------------------------------------
// Relationship / Network Engine — Brief §9.3 (Network Graph)
// ---------------------------------------------------------------------------
// Manages directed connection requests between users. A connection goes:
//   pending → accepted (the two users are "connected")
//   pending → declined
//   any → blocked (one-way block)
//
// When two users are connected (an accepted Connection row exists in either
// direction), they can see each other's "connections"-level profile fields
// per the Consent/Privacy Graph (brief §9.1).
// ---------------------------------------------------------------------------

export type ConnectionStatus = "pending" | "accepted" | "declined" | "blocked"

export interface ConnectionWithProfile {
  id: string
  status: ConnectionStatus
  message: string | null
  createdAt: Date
  updatedAt: Date
  /** The "other" user in the connection (not the current user). */
  other: {
    id: string
    fullName: string | null
    headline: string | null
    email: string | null
    photoUrl: string | null
  }
  /** Whether the current user is the requester. */
  isRequester: boolean
}

/**
 * Request a connection from requester to addressee.
 *
 * - Prevents self-requests.
 * - Prevents duplicate requests (any direction, any status) with a generic
 *   conflict.
 * - Allows atomic re-request of a declined connection scoped to the original
 *   participants — never reassigns requesterId or addresseeId.
 * - All errors are generic; relationship state is never exposed.
 */
export async function requestConnection(
  requesterId: string,
  addresseeId: string,
  message?: string
): Promise<{ id: string }> {
  if (requesterId === addresseeId) {
    throw new AuthorizationError("BAD_REQUEST")
  }

  return await db.$transaction(async (tx) => {
    const existing = await tx.connection.findFirst({
      where: {
        OR: [
          { requesterId, addresseeId },
          { requesterId: addresseeId, addresseeId: requesterId },
        ],
      },
    })

    if (existing) {
      // Allow atomic re-request only for same-direction declined rows.
      // The predicate includes requesterId, addresseeId, and status so we
      // never accidentally reopen a blocked/accepted/pending connection.
      if (existing.status === "declined" && existing.requesterId === requesterId) {
        const result = await tx.connection.updateMany({
          where: {
            id: existing.id,
            requesterId,
            addresseeId,
            status: "declined",
          },
          data: { status: "pending", message: message ?? null },
        })
        if (result.count === 1) return { id: existing.id }
      }

      // Any other existing state → generic conflict (do not expose status).
      throw new AuthorizationError("CONFLICT")
    }

    const created = await tx.connection.create({
      data: { requesterId, addresseeId, message: message ?? null },
    })
    return { id: created.id }
  })
}

/**
 * Accept a pending connection request. Only the addressee can accept.
 */
export async function acceptConnection(
  connectionId: string,
  currentUserId: string
): Promise<{ ok: boolean; error?: string }> {
  const result = await db.connection.updateMany({
    where: {
      id: connectionId,
      addresseeId: currentUserId,
      status: "pending",
    },
    data: {
      status: "accepted",
    },
  })

  if (result.count === 1) {
    return { ok: true }
  }

  const existing = await db.connection.findFirst({
    where: {
      id: connectionId,
      addresseeId: currentUserId,
    },
  })

  if (!existing) {
    return { ok: false, error: "not-found" }
  }

  return { ok: false, error: "conflict" }
}

/**
 * Decline a pending connection request. Only the addressee can decline.
 */
export async function declineConnection(
  connectionId: string,
  currentUserId: string
): Promise<{ ok: boolean; error?: string }> {
  const result = await db.connection.updateMany({
    where: {
      id: connectionId,
      addresseeId: currentUserId,
      status: "pending",
    },
    data: {
      status: "declined",
    },
  })

  if (result.count === 1) {
    return { ok: true }
  }

  const existing = await db.connection.findFirst({
    where: {
      id: connectionId,
      addresseeId: currentUserId,
    },
  })

  if (!existing) {
    return { ok: false, error: "not-found" }
  }

  return { ok: false, error: "conflict" }
}

/**
 * Check whether two users are connected (accepted, in either direction).
 */
export async function areConnected(userAId: string, userBId: string): Promise<boolean> {
  const conn = await db.connection.findFirst({
    where: {
      OR: [
        { requesterId: userAId, addresseeId: userBId, status: "accepted" },
        { requesterId: userBId, addresseeId: userAId, status: "accepted" },
      ],
    },
  })
  return !!conn
}

/**
 * List all connections for a user, grouped by status. Each entry includes
 * the "other" user's profile summary.
 */
import { projectPublicProfile } from "@/lib/public-profile"

/**
 * List all connections for a user, grouped by status. Each entry includes
 * the "other" user's profile summary.
 */
export async function listConnections(
  userId: string,
  viewerAccountId: string
): Promise<{
  accepted: ConnectionWithProfile[]
  pendingIncoming: ConnectionWithProfile[]
  pendingOutgoing: ConnectionWithProfile[]
}> {
  const outgoing = await db.connection.findMany({
    where: { requesterId: userId },
    include: {
      addressee: {
        include: {
          consentSettings: true,
          verificationBadges: true,
        }
      }
    },
    orderBy: { updatedAt: "desc" },
    take: 500,
  })
  const incoming = await db.connection.findMany({
    where: { addresseeId: userId },
    include: {
      requester: {
        include: {
          consentSettings: true,
          verificationBadges: true,
        }
      }
    },
    orderBy: { updatedAt: "desc" },
    take: 500,
  })

  const projectOther = (otherProfile: any, connection: any) => {
    const fullProfile = {
      ...otherProfile,
      experiences: [],
      educations: [],
      skills: [],
      certifications: [],
      languages: [],
      verificationBadges: otherProfile.verificationBadges || [],
    }
    const pDto = projectPublicProfile({
      profile: fullProfile as any,
      consentSettings: otherProfile.consentSettings,
      viewer: { accountId: viewerAccountId, profileId: userId },
      relationships: [connection],
    })
    return {
      id: otherProfile.id,
      fullName: pDto.profile.fullName ?? null,
      headline: pDto.profile.headline ?? null,
      email: pDto.profile.email ?? null,
      photoUrl: pDto.profile.photoUrl ?? null,
    }
  }

  const mapOut = (c: typeof outgoing): ConnectionWithProfile[] =>
    c.map((x) => ({
      id: x.id,
      status: x.status as ConnectionStatus,
      message: x.message,
      createdAt: x.createdAt,
      updatedAt: x.updatedAt,
      other: projectOther(x.addressee, x),
      isRequester: true,
    }))
  const mapIn = (c: typeof incoming): ConnectionWithProfile[] =>
    c.map((x) => ({
      id: x.id,
      status: x.status as ConnectionStatus,
      message: x.message,
      createdAt: x.createdAt,
      updatedAt: x.updatedAt,
      other: projectOther(x.requester, x),
      isRequester: false,
    }))

  return {
    accepted: [...mapOut(outgoing), ...mapIn(incoming)].filter((c) => c.status === "accepted"),
    pendingIncoming: mapIn(incoming).filter((c) => c.status === "pending"),
    pendingOutgoing: mapOut(outgoing).filter((c) => c.status === "pending"),
  }
}

// ---------------------------------------------------------------------------
// Search input bounds (durable security decisions)
// ---------------------------------------------------------------------------
const MIN_QUERY_LENGTH = 2
const MAX_QUERY_LENGTH = 128
const MAX_RESULTS = 20

/**
 * Search for users by name (for sending connection requests).
 * Excludes the current user and already-connected/pending users.
 * Never matches or returns private email.
 *
 * Input bounds:
 * - Empty or whitespace-only queries return an empty result.
 * - Queries shorter than MIN_QUERY_LENGTH or longer than MAX_QUERY_LENGTH
 *   return an empty result.
 * - The result limit is internally clamped to MAX_RESULTS.
 * - Negative, zero, fractional, non-finite, or excessive limits are clamped.
 */
export async function searchUsers(
  currentAccountId: string,
  query: string,
  limit = 10
): Promise<
  Array<{
    id: string
    fullName: string | null
    headline: string | null
    email: string | null
    photoUrl: string | null
    connectionStatus: ConnectionStatus | "none"
  }>
> {
  const q = query.trim()
  if (!q || q.length < MIN_QUERY_LENGTH || q.length > MAX_QUERY_LENGTH) return []

  // Clamp limit: reject negative, zero, fractional, non-finite, excessive
  let safeLimit = Math.floor(limit)
  if (!Number.isFinite(safeLimit) || safeLimit < 1) safeLimit = 10
  if (safeLimit > MAX_RESULTS) safeLimit = MAX_RESULTS

  const normalized = q.toLowerCase()

  const myProfile = await db.userProfile.findUnique({
    where: { accountId: currentAccountId },
    select: { id: true },
  })
  if (!myProfile) return []

  // Find users whose fullName matches — only directory-eligible name field.
  // Never search private email.
  const profiles = await db.userProfile.findMany({
    where: {
      AND: [
        { accountId: { not: currentAccountId } },
        { fullName: { contains: normalized } },
      ],
    },
    select: {
      id: true,
      fullName: true,
      headline: true,
      photoUrl: true,
    },
    take: safeLimit,
  })

  const result: Array<{
    id: string
    fullName: string | null
    headline: string | null
    email: null
    photoUrl: string | null
    connectionStatus: ConnectionStatus | "none"
  }> = []
  for (const p of profiles) {
    const conn = await db.connection.findFirst({
      where: {
        OR: [
          { requesterId: myProfile.id, addresseeId: p.id },
          { requesterId: p.id, addresseeId: myProfile.id },
        ],
      },
    })

    result.push({
      id: p.id,
      fullName: p.fullName ?? null,
      headline: p.headline ?? null,
      email: null,
      photoUrl: p.photoUrl ?? null,
      connectionStatus: (conn?.status as ConnectionStatus) ?? "none",
    })
  }
  return result
}
