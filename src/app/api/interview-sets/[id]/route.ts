import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import {
  requireActor,
  isValidId,
  getRequiredProfileId,
  AuthorizationError,
  handleAuthorizationError,
} from "@/lib/authorization"

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireActor()
    const { id } = await params
    if (!isValidId(id)) {
      throw new AuthorizationError("BAD_REQUEST")
    }
    const profileId = getRequiredProfileId(actor)

    const set = await db.interviewSet.findFirst({
      where: { id, userProfileId: profileId },
      include: { questions: { orderBy: { order: "asc" } } },
    })
    if (!set) {
      throw new AuthorizationError("NOT_FOUND")
    }
    return NextResponse.json({ set })
  } catch (error) {
    return handleAuthorizationError(error)
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireActor()
    const { id } = await params
    if (!isValidId(id)) {
      throw new AuthorizationError("BAD_REQUEST")
    }
    const profileId = getRequiredProfileId(actor)

    // Atomic delete scoped to owner profile ID
    const result = await db.interviewSet.deleteMany({
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
