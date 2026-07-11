import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import {
  requireActor,
  isValidId,
  getRequiredProfileId,
  AuthorizationError,
  handleAuthorizationError,
} from "@/lib/authorization"

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireActor()
    const { id } = await params
    if (!isValidId(id)) {
      throw new AuthorizationError("BAD_REQUEST")
    }
    const profileId = getRequiredProfileId(actor)

    let body: any
    try {
      body = await request.json()
    } catch {
      throw new AuthorizationError("BAD_REQUEST")
    }

    const data: any = {}
    for (const k of [
      "type",
      "position",
      "organization",
      "status",
      "deadline",
      "location",
      "url",
      "jobDescription",
      "summary",
      "notes",
      "order",
    ]) {
      if (k in body) data[k] = body[k]
    }

    // Atomic update scoped to owner profile ID
    const result = await db.application.updateMany({
      where: { id, userProfileId: profileId },
      data,
    })

    if (result.count !== 1) {
      throw new AuthorizationError("NOT_FOUND")
    }

    const updated = await db.application.findUnique({
      where: { id },
    })

    return NextResponse.json({ ok: true, application: updated })
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
    const result = await db.application.deleteMany({
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

