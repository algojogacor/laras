import { db } from "@/lib/db"
import {
  getConversations,
  startConversation,
} from "@/lib/messaging"
import {
  requireActor,
  getRequiredProfileId,
  handleAuthorizationError,
  AuthorizationError,
  isValidId,
  safeNextResponse,
} from "@/lib/authorization"
import { applyRateLimit } from "@/lib/rate-limit"

/**
 * GET /api/messages
 * Returns the current user's conversations with last message and unread count.
 */
export async function GET(request: Request) {
  try {
    const actor = await requireActor()
    const profileId = getRequiredProfileId(actor)

    const conversations = await getConversations(profileId)
    return safeNextResponse({ conversations })
  } catch (error) {
    return handleAuthorizationError(error)
  }
}

/**
 * POST /api/messages
 * Body: { participantIds: string[], initialMessage: string }
 * Starts a new conversation with connected users.
 * Rate-limited: 30 messages per minute per user.
 */
export async function POST(request: Request) {
  try {
    const actor = await requireActor()
    const profileId = getRequiredProfileId(actor)

    // Rate limit: 30 messages per minute per user
    const rateLimitCheck = applyRateLimit(
      request,
      "api",
      `user:${profileId}:messages`
    )
    if (rateLimitCheck) return rateLimitCheck

    let body: { participantIds?: string[]; initialMessage?: string }
    try {
      body = await request.json()
    } catch {
      throw new AuthorizationError("BAD_REQUEST")
    }

    const participantIds = Array.isArray(body.participantIds)
      ? body.participantIds.filter((id) => typeof id === "string")
      : []

    if (participantIds.length === 0) {
      throw new AuthorizationError("BAD_REQUEST")
    }

    // Validate all participant IDs
    for (const id of participantIds) {
      if (!isValidId(id)) {
        throw new AuthorizationError("BAD_REQUEST")
      }
    }

    // Prevent self-conversation
    if (participantIds.includes(profileId)) {
      throw new AuthorizationError("BAD_REQUEST")
    }

    const initialMessage = body.initialMessage?.trim()
    if (!initialMessage) {
      throw new AuthorizationError("BAD_REQUEST")
    }

    const result = await startConversation(profileId, participantIds, initialMessage)

    return safeNextResponse({ ok: true, conversationId: result.conversation.id })
  } catch (error) {
    return handleAuthorizationError(error)
  }
}
