import {
  acceptMessageRequest,
  declineMessageRequest,
} from "@/lib/messaging"
import {
  requireActor,
  getRequiredProfileId,
  handleAuthorizationError,
  AuthorizationError,
  isValidId,
  safeNextResponse,
} from "@/lib/authorization"

/**
 * PATCH /api/messages/requests/[id]
 * Body: { action: "accept" | "decline" }
 * Accepts or declines a pending message request.
 * Only the recipient can accept/decline.
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
      const result = await acceptMessageRequest(id, profileId)
      return safeNextResponse({ ok: true, conversationId: result.conversationId })
    } else if (body.action === "decline") {
      await declineMessageRequest(id, profileId)
      return safeNextResponse({ ok: true })
    } else {
      throw new AuthorizationError("BAD_REQUEST")
    }
  } catch (error) {
    return handleAuthorizationError(error)
  }
}
