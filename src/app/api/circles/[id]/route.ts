import {
  requireActor,
  getRequiredProfileId,
  handleAuthorizationError,
  AuthorizationError,
  isValidId,
  safeNextResponse,
} from "@/lib/authorization"
import {
  getCircle,
  updateMemberRole,
  deleteCircle,
} from "@/lib/circles"

/**
 * GET /api/circles/[id]
 * Get circle details including the viewer's membership role.
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

    const circle = await getCircle(id, profileId)
    return safeNextResponse({ circle })
  } catch (error) {
    return handleAuthorizationError(error)
  }
}

/**
 * PATCH /api/circles/[id]
 * Update member roles or delete the circle.
 * Body: { action: "promote" | "demote" | "delete", targetProfileId?, role? }
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

    let body: { action?: string; targetProfileId?: string; role?: string }
    try {
      body = await request.json()
    } catch {
      throw new AuthorizationError("BAD_REQUEST")
    }

    if (body.action === "delete") {
      await deleteCircle(profileId, id)
      return safeNextResponse({ ok: true })
    }

    if (body.action === "promote" || body.action === "demote") {
      if (!body.targetProfileId || !isValidId(body.targetProfileId)) {
        throw new AuthorizationError("BAD_REQUEST")
      }
      // Validate role against allowlist — prevents privilege escalation
      const VALID_CIRCLE_ROLES = ["member", "moderator", "admin"] as const
      const role = body.action === "promote"
        ? (typeof body.role === "string" && VALID_CIRCLE_ROLES.includes(body.role as any) ? body.role : "moderator")
        : "member"
      await updateMemberRole(profileId, id, body.targetProfileId, role as typeof VALID_CIRCLE_ROLES[number])
      return safeNextResponse({ ok: true })
    }

    throw new AuthorizationError("BAD_REQUEST")
  } catch (error) {
    return handleAuthorizationError(error)
  }
}
