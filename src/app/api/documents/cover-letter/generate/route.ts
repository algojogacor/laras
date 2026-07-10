import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSession } from "@/lib/auth"
import { applyRateLimit } from "@/lib/rate-limit"
import { serializeProfile, type ProfileWithRelations } from "@/lib/profile"
import { generateCoverLetter, textConcretenessCheck } from "@/lib/content-engine"

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  // Rate limit: 20 generations per minute per user (LLM cost-abuse protection)
  const limited = applyRateLimit(request, "generate", `user:${session.userId}:cover-letter`)
  if (limited) return limited

  let body: { locale?: string; tone?: string; region?: string; position?: string; organization?: string; edits?: any }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "invalid-body" }, { status: 400 })
  }

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

  const locale = (body.locale as "id" | "en") || (profile.docLocale as "id" | "en") || "id"
  const tone = body.tone || profile.preferredTone || "warm"
  const region = body.region || profile.targetRegion || "domestic"

  let serialized = serializeProfile(profile)
  if (body.edits) serialized = { ...serialized, ...body.edits }

  let cl
  try {
    cl = await generateCoverLetter(serialized, {
      locale, tone, region,
      position: body.position, organization: body.organization,
    })
  } catch (e) {
    console.error("[cover-letter/generate] LLM failed:", (e as Error).message)
    return NextResponse.json({ error: "generation-failed" }, { status: 502 })
  }

  // concreteness check across all paragraphs
  const allText = cl.paragraphs.join(" ")
  const check = textConcretenessCheck(allText, locale)

  const title = body.position
    ? `Cover Letter — ${body.position}${body.organization ? ` @ ${body.organization}` : ""}`
    : `Cover Letter — ${serialized.fullName || ""}`

  const doc = await db.document.create({
    data: {
      userProfileId: profile.id,
      type: "cover-letter",
      title,
      content: JSON.stringify({ ...cl, position: body.position, organization: body.organization }),
      config: JSON.stringify({ locale, tone, region, concreteness: check.hasEvidence ? 100 : 0 }),
      version: 1,
    },
  })

  return NextResponse.json({ ok: true, documentId: doc.id, cl, check, config: { locale, tone, region } })
}
