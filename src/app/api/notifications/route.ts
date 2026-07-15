import { NextRequest } from "next/server"
import { requireActor, getRequiredProfileId, handleAuthorizationError, safeNextResponse, AuthorizationError, isValidId } from "@/lib/authorization"
import { getUserNotifications, markAsRead, markAllAsRead } from "@/lib/notifications"

/**
 * GET /api/notifications
 * List notifications for the current user with cursor-based pagination.
 */
export async function GET(request: NextRequest) {
  try {
    const actor = await requireActor()
    const profileId = getRequiredProfileId(actor)

    const { searchParams } = new URL(request.url)
    const cursor = searchParams.get("cursor") || undefined
    const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10) || 20, 50)

    const result = await getUserNotifications(profileId, { cursor, limit })

    return safeNextResponse(result)
  } catch (error) {
    return handleAuthorizationError(error)
  }
}

/**
 * PATCH /api/notifications
 * Mark notification(s) as read. Body: { id: string } for single, { markAll: true } for all.
 */
export async function PATCH(request: NextRequest) {
  try {
    const actor = await requireActor()
    const profileId = getRequiredProfileId(actor)

    const body = await request.json().catch(() => {
      throw new AuthorizationError("BAD_REQUEST")
    })

    if (!body || typeof body !== "object") {
      throw new AuthorizationError("BAD_REQUEST")
    }

    const { id, markAll } = body as Record<string, unknown>

    if (markAll === true) {
      const count = await markAllAsRead(profileId)
      return safeNextResponse({ markedRead: count })
    }

    if (typeof id === "string" && isValidId(id)) {
      const success = await markAsRead(id, profileId)
      if (!success) {
        throw new AuthorizationError("NOT_FOUND")
      }
      return safeNextResponse({ markedRead: 1 })
    }

    throw new AuthorizationError("BAD_REQUEST")
  } catch (error) {
    return handleAuthorizationError(error)
  }
}
