import { db } from "@/lib/db"

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
 * Request a connection from the current user to the addressee.
 * Prevents self-requests, duplicate requests, and requests to blocked users.
 */
export async function requestConnection(
  requesterId: string,
  addresseeId: string,
  message?: string
): Promise<{ ok: boolean; error?: string }> {
  if (requesterId === addresseeId) return { ok: false, error: "self" }

  // Check for existing connection in either direction
  const existing = await db.connection.findFirst({
    where: {
      OR: [
        { requesterId, addresseeId },
        { requesterId: addresseeId, addresseeId: requesterId },
      ],
    },
  })
  if (existing) {
    if (existing.status === "accepted") return { ok: false, error: "already-connected" }
    if (existing.status === "blocked") return { ok: false, error: "blocked" }
    if (existing.status === "pending") return { ok: false, error: "already-pending" }
    if (existing.status === "declined") {
      // Allow re-request after a decline: reset to pending
      await db.connection.update({
        where: { id: existing.id },
        data: { status: "pending", message: message ?? null, requesterId, addresseeId },
      })
      return { ok: true }
    }
  }

  await db.connection.create({
    data: { requesterId, addresseeId, message: message ?? null },
  })
  return { ok: true }
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
export async function listConnections(
  userId: string
): Promise<{
  accepted: ConnectionWithProfile[]
  pendingIncoming: ConnectionWithProfile[]
  pendingOutgoing: ConnectionWithProfile[]
}> {
  const outgoing = await db.connection.findMany({
    where: { requesterId: userId },
    include: { addressee: { select: { id: true, fullName: true, headline: true, email: true, photoUrl: true } } },
    orderBy: { updatedAt: "desc" },
  })
  const incoming = await db.connection.findMany({
    where: { addresseeId: userId },
    include: { requester: { select: { id: true, fullName: true, headline: true, email: true, photoUrl: true } } },
    orderBy: { updatedAt: "desc" },
  })

  const mapOut = (c: typeof outgoing): ConnectionWithProfile[] =>
    c.map((x) => ({
      id: x.id,
      status: x.status as ConnectionStatus,
      message: x.message,
      createdAt: x.createdAt,
      updatedAt: x.updatedAt,
      other: x.addressee,
      isRequester: true,
    }))
  const mapIn = (c: typeof incoming): ConnectionWithProfile[] =>
    c.map((x) => ({
      id: x.id,
      status: x.status as ConnectionStatus,
      message: x.message,
      createdAt: x.createdAt,
      updatedAt: x.updatedAt,
      other: x.requester,
      isRequester: false,
    }))

  return {
    accepted: [...mapOut(outgoing), ...mapIn(incoming)].filter((c) => c.status === "accepted"),
    pendingIncoming: mapIn(incoming).filter((c) => c.status === "pending"),
    pendingOutgoing: mapOut(outgoing).filter((c) => c.status === "pending"),
  }
}

/**
 * Search for users by name or email (for sending connection requests).
 * Excludes the current user and already-connected/pending users.
 */
export async function searchUsers(
  currentUserId: string,
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
  const q = query.trim().toLowerCase()
  if (!q) return []

  // Find users whose email or fullName matches
  const profiles = await db.userProfile.findMany({
    where: {
      AND: [
        { accountId: { not: currentUserId } },
        {
          OR: [
            { email: { contains: q } },
            { fullName: { contains: q } },
          ],
        },
      ],
    },
    select: { id: true, fullName: true, headline: true, email: true, photoUrl: true, accountId: true },
    take: limit,
  })

  // For each, check connection status with current user
  const myProfile = await db.userProfile.findUnique({
    where: { accountId: currentUserId },
    select: { id: true },
  })
  if (!myProfile) return []

  const result: Array<{
    id: string
    fullName: string | null
    headline: string | null
    email: string | null
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
      fullName: p.fullName,
      headline: p.headline,
      email: p.email,
      photoUrl: p.photoUrl,
      connectionStatus: (conn?.status as ConnectionStatus) ?? "none",
    })
  }
  return result
}
