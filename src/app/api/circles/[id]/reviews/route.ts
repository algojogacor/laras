import {
  requireActor,
  getRequiredProfileId,
  handleAuthorizationError,
  AuthorizationError,
  isValidId,
  safeNextResponse,
} from "@/lib/authorization"
import {
  requestReview,
  submitReview,
  getCircleReviews,
} from "@/lib/peer-review"

/**
 * GET /api/circles/[id]/reviews
 * List peer reviews for a circle.
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

    const reviews = await getCircleReviews(id, profileId)
    return safeNextResponse({ reviews })
  } catch (error) {
    return handleAuthorizationError(error)
  }
}

/**
 * POST /api/circles/[id]/reviews
 * Request a peer review within the circle.
 * Body: { prompt }
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

    let body: { prompt?: string }
    try {
      body = await request.json()
    } catch {
      throw new AuthorizationError("BAD_REQUEST")
    }

    if (!body.prompt?.trim()) {
      throw new AuthorizationError("BAD_REQUEST")
    }

    const result = await requestReview(profileId, id, body.prompt)
    return safeNextResponse(result, { status: 201 })
  } catch (error) {
    return handleAuthorizationError(error)
  }
}

/**
 * PUT /api/circles/[id]/reviews
 * Submit a peer review.
 * Body: { reviewId, feedback, rating: { clarity, specificity, actionability } }
 */
export async function PUT(
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

    let body: {
      reviewId?: string
      feedback?: string
      rating?: { clarity?: number; specificity?: number; actionability?: number }
    }
    try {
      body = await request.json()
    } catch {
      throw new AuthorizationError("BAD_REQUEST")
    }

    if (!body.reviewId || !body.feedback?.trim() || !body.rating) {
      throw new AuthorizationError("BAD_REQUEST")
    }

    await submitReview(profileId, body.reviewId, body.feedback, body.rating as any)
    return safeNextResponse({ ok: true })
  } catch (error) {
    return handleAuthorizationError(error)
  }
}
