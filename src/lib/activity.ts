import "server-only"
import { db } from "@/lib/db"

// ============================================================================
// Activity Event Layer — Phase 2B
// Durable, append-only event store. Replaces on-the-fly computation.
// ============================================================================

export type ActivityEventType =
  | "document.create"
  | "document.revise"
  | "application.create"
  | "application.update"
  | "interview.create"
  | "english.complete"
  | "profile.update"
  | "connection.accept"
  | "evidence.create"
  | "certificate.issue"

export interface EmitEventInput {
  userProfileId: string
  type: ActivityEventType
  resourceType?: string
  resourceId?: string
  metadata?: Record<string, unknown>
}

/**
 * Emit a single activity event. Call this from API routes after successful
 * mutations. This is fire-and-forget — callers should not await this for the
 * HTTP response.
 */
export async function emitEvent(input: EmitEventInput): Promise<void> {
  try {
    await db.activityEvent.create({
      data: {
        userProfileId: input.userProfileId,
        type: input.type,
        resourceType: input.resourceType || null,
        resourceId: input.resourceId || null,
        metadata: input.metadata ? JSON.stringify(input.metadata) : null,
      },
    })
  } catch {
    // Silently fail — activity events are non-critical for the user response
    console.error("[activity] Failed to emit event:", input.type)
  }
}

export interface ActivityEventItem {
  id: string
  type: string
  resourceType: string | null
  resourceId: string | null
  metadata: Record<string, unknown> | null
  createdAt: Date
}

/**
 * Get recent activity for a user profile. Used by the dashboard timeline.
 * Limited to 50 most recent events.
 */
export async function getRecentActivity(
  userProfileId: string,
  limit: number = 50
): Promise<ActivityEventItem[]> {
  const events = await db.activityEvent.findMany({
    where: { userProfileId },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      type: true,
      resourceType: true,
      resourceId: true,
      metadata: true,
      createdAt: true,
    },
  })

  return events.map((e) => ({
    id: e.id,
    type: e.type,
    resourceType: e.resourceType,
    resourceId: e.resourceId,
    metadata: e.metadata ? safeJsonParse(e.metadata) : null,
    createdAt: e.createdAt,
  }))
}

function safeJsonParse(raw: string): Record<string, unknown> | null {
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}
