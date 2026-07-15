import { NextRequest } from "next/server"
import {
  requireActor,
  handleAuthorizationError,
  AuthorizationError,
  safeNextResponse,
  requireModeratorOrAbove,
  isValidId,
} from "@/lib/authorization"
import { fileAppeal, getAppeals, reviewAppeal } from "@/lib/moderation"

/**
 * GET /api/appeals
 * List appeals. Moderator+ or own appeals for users.
 * Query: ?appellantId=...&status=...&cursor=...&limit=...
 */
export async function GET(request: NextRequest) {
  try {
    const actor = await requireActor()

    const { searchParams } = new URL(request.url)
    const appellantId = searchParams.get("appellantId") || undefined
    const status = searchParams.get("status") || undefined
    const cursor = searchParams.get("cursor") || undefined
    const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10) || 20, 50)

    // Users can only see their own appeals; moderators+ can see all
    if (appellantId && appellantId !== actor.accountId) {
      requireModeratorOrAbove(actor)
    }

    const result = await getAppeals({
      appellantId,
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
 * POST /api/appeals
 * File an appeal. Any authenticated user.
 * Body: { caseId, reason }
 */
export async function POST(request: NextRequest) {
  try {
    const actor = await requireActor()

    const body = await request.json().catch(() => {
      throw new AuthorizationError("BAD_REQUEST")
    })

    if (!body || typeof body !== "object") {
      throw new AuthorizationError("BAD_REQUEST")
    }

    const { caseId, reason } = body as Record<string, unknown>

    if (typeof caseId !== "string" || typeof reason !== "string" || !reason.trim()) {
      throw new AuthorizationError("BAD_REQUEST")
    }

    const appeal = await fileAppeal(caseId, actor.accountId, reason.trim())

    return safeNextResponse({ appeal })
  } catch (error) {
    return handleAuthorizationError(error)
  }
}

/**
 * PATCH /api/appeals
 * Review an appeal. Moderator+ only.
 * Body: { id, status: "granted" | "denied", note? }
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

    const { id, status, note } = body as Record<string, unknown>

    if (typeof id !== "string" || !isValidId(id)) {
      throw new AuthorizationError("BAD_REQUEST")
    }

    if (status !== "granted" && status !== "denied") {
      throw new AuthorizationError("BAD_REQUEST")
    }

    const appeal = await reviewAppeal(id, actor.accountId, status, typeof note === "string" ? note : undefined)

    return safeNextResponse({ appeal })
  } catch (error) {
    return handleAuthorizationError(error)
  }
}
