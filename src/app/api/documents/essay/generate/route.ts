import crypto from "crypto"
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSession } from "@/lib/auth"
import { applyRateLimit } from "@/lib/rate-limit"
import { serializeProfile, type ProfileWithRelations } from "@/lib/profile"
import { canCreateDocument } from "@/lib/entitlement"
import { refundQuota } from "@/lib/quota-ledger"
import { generateEssay, textConcretenessCheck } from "@/lib/content-engine"

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  // Rate limit: 20 generations per minute per user (LLM cost-abuse protection)
  const limited = applyRateLimit(request, "generate", `user:${session.userId}:essay`)
  if (limited) return limited

  let body: any
  try { body = await request.json() } catch { return NextResponse.json({ error: "invalid-body" }, { status: 400 }) }

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

  // Entitlement gate: free tier capped at 5 documents (Brief §9.4)
  const quotaKey = body.idempotencyKey || request.headers.get("Idempotency-Key") || crypto.randomUUID()
  const docEntitlement = await canCreateDocument(profile, quotaKey)
  if (!docEntitlement.allowed) {
    return NextResponse.json(
      { error: docEntitlement.reason === "duplicate-operation" ? "duplicate-operation" : "entitlement-limit", reason: docEntitlement.reason, used: docEntitlement.used, limit: docEntitlement.limit },
      { status: docEntitlement.reason === "duplicate-operation" ? 409 : 402 }
    )
  }

  const locale = (body.locale as "id" | "en") || (profile.docLocale as "id" | "en") || "id"
  const tone = body.tone || profile.preferredTone || "warm"

  let serialized = serializeProfile(profile)
  if (body.edits) serialized = { ...serialized, ...body.edits }

  // Require at least one probing answer
  const probingQA = Array.isArray(body.probingQA) ? body.probingQA.filter((q: any) => q.answer?.trim()) : []
  if (probingQA.length === 0) {
    await refundQuota(quotaKey, profile.id)
    return NextResponse.json({ error: "no-probing-answers" }, { status: 400 })
  }

  let essay
  try {
    essay = await generateEssay(serialized, {
      locale, tone,
      essayType: body.essayType || "scholarship",
      prompt: body.prompt || "",
      targetOrg: body.targetOrg || "",
      wordLimit: body.wordLimit ? Number(body.wordLimit) : null,
      probingQA,
    })
  } catch (e) {
    await refundQuota(quotaKey, profile.id)
    console.error("[essay/generate] LLM failed:", (e as Error).message)
    return NextResponse.json({ error: "generation-failed" }, { status: 502 })
  }

  const check = textConcretenessCheck(essay.paragraphs.join(" "), locale)

  const title = `${body.essayType || "Essay"} — ${body.targetOrg || serialized.fullName || ""}`
  let doc
  try {
    const content = JSON.stringify(essay)
    const config = JSON.stringify({ locale, tone, essayType: body.essayType, targetOrg: body.targetOrg, concreteness: check.hasEvidence ? 100 : 0 })
    doc = await db.$transaction(async (tx) => {
      const created = await tx.document.create({ data: { userProfileId: profile.id, type: "essay", title, content, config, version: 1 } })
      await tx.documentVersion.create({ data: { documentId: created.id, versionNumber: 1, content, configSnapshot: config, revisionInstruction: null } })
      return created
    })
  } catch (e) {
    await refundQuota(quotaKey, profile.id)
    console.error("[essay/generate] persist failed:", (e as Error).message)
    return NextResponse.json({ error: "persistence-failed" }, { status: 500 })
  }

  return NextResponse.json({ ok: true, documentId: doc.id, essay, check, config: { locale, tone } })
}
