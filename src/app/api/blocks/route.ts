import { db } from "@/lib/db"
import { blockUser, unblockUser } from "@/lib/messaging"
import {
  requireActor,
  getRequiredProfileId,
  handleAuthorizationError,
  AuthorizationError,
  isValidId,
  safeNextResponse,
} from "@/lib/authorization"

/**
 * GET /api/blocks
 * Returns the current user's block list (users they have blocked).
 */
export async function GET() {
  try {
    const actor = await requireActor()
    const profileId = getRequiredProfileId(actor)

    const blocks = await db.block.findMany({
      where: { blockerId: profileId },
      include: {
        blocked: {
          select: {
            id: true,
            fullName: true,
            headline: true,
            photoUrl: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    const items = blocks.map((b) => ({
      id: b.id,
      blockedUser: {
        id: b.blocked.id,
        fullName: b.blocked.fullName,
        headline: b.blocked.headline,
        photoUrl: b.blocked.photoUrl,
      },
      reason: b.reason,
      createdAt: b.createdAt,
    }))

    return safeNextResponse({ blocks: items })
  } catch (error) {
    return handleAuthorizationError(error)
  }
}

/**
 * POST /api/blocks
 * Body: { blockedId: string, reason?: string }
 * Blocks a user and removes any existing connection.
 */
export async function POST(request: Request) {
  try {
    const actor = await requireActor()
    const profileId = getRequiredProfileId(actor)

    let body: { blockedId?: string; reason?: string }
    try {
      body = await request.json()
    } catch {
      throw new AuthorizationError("BAD_REQUEST")
    }

    const blockedId = body.blockedId?.trim()
    if (!isValidId(blockedId)) {
      throw new AuthorizationError("BAD_REQUEST")
    }

    if (blockedId === profileId) {
      throw new AuthorizationError("BAD_REQUEST")
    }

    await blockUser(profileId, blockedId, body.reason?.trim() || undefined)
    return safeNextResponse({ ok: true })
  } catch (error) {
    return handleAuthorizationError(error)
  }
}

/**
 * DELETE /api/blocks
 * Body: { blockedId: string }
 * Unblocks a previously blocked user.
 */
export async function DELETE(request: Request) {
  try {
    const actor = await requireActor()
    const profileId = getRequiredProfileId(actor)

    let body: { blockedId?: string }
    try {
      body = await request.json()
    } catch {
      throw new AuthorizationError("BAD_REQUEST")
    }

    const blockedId = body.blockedId?.trim()
    if (!isValidId(blockedId)) {
      throw new AuthorizationError("BAD_REQUEST")
    }

    await unblockUser(profileId, blockedId)
    return safeNextResponse({ ok: true })
  } catch (error) {
    return handleAuthorizationError(error)
  }
}
