import {
  getMessages,
  sendMessage,
} from "@/lib/messaging"
import {
  requireActor,
  getRequiredProfileId,
  handleAuthorizationError,
  AuthorizationError,
  isValidId,
  safeNextResponse,
} from "@/lib/authorization"
import { applyRateLimit, rateLimit, RATE_LIMITS } from "@/lib/rate-limit"

const MESSAGE_RATE_LIMIT = { limit: 30, windowMs: 60_000 }

/**
 * GET /api/messages/[id]
 * Returns paginated messages for a conversation.
 * Only participants can read.
 */
export async function GET(
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

    const { searchParams } = new URL(request.url)
    const cursor = searchParams.get("cursor") || undefined

    const result = await getMessages(id, profileId, cursor)
    return safeNextResponse(result)
  } catch (error) {
    return handleAuthorizationError(error)
  }
}

/**
 * POST /api/messages/[id]
 * Body: { body: string }
 * Sends a message in a conversation.
 * Rate-limited: 30 messages per minute per user.
 */
export async function POST(
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

    // Rate limit: 30 messages per minute per user
    const rateLimitCheck = applyRateLimit(
      request,
      "api",
      `user:${profileId}:messages`
    )
    if (rateLimitCheck) return rateLimitCheck

    let body: { body?: string }
    try {
      body = await request.json()
    } catch {
      throw new AuthorizationError("BAD_REQUEST")
    }

    const messageBody = body.body?.trim()
    if (!messageBody) {
      throw new AuthorizationError("BAD_REQUEST")
    }

    if (messageBody.length > 5000) {
      throw new AuthorizationError("BAD_REQUEST")
    }

    const result = await sendMessage(id, profileId, messageBody)

    return safeNextResponse({ ok: true, messageId: result.id })
  } catch (error) {
    return handleAuthorizationError(error)
  }
}
