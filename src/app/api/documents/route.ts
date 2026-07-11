import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireActor, handleAuthorizationError } from "@/lib/authorization"

export async function GET() {
  try {
    const actor = await requireActor()
    if (!actor.profileId) {
      return NextResponse.json({ documents: [] })
    }

    const documents = await db.document.findMany({
      where: { userProfileId: actor.profileId },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        type: true,
        title: true,
        version: true,
        createdAt: true,
        updatedAt: true,
        config: true,
      },
    })

    return NextResponse.json({
      documents: documents.map((d) => ({
        ...d,
        config: d.config ? JSON.parse(d.config) : {},
      })),
    })
  } catch (error) {
    return handleAuthorizationError(error)
  }
}
