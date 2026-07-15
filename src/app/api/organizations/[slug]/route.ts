import "server-only"
import { requireActor, getRequiredProfileId, handleAuthorizationError, safeNextResponse, AuthorizationError, isValidId } from "@/lib/authorization"
import { getOrganization, updateOrganization, requestVerification, getMemberRole } from "@/lib/organizations"
import type { NextRequest } from "next/server"

/** GET /api/organizations/[slug] — get organization detail */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const actor = await requireActor()

    const org = await getOrganization(slug)
    if (!org) throw new AuthorizationError("NOT_FOUND")

    // Check if the actor is a member (for private fields like membership role)
    let role: string | null = null
    if (actor.profileId) {
      role = await getMemberRole(org.id, actor.profileId)
    }

    return safeNextResponse({
      organization: {
        ...org,
        memberCount: org._count?.memberships ?? 0,
        _count: undefined,
        role,
      },
    })
  } catch (error) {
    return handleAuthorizationError(error)
  }
}

/** PATCH /api/organizations/[slug] — update organization */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const actor = await requireActor()

    const org = await getOrganization(slug)
    if (!org) throw new AuthorizationError("NOT_FOUND")

    const body = await request.json().catch(() => {
      throw new AuthorizationError("BAD_REQUEST")
    })
    if (!body || typeof body !== "object") {
      throw new AuthorizationError("BAD_REQUEST")
    }

    const { name, description, website, logoUrl, type } = body as Record<string, unknown>

    const updated = await updateOrganization(org.id, {
      name: typeof name === "string" ? name : undefined,
      description: typeof description === "string" ? description : undefined,
      website: typeof website === "string" ? website : undefined,
      logoUrl: typeof logoUrl === "string" ? logoUrl : undefined,
      type: typeof type === "string" ? type as any : undefined,
    }, actor)

    return safeNextResponse({ organization: updated })
  } catch (error) {
    return handleAuthorizationError(error)
  }
}
