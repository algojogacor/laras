import {
  requireActor,
  getRequiredProfileId,
  handleAuthorizationError,
  AuthorizationError,
  safeNextResponse,
} from "@/lib/authorization"
import { applyRateLimit } from "@/lib/rate-limit"
import {
  createCircle,
  getCircles,
} from "@/lib/circles"

/**
 * GET /api/circles
 * List/discover circles. Supports ?type= and ?search= query params.
 */
export async function GET(request: Request) {
  try {
    const actor = await requireActor()
    getRequiredProfileId(actor)

    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type") || undefined
    const search = searchParams.get("search") || undefined

    const circles = await getCircles(type, search)
    return safeNextResponse({ circles })
  } catch (error) {
    return handleAuthorizationError(error)
  }
}

/**
 * POST /api/circles
 * Create a new circle.
 * Body: { name, description?, type }
 */
export async function POST(request: Request) {
  try {
    const actor = await requireActor()
    const profileId = getRequiredProfileId(actor)

    // Rate limit by user
    const rateLimitKey = `user:${actor.accountId}`
    const limited = applyRateLimit(request, "circles", rateLimitKey)
    if (limited) return limited

    let body: { name?: string; description?: string; type?: string }
    try {
      body = await request.json()
    } catch {
      throw new AuthorizationError("BAD_REQUEST")
    }

    if (!body.name?.trim()) {
      throw new AuthorizationError("BAD_REQUEST")
    }

    const result = await createCircle(
      profileId,
      body.name,
      body.description,
      body.type || "community"
    )

    return safeNextResponse(result, { status: 201 })
  } catch (error) {
    return handleAuthorizationError(error)
  }
}
