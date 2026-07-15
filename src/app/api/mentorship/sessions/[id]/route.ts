import {
  requireActor,
  getRequiredProfileId,
  handleAuthorizationError,
  AuthorizationError,
  isValidId,
  safeNextResponse,
} from "@/lib/authorization"
import { completeSession } from "@/lib/mentorship"

/**
 * PATCH /api/mentorship/sessions/[id]
 * Mark a session as complete with optional feedback.
 * Body: { action: "complete", feedback?: { rating?, comments?, goalsProgress? } }
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

    let body: {
      action?: string
      feedback?: { rating?: number; comments?: string; goalsProgress?: string }
    }
    try {
      body = await request.json()
    } catch {
      throw new AuthorizationError("BAD_REQUEST")
    }

    if (body.action === "complete") {
      await completeSession(id, profileId, body.feedback)
      return safeNextResponse({ ok: true })
    }

    throw new AuthorizationError("BAD_REQUEST")
  } catch (error) {
    return handleAuthorizationError(error)
  }
}
