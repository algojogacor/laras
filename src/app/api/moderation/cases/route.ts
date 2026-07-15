import { NextRequest } from "next/server"
import {
  requireActor,
  handleAuthorizationError,
  AuthorizationError,
  safeNextResponse,
  requireModeratorOrAbove,
  isValidId,
} from "@/lib/authorization"
import { createCase, getCases, revokeCase, getCaseById } from "@/lib/moderation"

/**
 * GET /api/moderation/cases
 * List moderation cases. Moderator+ only.
 * Query: ?subjectId=...&status=...&cursor=...&limit=...
 * Also supports ?id=... to get a single case by ID.
 */
export async function GET(request: NextRequest) {
  try {
    const actor = await requireActor()
    requireModeratorOrAbove(actor)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (id) {
      if (!isValidId(id)) throw new AuthorizationError("BAD_REQUEST")
      const mc = await getCaseById(id)
      if (!mc) throw new AuthorizationError("NOT_FOUND")
      return safeNextResponse({ case: mc })
    }

    const subjectId = searchParams.get("subjectId") || undefined
    const status = searchParams.get("status") || undefined
    const cursor = searchParams.get("cursor") || undefined
    const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10) || 20, 50)

    const result = await getCases({
      subjectId,
      status: status as any,
      limit,
      cursor,
    })

    return safeNextResponse(result)
  } catch (error) {
    return handleAuthorizationError(error)
  }
}

/**
 * POST /api/moderation/cases
 * Create a moderation case. Moderator+ only.
 * Body: { subjectId, type, reason, duration?, reportId? }
 */
export async function POST(request: NextRequest) {
  try {
    const actor = await requireActor()
    requireModeratorOrAbove(actor)

    const body = await request.json().catch(() => {
      throw new AuthorizationError("BAD_REQUEST")
    })

    if (!body || typeof body !== "object") {
      throw new AuthorizationError("BAD_REQUEST")
    }

    const { subjectId, type, reason, duration, reportId } = body as Record<string, unknown>

    if (
      typeof subjectId !== "string" ||
      typeof type !== "string" ||
      typeof reason !== "string"
    ) {
      throw new AuthorizationError("BAD_REQUEST")
    }

    const validTypes = ["warning", "suspension", "ban", "restriction"]
    if (!validTypes.includes(type)) {
      throw new AuthorizationError("BAD_REQUEST")
    }

    const validDurations = ["24h", "7d", "30d", "permanent"]
    if (duration !== undefined && typeof duration === "string" && !validDurations.includes(duration)) {
      throw new AuthorizationError("BAD_REQUEST")
    }

    const mc = await createCase({
      subjectId,
      type: type as any,
      reason,
      moderatorId: actor.accountId,
      duration: typeof duration === "string" ? (duration as any) : undefined,
      reportId: typeof reportId === "string" ? reportId : undefined,
    })

    return safeNextResponse({ case: mc })
  } catch (error) {
    return handleAuthorizationError(error)
  }
}

/**
 * PATCH /api/moderation/cases
 * Revoke a moderation case. Moderator+ only.
 * Body: { id, action: "revoke" }
 */
export async function PATCH(request: NextRequest) {
  try {
    const actor = await requireActor()
    requireModeratorOrAbove(actor)

    const body = await request.json().catch(() => {
      throw new AuthorizationError("BAD_REQUEST")
    })

    if (!body || typeof body !== "object") {
      throw new AuthorizationError("BAD_REQUEST")
    }

    const { id, action } = body as Record<string, unknown>

    if (typeof id !== "string" || !isValidId(id)) {
      throw new AuthorizationError("BAD_REQUEST")
    }

    if (action === "revoke") {
      const mc = await revokeCase(id, actor.accountId)
      return safeNextResponse({ case: mc })
    }

    throw new AuthorizationError("BAD_REQUEST")
  } catch (error) {
    return handleAuthorizationError(error)
  }
}
