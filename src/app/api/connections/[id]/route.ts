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
import { startConversation } from "@/lib/messaging"

/**
 * PATCH /api/connections/[id]
 * Body: { action: "accept" | "decline" }
 * Accepts or declines a pending connection request (addressee only).
 * On acceptance, auto-creates a conversation between the two users.
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

    // On acceptance, auto-create a conversation between the two users
    if (body.action === "accept") {
      const connection = await db.connection.findUnique({
        where: { id },
        select: { requesterId: true, addresseeId: true },
      })
      if (connection) {
        try {
          await startConversation(
            profileId,
            [connection.requesterId === profileId ? connection.addresseeId : connection.requesterId],
            "Halo! Sekarang kita terhubung. Silakan kirim pesan."
          )
        } catch {
          // Non-critical: conversation creation failure shouldn't block the connection accept
          console.error("[connections] Failed to auto-create conversation for", id)
        }
      }
    }

    return safeNextResponse({ ok: true })
  } catch (error) {
    return handleAuthorizationError(error)
  }
}
