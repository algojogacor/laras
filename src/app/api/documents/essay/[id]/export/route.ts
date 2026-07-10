import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSession } from "@/lib/auth"
import { serializeProfile, type ProfileWithRelations } from "@/lib/profile"
import { buildTextDocx, packDocx } from "@/lib/text-docx"
import type { GeneratedEssay } from "@/lib/content-engine"

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  const { id } = await params

  const profile = (await db.userProfile.findUnique({
    where: { accountId: session.userId },
    include: { experiences: { orderBy: { order: "asc" } }, educations: { orderBy: { order: "asc" } }, skills: { orderBy: { order: "asc" } }, certifications: { orderBy: { order: "asc" } }, languages: { orderBy: { order: "asc" } } },
  })) as ProfileWithRelations | null
  if (!profile) return NextResponse.json({ error: "no-profile" }, { status: 404 })

  const doc = await db.document.findFirst({ where: { id, userProfileId: profile.id, type: "essay" } })
  if (!doc) return NextResponse.json({ error: "not-found" }, { status: 404 })

  const essay = JSON.parse(doc.content || "{}") as GeneratedEssay
  const docx = buildTextDocx(serializeProfile(profile), { title: doc.title, paragraphs: [essay.title, "", ...essay.paragraphs] })
  const buffer = await packDocx(docx)
  const safeName = (profile.fullName || "essay").replace(/[^a-z0-9]+/gi, "-").toLowerCase()
  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${safeName}-essay.docx"`,
    },
  })
}
