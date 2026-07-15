import "server-only"
import { requireActor, getRequiredProfileId, handleAuthorizationError, safeNextResponse, AuthorizationError } from "@/lib/authorization"
import { createOrganization, getUserOrganizations, isValidSlug, ORGANIZATION_TYPES } from "@/lib/organizations"
import type { NextRequest } from "next/server"

/** GET /api/organizations — list organizations for the current user */
export async function GET(_request: NextRequest) {
  try {
    const actor = await requireActor()
    const profileId = getRequiredProfileId(actor)

    const orgs = await getUserOrganizations(profileId)
    return safeNextResponse({ organizations: orgs })
  } catch (error) {
    return handleAuthorizationError(error)
  }
}

/** POST /api/organizations — create a new organization */
export async function POST(request: NextRequest) {
  try {
    const actor = await requireActor()

    const body = await request.json().catch(() => {
      throw new AuthorizationError("BAD_REQUEST")
    })
    if (!body || typeof body !== "object") {
      throw new AuthorizationError("BAD_REQUEST")
    }

    const { name, slug, type, description, website, logoUrl } = body as Record<string, unknown>

    if (typeof name !== "string" || name.trim().length === 0 || name.length > 200) {
      throw new AuthorizationError("BAD_REQUEST")
    }
    if (typeof slug !== "string" || !isValidSlug(slug)) {
      throw new AuthorizationError("BAD_REQUEST")
    }
    if (typeof type !== "string" || !ORGANIZATION_TYPES.includes(type as any)) {
      throw new AuthorizationError("BAD_REQUEST")
    }

    const org = await createOrganization(actor, {
      name: name.trim(),
      slug,
      type: type as any,
      description: typeof description === "string" ? description : undefined,
      website: typeof website === "string" ? website : undefined,
      logoUrl: typeof logoUrl === "string" ? logoUrl : undefined,
    })

    return safeNextResponse({ organization: org }, { status: 201 })
  } catch (error) {
    return handleAuthorizationError(error)
  }
}
