import {
  requireActor,
  getRequiredProfileId,
  handleAuthorizationError,
  AuthorizationError,
  isValidId,
  safeNextResponse,
} from "@/lib/authorization"
import {
  acceptMentorship,
  declineMentorship,
} from "@/lib/mentorship"

/**
 * PATCH /api/mentorship/requests/[id]
 * Accept or decline a mentorship request.
 * Body: { action: "accept" | "decline" }
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await requireActor()
    const profileId = getRequiredProfileId(actor)
    const { id } = await params

    if (!isValidId(id)) {
      throw new AuthorizationError("BAD_REQUEST")
    }

    let body: { action?: string }
    try {
      body = await request.json()
    } catch {
      throw new AuthorizationError("BAD_REQUEST")
    }

    if (body.action === "accept") {
      await acceptMentorship(id, profileId)
      return safeNextResponse({ ok: true })
    }

    if (body.action === "decline") {
      await declineMentorship(id, profileId)
      return safeNextResponse({ ok: true })
    }

    throw new AuthorizationError("BAD_REQUEST")
  } catch (error) {
    return handleAuthorizationError(error)
  }
}
