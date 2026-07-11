import { db } from "@/lib/db"
import { listConnections, requestConnection, searchUsers } from "@/lib/connections"
import {
  requireActor,
  getRequiredProfileId,
  handleAuthorizationError,
  AuthorizationError,
  isValidId,
  safeNextResponse,
} from "@/lib/authorization"

/**
 * GET /api/connections
 * Returns the current user's connections grouped by status.
 * Optional ?q= for user search.
 */
export async function GET(request: Request) {
  try {
    const actor = await requireActor()
    const profileId = getRequiredProfileId(actor)

    const { searchParams } = new URL(request.url)
    const q = searchParams.get("q")

    if (q !== null) {
      const results = await searchUsers(actor.accountId, q)
      return safeNextResponse({ results })
    }

    const groups = await listConnections(profileId, actor.accountId)
    return safeNextResponse(groups)
  } catch (error) {
    return handleAuthorizationError(error)
  }
}

/**
 * POST /api/connections
 * Body: { addresseeId, message? }
 * Sends a connection request.
 */
export async function POST(request: Request) {
  try {
    const actor = await requireActor()
    const profileId = getRequiredProfileId(actor)

    let body: { addresseeId?: string; message?: string }
    try {
      body = await request.json()
    } catch {
      throw new AuthorizationError("BAD_REQUEST")
    }

    const addresseeId = body.addresseeId?.trim()
    if (!isValidId(addresseeId)) {
      throw new AuthorizationError("BAD_REQUEST")
    }

    if (addresseeId === profileId) {
      throw new AuthorizationError("BAD_REQUEST")
    }

    const target = await db.userProfile.findUnique({
      where: { id: addresseeId },
      select: { id: true },
    })
    if (!target) {
      throw new AuthorizationError("NOT_FOUND")
    }

    await requestConnection(profileId, addresseeId, body.message?.trim() || undefined)

    return safeNextResponse({ ok: true })
  } catch (error) {
    return handleAuthorizationError(error)
  }
}
