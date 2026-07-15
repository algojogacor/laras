import "server-only"
import { db } from "@/lib/db"
import { getSession } from "@/lib/auth"

// ============================================================================
// Notification Service — Phase 2C
// Durable notification store with read state and recipient-scoped access.
// ============================================================================

export type NotificationType =
  | "connection.request"
  | "connection.accepted"
  | "announcement"
  | "system"

export interface CreateNotificationInput {
  userProfileId: string
  type: NotificationType
  title: string
  body?: string
  resourceType?: string
  resourceId?: string
}

/**
 * Create a notification for a specific recipient.
 */
export async function createNotification(
  input: CreateNotificationInput
): Promise<void> {
  try {
    await db.notification.create({
      data: {
        userProfileId: input.userProfileId,
        type: input.type,
        title: input.title,
        body: input.body || null,
        resourceType: input.resourceType || null,
        resourceId: input.resourceId || null,
      },
    })
  } catch {
    console.error("[notifications] Failed to create notification:", input.type)
  }
}

/**
 * Get unread notification count for the current user.
 * Used by the header badge.
 */
export async function getUnreadCount(): Promise<number> {
  const session = await getSession()
  if (!session) return 0

  const profile = await db.userProfile.findUnique({
    where: { accountId: session.userId },
    select: { id: true },
  })
  if (!profile) return 0

  return db.notification.count({
    where: {
      userProfileId: profile.id,
      readAt: null,
    },
  })
}

/**
 * Get pending connection request count.
 * Kept for backward compatibility with existing code.
 */
export async function getPendingConnectionCount(): Promise<number> {
  const session = await getSession()
  if (!session) return 0

  const profile = await db.userProfile.findUnique({
    where: { accountId: session.userId },
    select: { id: true },
  })
  if (!profile) return 0

  return db.connection.count({
    where: { addresseeId: profile.id, status: "pending" },
  })
}

export interface NotificationItem {
  id: string
  type: string
  title: string
  body: string | null
  resourceType: string | null
  resourceId: string | null
  readAt: string | null
  createdAt: Date
}

/**
 * Get paginated notifications for the current user.
 */
export async function getUserNotifications(
  profileId: string,
  opts?: { cursor?: string; limit?: number }
): Promise<{ items: NotificationItem[]; nextCursor: string | null }> {
  const limit = opts?.limit ?? 20

  const items = await db.notification.findMany({
    where: { userProfileId: profileId },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(opts?.cursor
      ? { cursor: { id: opts.cursor }, skip: 1 }
      : {}),
    select: {
      id: true,
      type: true,
      title: true,
      body: true,
      resourceType: true,
      resourceId: true,
      readAt: true,
      createdAt: true,
    },
  })

  const hasMore = items.length > limit
  const result = hasMore ? items.slice(0, limit) : items

  return {
    items: result.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body,
      resourceType: n.resourceType,
      resourceId: n.resourceId,
      readAt: n.readAt?.toISOString() ?? null,
      createdAt: n.createdAt,
    })),
    nextCursor: hasMore ? result[result.length - 1].id : null,
  }
}

/**
 * Mark a notification as read.
 * Returns false if the notification doesn't belong to the user.
 */
export async function markAsRead(
  notificationId: string,
  profileId: string
): Promise<boolean> {
  const result = await db.notification.updateMany({
    where: {
      id: notificationId,
      userProfileId: profileId,
      readAt: null,
    },
    data: { readAt: new Date() },
  })

  return result.count > 0
}

/**
 * Mark all notifications as read for a user.
 */
export async function markAllAsRead(profileId: string): Promise<number> {
  const result = await db.notification.updateMany({
    where: {
      userProfileId: profileId,
      readAt: null,
    },
    data: { readAt: new Date() },
  })

  return result.count
}
