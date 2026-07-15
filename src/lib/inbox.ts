import "server-only"
import { db } from "@/lib/db"

// ============================================================================
// Unified Inbox — Phase 8B
// Merged timeline of notifications, messages, requests, invitations, and
// announcements with deduplication and cursor pagination.
// ============================================================================

export type InboxEntryType =
  | "notification"
  | "message"
  | "message_request"
  | "mentorship_request"
  | "peer_review_request"
  | "organization_invitation"
  | "announcement"

export interface InboxEntry {
  id: string // unique dedup key
  type: InboxEntryType
  title: string
  body: string | null
  resourceType: string | null
  resourceId: string | null
  createdAt: Date
  read: boolean
  actionUrl: string | null
  subType: string | null // underlying notification/message type
}

export interface InboxResponse {
  entries: InboxEntry[]
  nextCursor: string | null
  total: number
}

export interface InboxCountResponse {
  total: number
  breakdown: Record<InboxEntryType, number>
}

export interface InboxOptions {
  cursor?: string
  limit?: number
  type?: InboxEntryType // filter by type
}

interface InboxCursor {
  timestamp: number
  id: string
}

function encodeInboxCursor(data: InboxCursor): string {
  return Buffer.from(JSON.stringify(data)).toString("base64url")
}

function decodeInboxCursor(cursor: string): InboxCursor | null {
  try {
    return JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as InboxCursor
  } catch {
    return null
  }
}

function buildActionUrl(type: InboxEntryType, resourceId: string | null): string | null {
  if (!resourceId) return null
  switch (type) {
    case "notification":
      return `/notifications`
    case "message":
      return `/messages/${resourceId}`
    case "message_request":
      return `/messages/requests`
    case "mentorship_request":
      return `/mentorship/requests`
    case "peer_review_request":
      return `/circles/${resourceId}`
    case "organization_invitation":
      return `/organizations/${resourceId}`
    case "announcement":
      return `/announcements/${resourceId}`
    default:
      return null
  }
}

/**
 * Deduplicate entries: same event type + resource = one entry.
 * Creates a stable key from type + resourceType + resourceId.
 */
function dedupKey(entry: Omit<InboxEntry, "id">): string {
  return `${entry.type}:${entry.resourceType ?? "none"}:${entry.resourceId ?? entry.title}`
}

/**
 * Get unified inbox entries for a user.
 *
 * Merges:
 *  - Unread notifications
 *  - Unread messages
 *  - Pending message requests
 *  - Pending mentorship requests
 *  - Pending peer review requests (placeholder)
 *  - Organization invitations (placeholder)
 *  - Unread announcements
 */
export async function getUnifiedInbox(
  userProfileId: string,
  opts?: InboxOptions
): Promise<InboxResponse> {
  const limit = opts?.limit ?? 20
  const filterType = opts?.type

  // Decode cursor
  let cursorTimestamp = 0
  let cursorId = ""
  if (opts?.cursor) {
    const decoded = decodeInboxCursor(opts.cursor)
    if (decoded) {
      cursorTimestamp = decoded.timestamp
      cursorId = decoded.id
    }
  }

  // Collect all raw entries
  const rawEntries: Omit<InboxEntry, "id">[] = []

  // 1. Unread notifications
  if (!filterType || filterType === "notification") {
    const notifications = await db.notification.findMany({
      where: {
        userProfileId,
        readAt: null,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        type: true,
        title: true,
        body: true,
        resourceType: true,
        resourceId: true,
        readAt: true,
        createdAt: true,
      },
    })

    for (const n of notifications) {
      rawEntries.push({
        type: "notification",
        title: n.title,
        body: n.body,
        resourceType: n.resourceType,
        resourceId: n.resourceId,
        createdAt: n.createdAt,
        read: n.readAt !== null,
        actionUrl: buildActionUrl("notification", n.resourceId),
        subType: n.type,
      })
    }
  }

  // 2. Unread messages
  if (!filterType || filterType === "message") {
    // Get conversations the user participates in
    const participations = await db.conversationParticipant.findMany({
      where: { userProfileId },
      select: {
        conversationId: true,
        lastReadAt: true,
        conversation: {
          select: {
            id: true,
            title: true,
            messages: {
              orderBy: { createdAt: "desc" },
              take: 1,
              select: {
                id: true,
                body: true,
                createdAt: true,
                sender: { select: { fullName: true } },
              },
            },
          },
        },
      },
    })

    for (const p of participations) {
      const lastMsg = p.conversation.messages[0]
      if (!lastMsg) continue

      // Check if there are unread messages
      const isUnread = !p.lastReadAt || lastMsg.createdAt > p.lastReadAt

      rawEntries.push({
        type: "message",
        title: p.conversation.title ?? lastMsg.sender.fullName ?? "Message",
        body: lastMsg.body,
        resourceType: "Conversation",
        resourceId: p.conversation.id,
        createdAt: lastMsg.createdAt,
        read: !isUnread,
        actionUrl: buildActionUrl("message", p.conversation.id),
        subType: isUnread ? "unread" : "read",
      })
    }
  }

  // 3. Pending message requests
  if (!filterType || filterType === "message_request") {
    const msgRequests = await db.messageRequest.findMany({
      where: {
        recipientId: userProfileId,
        status: "pending",
      },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        body: true,
        createdAt: true,
        sender: { select: { fullName: true } },
      },
    })

    for (const mr of msgRequests) {
      rawEntries.push({
        type: "message_request",
        title: `Message request from ${mr.sender.fullName ?? "someone"}`,
        body: mr.body,
        resourceType: "MessageRequest",
        resourceId: mr.id,
        createdAt: mr.createdAt,
        read: false,
        actionUrl: buildActionUrl("message_request", mr.id),
        subType: "pending",
      })
    }
  }

  // 4. Pending mentorship requests
  if (!filterType || filterType === "mentorship_request") {
    const mentorshipRequests = await db.mentorshipRequest.findMany({
      where: {
        mentorId: userProfileId,
        status: "pending",
      },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        message: true,
        goals: true,
        createdAt: true,
        mentee: { select: { fullName: true } },
      },
    })

    for (const mr of mentorshipRequests) {
      rawEntries.push({
        type: "mentorship_request",
        title: `Mentorship request from ${mr.mentee.fullName ?? "someone"}`,
        body: mr.message ?? "They would like you to be their mentor.",
        resourceType: "MentorshipRequest",
        resourceId: mr.id,
        createdAt: mr.createdAt,
        read: false,
        actionUrl: buildActionUrl("mentorship_request", mr.id),
        subType: "pending",
      })
    }
  }

  // 5. Pending peer review requests (placeholder — no dedicated model yet)
  if (!filterType || filterType === "peer_review_request") {
    // Placeholder: no peer review model exists yet.
    // When implemented, query peer review requests for the user here.
  }

  // 6. Organization invitations (placeholder — no dedicated model yet)
  if (!filterType || filterType === "organization_invitation") {
    // Placeholder: no invitation model exists yet.
    // When implemented, query org invitations for the user here.
  }

  // 7. Unread announcements
  if (!filterType || filterType === "announcement") {
    const announcements = await db.announcement.findMany({
      where: {
        status: "published",
        publishedAt: { not: null },
        reads: {
          none: { userProfileId },
        },
      },
      orderBy: { publishedAt: "desc" },
      take: 50,
      select: {
        id: true,
        title: true,
        body: true,
        priority: true,
        publishedAt: true,
      },
    })

    for (const a of announcements) {
      rawEntries.push({
        type: "announcement",
        title: a.title,
        body: a.body,
        resourceType: "Announcement",
        resourceId: a.id,
        createdAt: a.publishedAt ?? new Date(),
        read: false,
        actionUrl: buildActionUrl("announcement", a.id),
        subType: a.priority,
      })
    }
  }

  // Deduplicate entries
  const seen = new Map<string, Omit<InboxEntry, "id">>()
  for (const entry of rawEntries) {
    const key = dedupKey(entry)
    if (!seen.has(key)) {
      seen.set(key, entry)
    }
  }

  // Sort by createdAt descending
  const deduped = Array.from(seen.entries()).map(([key, entry]) => ({
    ...entry,
    id: key,
  }))

  deduped.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

  // Apply cursor filtering
  let filtered = deduped
  if (cursorTimestamp > 0 || cursorId) {
    filtered = deduped.filter((e) => {
      if (e.createdAt.getTime() < cursorTimestamp) return true
      if (e.createdAt.getTime() === cursorTimestamp && e.id < cursorId) return true
      return false
    })
  }

  const total = filtered.length
  const paginated = filtered.slice(0, limit)
  const hasMore = paginated.length < filtered.length
  const lastEntry = paginated[paginated.length - 1] ?? null
  const nextCursor =
    hasMore && lastEntry
      ? encodeInboxCursor({ timestamp: lastEntry.createdAt.getTime(), id: lastEntry.id })
      : null

  return {
    entries: paginated,
    nextCursor,
    total,
  }
}

/**
 * Get total unread count across all inbox sources.
 */
export async function getInboxCount(userProfileId: string): Promise<InboxCountResponse> {
  const breakdown: Record<InboxEntryType, number> = {
    notification: 0,
    message: 0,
    message_request: 0,
    mentorship_request: 0,
    peer_review_request: 0,
    organization_invitation: 0,
    announcement: 0,
  }

  // Unread notifications
  breakdown.notification = await db.notification.count({
    where: { userProfileId, readAt: null },
  })

  // Unread messages
  const participations = await db.conversationParticipant.findMany({
    where: { userProfileId },
    select: {
      lastReadAt: true,
      conversation: {
        select: {
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { createdAt: true },
          },
        },
      },
    },
  })

  for (const p of participations) {
    const lastMsg = p.conversation.messages[0]
    if (lastMsg && (!p.lastReadAt || lastMsg.createdAt > p.lastReadAt)) {
      breakdown.message++
    }
  }

  // Pending message requests
  breakdown.message_request = await db.messageRequest.count({
    where: { recipientId: userProfileId, status: "pending" },
  })

  // Pending mentorship requests
  breakdown.mentorship_request = await db.mentorshipRequest.count({
    where: { mentorId: userProfileId, status: "pending" },
  })

  // Pending peer review requests — placeholder
  breakdown.peer_review_request = 0

  // Organization invitations — placeholder
  breakdown.organization_invitation = 0

  // Unread announcements
  breakdown.announcement = await db.announcement.count({
    where: {
      status: "published",
      publishedAt: { not: null },
      reads: {
        none: { userProfileId },
      },
    },
  })

  const total = Object.values(breakdown).reduce((sum, v) => sum + v, 0)

  return { total, breakdown }
}
