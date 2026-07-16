import {
  requireActor,
  getRequiredProfileId,
  handleAuthorizationError,
  AuthorizationError,
  isValidId,
  safeNextResponse,
} from "@/lib/authorization"
import { applyRateLimit } from "@/lib/rate-limit"
import {
  getMentorshipRequests,
  requestMentorship,
} from "@/lib/mentorship"

/**
 * GET /api/mentorship/requests
 * Get mentorship requests for the current user.
 * Supports ?filter=incoming|outgoing query param.
 */
export async function GET(request: Request) {
  try {
    const actor = await requireActor()
    const profileId = getRequiredProfileId(actor)

    const { searchParams } = new URL(request.url)
    const filter = searchParams.get("filter") as "incoming" | "outgoing" | undefined

    const requests = await getMentorshipRequests(profileId, filter)
    return safeNextResponse({ requests })
  } catch (error) {
    return handleAuthorizationError(error)
  }
}

/**
 * POST /api/mentorship/requests
 * Request mentorship from a mentor.
 * Body: { mentorId, message?, goals? }
 */
export async function POST(request: Request) {
  try {
    const actor = await requireActor()
    const profileId = getRequiredProfileId(actor)

    // Rate limit by user
    const rateLimitKey = `user:${actor.accountId}`
    const limited = applyRateLimit(request, "mentorship", rateLimitKey)
    if (limited) return limited

    let body: {
      mentorId?: string
      message?: string
      goals?: { goal: string; timeline?: string }[]
    }
    try {
      body = await request.json()
    } catch {
      throw new AuthorizationError("BAD_REQUEST")
    }

    if (!body.mentorId || !isValidId(body.mentorId)) {
      throw new AuthorizationError("BAD_REQUEST")
    }

    const result = await requestMentorship(
      profileId,
      body.mentorId,
      body.message,
      body.goals
    )

    return safeNextResponse(result, { status: 201 })
  } catch (error) {
    return handleAuthorizationError(error)
  }
}
