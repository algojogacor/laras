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
  getCircleMembers,
  joinCircle,
  leaveCircle,
} from "@/lib/circles"

/**
 * GET /api/circles/[id]/members
 * List members of a circle.
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

    const members = await getCircleMembers(id, profileId)
    return safeNextResponse({ members })
  } catch (error) {
    return handleAuthorizationError(error)
  }
}

/**
 * POST /api/circles/[id]/members
 * Join a circle.
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

    // Rate limit by user
    const rateLimitKey = `user:${actor.accountId}`
    const limited = applyRateLimit(request, "circles", rateLimitKey)
    if (limited) return limited

    const result = await joinCircle(profileId, id)
    return safeNextResponse(result)
  } catch (error) {
    return handleAuthorizationError(error)
  }
}

/**
 * DELETE /api/circles/[id]/members
 * Leave a circle.
 */
export async function DELETE(
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

    await leaveCircle(profileId, id)
    return safeNextResponse({ ok: true })
  } catch (error) {
    return handleAuthorizationError(error)
  }
}
