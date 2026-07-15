import {
  requireActor,
  getRequiredProfileId,
  handleAuthorizationError,
  AuthorizationError,
  safeNextResponse,
} from "@/lib/authorization"
import {
  getMentorshipProfile,
  upsertMentorshipProfile,
} from "@/lib/mentorship"

/**
 * GET /api/mentorship/profile
 * Get the current user's mentorship profile.
 */
export async function GET(request: Request) {
  try {
    const actor = await requireActor()
    const profileId = getRequiredProfileId(actor)

    const profile = await getMentorshipProfile(profileId)
    return safeNextResponse({ profile })
  } catch (error) {
    return handleAuthorizationError(error)
  }
}

/**
 * PUT /api/mentorship/profile
 * Create or update the current user's mentorship profile.
 * Body: { isMentor?, isMentee?, mentorTopics?, menteeGoals?, bio?, availability? }
 */
export async function PUT(request: Request) {
  try {
    const actor = await requireActor()
    const profileId = getRequiredProfileId(actor)

    let body: {
      isMentor?: boolean
      isMentee?: boolean
      mentorTopics?: string[]
      menteeGoals?: { goal: string; timeline?: string }[]
      bio?: string
      availability?: string
    }
    try {
      body = await request.json()
    } catch {
      throw new AuthorizationError("BAD_REQUEST")
    }

    const profile = await upsertMentorshipProfile(profileId, body)
    return safeNextResponse({ profile })
  } catch (error) {
    return handleAuthorizationError(error)
  }
}
