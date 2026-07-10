import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSession } from "@/lib/auth"
import { applyRateLimit } from "@/lib/rate-limit"
import { serializeProfile, computeCompletion, type ProfileWithRelations } from "@/lib/profile"
import { generateCVATS, concretenessCheck, type GeneratedCVATS } from "@/lib/content-engine"
import { buildCVATSDocx } from "@/lib/docx-renderer"

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  // Rate limit: 20 generations per minute per user (LLM cost-abuse protection)
  const limited = applyRateLimit(request, "generate", `user:${session.userId}:cv-ats`)
  if (limited) return limited

  let body: { locale?: string; tone?: string; region?: string; title?: string; edits?: any; generationConfig?: Record<string, unknown> }
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

  // Serialize, then optionally apply inline edits from the edit-before-generate screen
  let serialized = serializeProfile(profile)
  if (body.edits) {
    serialized = { ...serialized, ...body.edits }
  }

  let cv: GeneratedCVATS
  try {
    cv = await generateCVATS(serialized, { locale, tone, region })
  } catch (e) {
    console.error("[cv-ats/generate] LLM failed:", (e as Error).message)
    return NextResponse.json(
      { error: "generation-failed" },
      { status: 502 }
    )
  }

  const check = concretenessCheck(cv, locale)

  // Persist the document
  const configSnapshot = JSON.stringify({ locale, tone, region, concreteness: check.score, ...(body.generationConfig || {}) })
  const doc = await db.document.create({
    data: {
      userProfileId: profile.id,
      type: "cv-ats",
      title: body.title || `${serialized.fullName || "CV"} — ATS`,
      content: JSON.stringify(cv),
      config: configSnapshot,
      version: 1,
    },
  })

  // Save initial version (Brief Task 2 — version history)
  await db.documentVersion.create({
    data: {
      documentId: doc.id,
      versionNumber: 1,
      content: JSON.stringify(cv),
      configSnapshot,
      revisionInstruction: null, // initial generation
    },
  })

  return NextResponse.json({
    ok: true,
    documentId: doc.id,
    cv,
    check,
    config: { locale, tone, region },
  })
}
