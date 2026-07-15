import { NextRequest } from "next/server"
import { requireActor, getRequiredProfileId, handleAuthorizationError, safeNextResponse } from "@/lib/authorization"
import { getInboxCount } from "@/lib/inbox"

/**
 * GET /api/inbox/count
 *
 * Returns total unread count across all inbox sources with a breakdown
 * by entry type.
 */
export async function GET(_request: NextRequest) {
  try {
    const actor = await requireActor()
    const profileId = getRequiredProfileId(actor)

    const result = await getInboxCount(profileId)

    return safeNextResponse(result)
  } catch (error) {
    return handleAuthorizationError(error)
  }
}
