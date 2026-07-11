import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import {
  requireActor,
  isValidId,
  getRequiredProfileId,
  AuthorizationError,
  handleAuthorizationError,
} from "@/lib/authorization"

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await requireActor()
    const { id } = await params
    if (!isValidId(id)) {
      throw new AuthorizationError("BAD_REQUEST")
    }
    const profileId = getRequiredProfileId(actor)

    // Atomic delete scoped to owner profile ID
    const result = await db.document.deleteMany({
      where: { id, userProfileId: profileId },
    })

    if (result.count !== 1) {
      throw new AuthorizationError("NOT_FOUND")
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    return handleAuthorizationError(error)
  }
}
