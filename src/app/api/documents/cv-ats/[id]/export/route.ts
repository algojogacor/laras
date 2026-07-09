import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSession } from "@/lib/auth"
import { serializeProfile, type ProfileWithRelations } from "@/lib/profile"
import { buildCVATSDocx } from "@/lib/docx-renderer"
import { packDocx } from "@/lib/docx-renderer"
import type { GeneratedCVATS } from "@/lib/content-engine"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const { id } = await params
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

  const doc = await db.document.findFirst({
    where: { id, userProfileId: profile.id, type: "cv-ats" },
  })
  if (!doc) return NextResponse.json({ error: "not-found" }, { status: 404 })

  const cv = JSON.parse(doc.content || "{}") as GeneratedCVATS
  const config = doc.config ? JSON.parse(doc.config) : { locale: "id" }
  const locale = (config.locale as "id" | "en") || "id"

  const docx = buildCVATSDocx(serializeProfile(profile), cv, locale)
  const buffer = await packDocx(docx)

  const safeName = (profile.fullName || "CV").replace(/[^a-z0-9]+/gi, "-").toLowerCase()
  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${safeName}-cv-ats.docx"`,
    },
  })
}
