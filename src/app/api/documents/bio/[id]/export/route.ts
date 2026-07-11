import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { serializeProfile, type ProfileWithRelations } from "@/lib/profile"
import { buildTextDocx, packDocx } from "@/lib/text-docx"
import type { GeneratedBio } from "@/lib/content-engine"
import {
  requireActor,
  getRequiredProfileId,
  findOwnedDocumentOfType,
  handleAuthorizationError,
} from "@/lib/authorization"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await requireActor()
    const profileId = getRequiredProfileId(actor)
    const { id } = await params

    const doc = await findOwnedDocumentOfType(id, "bio", actor)

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

    const bio = JSON.parse(doc.content || "{}") as GeneratedBio
    const paragraphs = [bio.headline, "", bio.about, "", ...bio.personal].filter(Boolean)

    const docx = buildTextDocx(serializeProfile(profile), { title: doc.title, paragraphs })
    const buffer = await packDocx(docx)
    const safeName = (profile.fullName || "bio").replace(/[^a-z0-9]+/gi, "-").toLowerCase()

    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${safeName}-bio.docx"`,
        "Cache-Control": "private, no-store",
      },
    })
  } catch (error) {
    return handleAuthorizationError(error)
  }
}
