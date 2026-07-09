import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSession } from "@/lib/auth"
import { serializeProfile, type ProfileWithRelations } from "@/lib/profile"

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const profile = (await db.userProfile.findUnique({
    where: { accountId: session.userId },
    include: {
      experiences: { orderBy: { order: "asc" } },
      educations: { orderBy: { order: "asc" } },
      skills: { orderBy: { order: "asc" } },
      certifications: { orderBy: { order: "asc" } },
      languages: { orderBy: { order: "asc" } },
    },
  })) as ProfileWithRelations | null

  if (!profile) return NextResponse.json({ error: "no-profile" }, { status: 404 })

  const data = {
    exportedAt: new Date().toISOString(),
    app: "Laras",
    profile: serializeProfile(profile),
  }

  return NextResponse.json(data, {
    headers: {
      "Content-Disposition": `attachment; filename="laras-profile-${Date.now()}.json"`,
    },
  })
}
