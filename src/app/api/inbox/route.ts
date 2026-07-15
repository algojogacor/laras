import { NextRequest } from "next/server"
import { requireActor, getRequiredProfileId, handleAuthorizationError, safeNextResponse, AuthorizationError } from "@/lib/authorization"
import { getUnifiedInbox, type InboxEntryType } from "@/lib/inbox"

const VALID_TYPES: InboxEntryType[] = [
  "notification",
  "message",
  "message_request",
  "mentorship_request",
  "peer_review_request",
  "organization_invitation",
  "announcement",
]

/**
 * GET /api/inbox
 *
 * Unified inbox with cursor pagination. Merges notifications, messages,
 * requests, invitations, and announcements into a single timeline.
 *
 * Query params:
 *   - cursor: pagination cursor
 *   - limit: items per page (default 20, max 50)
 *   - type: filter by entry type
 */
export async function GET(request: NextRequest) {
  try {
    const actor = await requireActor()
    const profileId = getRequiredProfileId(actor)

    const { searchParams } = new URL(request.url)
    const cursor = searchParams.get("cursor") ?? undefined
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "20", 10) || 20, 50)
    const typeParam = searchParams.get("type") ?? undefined

    // Validate type filter
    let typeFilter: InboxEntryType | undefined
    if (typeParam && (VALID_TYPES as string[]).includes(typeParam)) {
      typeFilter = typeParam as InboxEntryType
    }

    const result = await getUnifiedInbox(profileId, {
      cursor,
      limit,
      type: typeFilter,
    })

    return safeNextResponse(result)
  } catch (error) {
    return handleAuthorizationError(error)
  }
}
