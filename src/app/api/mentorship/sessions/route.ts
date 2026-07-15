import {
  requireActor,
  getRequiredProfileId,
  handleAuthorizationError,
  AuthorizationError,
  isValidId,
  safeNextResponse,
} from "@/lib/authorization"
import {
  getMentorshipSessions,
  scheduleSession,
} from "@/lib/mentorship"

/**
 * GET /api/mentorship/sessions
 * Get mentorship sessions for the current user.
 */
export async function GET(request: Request) {
  try {
    const actor = await requireActor()
    const profileId = getRequiredProfileId(actor)

    const sessions = await getMentorshipSessions(profileId)
    return safeNextResponse({ sessions })
  } catch (error) {
    return handleAuthorizationError(error)
  }
}

/**
 * POST /api/mentorship/sessions
 * Schedule a mentorship session.
 * Body: { mentorId, menteeId, title, scheduledAt, requestId?, notes? }
 */
export async function POST(request: Request) {
  try {
    const actor = await requireActor()
    const profileId = getRequiredProfileId(actor)

    let body: {
      mentorId?: string
      menteeId?: string
      title?: string
      scheduledAt?: string
      requestId?: string
      notes?: string
    }
    try {
      body = await request.json()
    } catch {
      throw new AuthorizationError("BAD_REQUEST")
    }

    if (
      !body.mentorId || !isValidId(body.mentorId) ||
      !body.menteeId || !isValidId(body.menteeId) ||
      !body.title?.trim() ||
      !body.scheduledAt
    ) {
      throw new AuthorizationError("BAD_REQUEST")
    }

    const scheduledAt = new Date(body.scheduledAt)
    if (isNaN(scheduledAt.getTime())) {
      throw new AuthorizationError("BAD_REQUEST")
    }

    const result = await scheduleSession(
      profileId,
      body.mentorId,
      body.menteeId,
      body.title,
      scheduledAt,
      body.requestId,
      body.notes
    )

    return safeNextResponse(result, { status: 201 })
  } catch (error) {
    return handleAuthorizationError(error)
  }
}
