import {
  requireActor,
  getRequiredProfileId,
  handleAuthorizationError,
  safeNextResponse,
  isValidId,
  AuthorizationError,
} from "@/lib/authorization"
import { analyzeMatch, getExistingMatch } from "@/lib/opportunity-match"
import type { NextRequest } from "next/server"

/**
 * POST /api/opportunities/[id]/match
 * Trigger match analysis for the given opportunity.
 * Owner-scoped: only the opportunity owner can analyze.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireActor()
    const profileId = getRequiredProfileId(actor)
    const { id } = await params

    if (!isValidId(id)) {
      throw new AuthorizationError("BAD_REQUEST")
    }

    const result = await analyzeMatch(id, profileId)

    return safeNextResponse({ match: result })
  } catch (error) {
    if (error instanceof Error && error.message === "Opportunity not found") {
      return handleAuthorizationError(new AuthorizationError("NOT_FOUND"))
    }
    if (error instanceof Error && error.message === "Profile not found") {
      return handleAuthorizationError(new AuthorizationError("NOT_FOUND"))
    }
    return handleAuthorizationError(error)
  }
}

/**
 * GET /api/opportunities/[id]/match
 * Returns existing match detail if already computed.
 * Owner-scoped: only the opportunity owner can view.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireActor()
    const profileId = getRequiredProfileId(actor)
    const { id } = await params

    if (!isValidId(id)) {
      throw new AuthorizationError("BAD_REQUEST")
    }

    const match = await getExistingMatch(id, profileId)

    if (!match) {
      return safeNextResponse({ match: null, message: "No match computed yet" })
    }

    return safeNextResponse({ match })
  } catch (error) {
    return handleAuthorizationError(error)
  }
}
