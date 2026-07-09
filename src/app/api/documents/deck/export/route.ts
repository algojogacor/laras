import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSession } from "@/lib/auth"
import { serializeProfile, type ProfileWithRelations } from "@/lib/profile"
import { buildDeck } from "@/lib/deck-renderer"

export async function GET(request: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const themeId = searchParams.get("theme") || "forest"

  const profile = (await db.userProfile.findUnique({
    where: { accountId: session.userId },
    include: { experiences: { orderBy: { order: "asc" } }, educations: { orderBy: { order: "asc" } }, skills: { orderBy: { order: "asc" } }, certifications: { orderBy: { order: "asc" } }, languages: { orderBy: { order: "asc" } } },
  })) as ProfileWithRelations | null
  if (!profile) return NextResponse.json({ error: "no-profile" }, { status: 404 })

  const buffer = await buildDeck(serializeProfile(profile), themeId)
  const safeName = (profile.fullName || "deck").replace(/[^a-z0-9]+/gi, "-").toLowerCase()
  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "Content-Disposition": `attachment; filename="${safeName}-personal-deck.pptx"`,
    },
  })
}
