import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { serializeProfile, type ProfileWithRelations } from "@/lib/profile"
import {
  requireActor,
  getRequiredProfileId,
  handleAuthorizationError,
} from "@/lib/authorization"

export async function GET() {
  try {
    const actor = await requireActor()
    const profileId = getRequiredProfileId(actor)

    const profile = (await db.userProfile.findUnique({
      where: { id: profileId },
      include: {
        experiences: { orderBy: { order: "asc" } },
        educations: { orderBy: { order: "asc" } },
        skills: { orderBy: { order: "asc" } },
        certifications: { orderBy: { order: "asc" } },
        languages: { orderBy: { order: "asc" } },
      },
    })) as ProfileWithRelations | null

    if (!profile) {
      return NextResponse.json({ error: "no-profile" }, { status: 404 })
    }

    const data = {
      exportedAt: new Date().toISOString(),
      app: "Laras",
      profile: serializeProfile(profile),
    }

    return NextResponse.json(data, {
      headers: {
        "Content-Disposition": `attachment; filename="laras-profile-${Date.now()}.json"`,
        "Cache-Control": "private, no-store",
      },
    })
  } catch (error) {
    return handleAuthorizationError(error)
  }
}
