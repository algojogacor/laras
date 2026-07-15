import { NextRequest } from "next/server"
import {
  requireActor,
  getRequiredProfileId,
  handleAuthorizationError,
  AuthorizationError,
  safeNextResponse,
  requireModeratorOrAbove,
  isValidId,
} from "@/lib/authorization"
import {
  createReport,
  getReportQueue,
  assignReport,
  resolveReport,
} from "@/lib/moderation"

/**
 * GET /api/reports
 * List reports. Moderator+ only.
 */
export async function GET(request: NextRequest) {
  try {
    const actor = await requireActor()
    requireModeratorOrAbove(actor)

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status") || undefined
    const priority = searchParams.get("priority") || undefined
    const cursor = searchParams.get("cursor") || undefined
    const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10) || 20, 50)

    const result = await getReportQueue({
      status: status as any,
      priority: priority as any,
      limit,
      cursor,
    })

    return safeNextResponse(result)
  } catch (error) {
    return handleAuthorizationError(error)
  }
}

/**
 * POST /api/reports
 * Create a new report. Any authenticated user can report.
 * Body: { targetType, targetId, reason, description?, evidence? }
 */
export async function POST(request: NextRequest) {
  try {
    const actor = await requireActor()
    const profileId = getRequiredProfileId(actor)

    const body = await request.json().catch(() => {
      throw new AuthorizationError("BAD_REQUEST")
    })

    if (!body || typeof body !== "object") {
      throw new AuthorizationError("BAD_REQUEST")
    }

    const { targetType, targetId, reason, description, evidence } = body as Record<string, unknown>

    if (
      typeof targetType !== "string" ||
      typeof targetId !== "string" ||
      typeof reason !== "string"
    ) {
      throw new AuthorizationError("BAD_REQUEST")
    }

    const validReasons = ["harassment", "spam", "impersonation", "inappropriate", "other"]
    if (!validReasons.includes(reason)) {
      throw new AuthorizationError("BAD_REQUEST")
    }

    const validTargets = ["user", "connection", "message", "circle", "mentorship", "content"]
    if (!validTargets.includes(targetType)) {
      throw new AuthorizationError("BAD_REQUEST")
    }

    const report = await createReport({
      reporterId: profileId,
      targetType: targetType as any,
      targetId,
      reason: reason as any,
      description: typeof description === "string" ? description : undefined,
      evidence: typeof evidence === "string" ? evidence : undefined,
    })

    return safeNextResponse({ report })
  } catch (error) {
    return handleAuthorizationError(error)
  }
}

/**
 * PATCH /api/reports
 * Assign or resolve a report. Moderator+ only.
 * Body: { id, action: "assign" | "resolve", resolution?, status? }
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

    const { id, action, resolution, status } = body as Record<string, unknown>

    if (typeof id !== "string" || !isValidId(id)) {
      throw new AuthorizationError("BAD_REQUEST")
    }

    if (action === "assign") {
      const report = await assignReport(id, actor.accountId)
      return safeNextResponse({ report })
    }

    if (action === "resolve") {
      if (
        typeof resolution !== "string" ||
        (status !== "resolved" && status !== "dismissed")
      ) {
        throw new AuthorizationError("BAD_REQUEST")
      }
      const report = await resolveReport(id, resolution, status)
      return safeNextResponse({ report })
    }

    throw new AuthorizationError("BAD_REQUEST")
  } catch (error) {
    return handleAuthorizationError(error)
  }
}
