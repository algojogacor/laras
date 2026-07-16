import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { applyRateLimit } from "@/lib/rate-limit"
import {
  requireActor,
  handleAuthorizationError,
  AuthorizationError,
  safeNextResponse,
  requireModeratorOrAbove,
  isValidId,
} from "@/lib/authorization"
import { verifyAppealToken } from "@/lib/appeal-token"
import { fileAppeal, getAppeals, reviewAppeal } from "@/lib/moderation"

/**
 * GET /api/appeals
 * List appeals. Moderator+ can see all; users can only see their own.
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
    if (appellantId) {
      if (appellantId !== actor.accountId) {
        requireModeratorOrAbove(actor)
      }
    } else {
      // Unfiltered queries require moderator+ (prevents information disclosure)
      requireModeratorOrAbove(actor)
    }

    // Non-moderators can only query their own appeals
    const resolvedAppellantId = appellantId || actor.accountId

    const result = await getAppeals({
      appellantId: resolvedAppellantId,
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
 * File an appeal. Any authenticated user, OR a suspended user with a valid
 * appeal token in the Authorization header (Bearer <appeal_token>).
 * Body: { caseId, reason }
 */
export async function POST(request: NextRequest) {
  try {
    // Try standard session authentication first.
    // Suspended users will fail requireActor() because getSession() returns
    // null for suspended accounts. For them, fall back to appeal token auth.
    let accountId: string
    let resolvedCaseId: string | undefined

    try {
      const actor = await requireActor()
      accountId = actor.accountId
    } catch (sessionError) {
      // Only fall through to appeal token if the error is UNAUTHORIZED
      if (
        !(sessionError instanceof AuthorizationError) ||
        sessionError.code !== "UNAUTHORIZED"
      ) {
        throw sessionError
      }

      // Attempt appeal token verification for suspended users
      const authHeader = request.headers.get("authorization")
      if (!authHeader?.startsWith("Bearer ")) {
        throw sessionError
      }

      const token = authHeader.slice(7)
      const appealPayload = await verifyAppealToken(token)
      if (!appealPayload) {
        throw new AuthorizationError("UNAUTHORIZED")
      }

      accountId = appealPayload.sub
      resolvedCaseId = appealPayload.caseId
    }

    // Rate limit by user
    const rateLimitKey = `user:${accountId}`
    const limited = applyRateLimit(request, "appeals", rateLimitKey)
    if (limited) return limited

    const body = await request.json().catch(() => {
      throw new AuthorizationError("BAD_REQUEST")
    })

    if (!body || typeof body !== "object") {
      throw new AuthorizationError("BAD_REQUEST")
    }

    const { caseId, reason } = body as Record<string, unknown>

    if (typeof caseId !== "string" || !isValidId(caseId) || typeof reason !== "string" || !reason.trim()) {
      throw new AuthorizationError("BAD_REQUEST")
    }

    // If authenticated via appeal token, enforce it is only for the specified case
    if (resolvedCaseId && caseId !== resolvedCaseId) {
      throw new AuthorizationError("FORBIDDEN")
    }

    // Verify the case belongs to the appellant (ownership check)
    const caseRecord = await db.moderationCase.findUnique({
      where: { id: caseId },
      select: { subjectId: true },
    })
    if (!caseRecord || caseRecord.subjectId !== accountId) {
      throw new AuthorizationError("NOT_FOUND")
    }

    const appeal = await fileAppeal(caseId, accountId, reason.trim())

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
