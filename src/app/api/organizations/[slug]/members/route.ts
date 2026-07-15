import "server-only"
import { requireActor, getRequiredProfileId, handleAuthorizationError, safeNextResponse, AuthorizationError } from "@/lib/authorization"
import { getOrganization, getMembers, addMember, removeMember } from "@/lib/organizations"
import type { NextRequest } from "next/server"

/** GET /api/organizations/[slug]/members — list members */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const actor = await requireActor()

    const org = await getOrganization(slug)
    if (!org) throw new AuthorizationError("NOT_FOUND")

    const members = await getMembers(org.id, actor)
    return safeNextResponse({ members })
  } catch (error) {
    return handleAuthorizationError(error)
  }
}

/** POST /api/organizations/[slug]/members — add a member */
export async function POST(
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

    const { userProfileId, role } = body as Record<string, unknown>

    if (typeof userProfileId !== "string") {
      throw new AuthorizationError("BAD_REQUEST")
    }

    const newRole = typeof role === "string" && ["owner", "admin", "member"].includes(role)
      ? role as "owner" | "admin" | "member"
      : "member"

    const member = await addMember(org.id, userProfileId, newRole, actor)
    return safeNextResponse({ member }, { status: 201 })
  } catch (error) {
    return handleAuthorizationError(error)
  }
}

/** DELETE /api/organizations/[slug]/members — remove a member (query param: userId) */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const actor = await requireActor()

    const org = await getOrganization(slug)
    if (!org) throw new AuthorizationError("NOT_FOUND")

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")
    if (!userId) throw new AuthorizationError("BAD_REQUEST")

    const result = await removeMember(org.id, userId, actor)
    return safeNextResponse(result)
  } catch (error) {
    return handleAuthorizationError(error)
  }
}
