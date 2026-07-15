import {
  getMessageRequests,
  sendMessageRequest,
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
 * GET /api/messages/requests
 * Returns pending incoming message requests for the current user.
 */
export async function GET() {
  try {
    const actor = await requireActor()
    const profileId = getRequiredProfileId(actor)

    const requests = await getMessageRequests(profileId)
    return safeNextResponse({ requests })
  } catch (error) {
    return handleAuthorizationError(error)
  }
}

/**
 * POST /api/messages/requests
 * Body: { recipientId: string, body: string }
 * Sends a message request to a user.
 * Used when users are not yet connected.
 */
export async function POST(request: Request) {
  try {
    const actor = await requireActor()
    const profileId = getRequiredProfileId(actor)

    let body: { recipientId?: string; body?: string }
    try {
      body = await request.json()
    } catch {
      throw new AuthorizationError("BAD_REQUEST")
    }

    const recipientId = body.recipientId?.trim()
    if (!isValidId(recipientId)) {
      throw new AuthorizationError("BAD_REQUEST")
    }

    if (recipientId === profileId) {
      throw new AuthorizationError("BAD_REQUEST")
    }

    const messageBody = body.body?.trim()
    if (!messageBody) {
      throw new AuthorizationError("BAD_REQUEST")
    }

    if (messageBody.length > 5000) {
      throw new AuthorizationError("BAD_REQUEST")
    }

    const result = await sendMessageRequest(profileId, recipientId, messageBody)
    return safeNextResponse({ ok: true, requestId: result.id })
  } catch (error) {
    return handleAuthorizationError(error)
  }
}
