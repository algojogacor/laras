import "server-only"
import { requireActor, handleAuthorizationError, safeNextResponse, AuthorizationError } from "@/lib/authorization"
import { getOrganization, changeMemberRole } from "@/lib/organizations"
import type { NextRequest } from "next/server"

/** PATCH /api/organizations/[slug]/members/[id] — change member role */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  try {
    const { slug, id } = await params
    const actor = await requireActor()

    const org = await getOrganization(slug)
    if (!org) throw new AuthorizationError("NOT_FOUND")

    const body = await request.json().catch(() => {
      throw new AuthorizationError("BAD_REQUEST")
    })
    if (!body || typeof body !== "object") {
      throw new AuthorizationError("BAD_REQUEST")
    }

    const { role } = body as Record<string, unknown>
    if (typeof role !== "string" || !["owner", "admin", "member"].includes(role)) {
      throw new AuthorizationError("BAD_REQUEST")
    }

    const updated = await changeMemberRole(org.id, id, role as "owner" | "admin" | "member", actor)
    return safeNextResponse({ member: updated })
  } catch (error) {
    return handleAuthorizationError(error)
  }
}
