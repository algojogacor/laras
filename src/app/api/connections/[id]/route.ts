import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import {
  requireActor,
  isValidId,
  getRequiredProfileId,
  AuthorizationError,
  handleAuthorizationError,
  safeNextResponse
} from "@/lib/authorization"
import { acceptConnection, declineConnection } from "@/lib/connections"

/**
 * PATCH /api/connections/[id]
 * Body: { action: "accept" | "decline" }
 * Accepts or declines a pending connection request (addressee only).
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await requireActor()
    const { id } = await params
    if (!isValidId(id)) {
      throw new AuthorizationError("BAD_REQUEST")
    }
    const profileId = getRequiredProfileId(actor)

    let body: { action?: string }
    try {
      body = await request.json()
    } catch {
      throw new AuthorizationError("BAD_REQUEST")
    }

    let result: { ok: boolean; error?: string }
    if (body.action === "accept") {
      result = await acceptConnection(id, profileId)
    } else if (body.action === "decline") {
      result = await declineConnection(id, profileId)
    } else {
      throw new AuthorizationError("BAD_REQUEST")
    }

    if (!result.ok) {
      if (result.error === "not-found") {
        throw new AuthorizationError("NOT_FOUND")
      }
      if (result.error === "conflict") {
        throw new AuthorizationError("CONFLICT")
      }
      throw new AuthorizationError("BAD_REQUEST")
    }

    // Audit log
    await db.auditLog.create({
      data: {
        userProfileId: profileId,
        action: `connection.${body.action}`,
        resourceType: "Connection",
        resourceId: id,
        metadata: JSON.stringify({ by: actor.email }),
      },
    })

    return safeNextResponse({ ok: true })
  } catch (error) {
    return handleAuthorizationError(error)
  }
}
