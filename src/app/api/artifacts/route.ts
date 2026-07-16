import crypto from "crypto"
import { z } from "zod"
import { db } from "@/lib/db"
import { serializeProfile, type ProfileWithRelations } from "@/lib/profile"
import { buildPresentationArtifact } from "@/lib/artifacts/presentation-engine"
import { canCreateDocument } from "@/lib/entitlement"
import { refundQuota } from "@/lib/quota-ledger"
import { requireActor, getRequiredProfileId, handleAuthorizationError, safeNextResponse } from "@/lib/authorization"

const createSchema = z.object({ locale: z.enum(["id", "en"]).optional(), audience: z.string().trim().min(1).max(200).optional(), objective: z.string().trim().min(1).max(500).optional(), themeFamily: z.enum(["professional-minimal", "editorial-portfolio", "formal-institutional", "modern-technical"]).optional(), edits: z.object({ fullName: z.string().trim().max(120), headline: z.string().trim().max(300), summary: z.string().trim().max(5000) }).strict().optional(), idempotencyKey: z.string().min(8).max(160).optional() }).strict()

export async function POST(request: Request) {
  let quotaKey: string | null = null
  let profileId: string | null = null
  try {
    const actor = await requireActor(); profileId = getRequiredProfileId(actor)
    const body = createSchema.safeParse(await request.json().catch(() => null))
    if (!body.success) return safeNextResponse({ error: "invalid-artifact" }, { status: 400 })
    quotaKey = body.data.idempotencyKey || request.headers.get("Idempotency-Key") || crypto.randomUUID()
    const entitlement = await canCreateDocument({ id: profileId }, quotaKey)
    if (!entitlement.allowed) return safeNextResponse({ error: entitlement.reason === "duplicate-operation" ? "duplicate-operation" : "entitlement-limit", reason: entitlement.reason }, { status: entitlement.reason === "duplicate-operation" ? 409 : 402 })
    const profile = await db.userProfile.findUnique({
      where: { id: profileId },
      include: {
        experiences: { orderBy: { order: "asc" } },
        educations: { orderBy: { order: "asc" } },
        skills: { orderBy: { order: "asc" } },
        certifications: { orderBy: { order: "asc" } },
        languages: { orderBy: { order: "asc" } },
      },
    }) as ProfileWithRelations | null
    if (!profile) { await refundQuota(quotaKey, profileId); return safeNextResponse({ error: "no-profile" }, { status: 404 }) }
    const serialized = serializeProfile(profile)
    const artifact = buildPresentationArtifact({ profile: { ...serialized, ...(body.data.edits || {}) }, locale: body.data.locale, audience: body.data.audience, objective: body.data.objective, themeFamily: body.data.themeFamily })
    const content = JSON.stringify(artifact), config = JSON.stringify({ schemaVersion: 1, template: artifact.theme.family, locale: artifact.locale })
    const document = await db.$transaction(async (tx) => {
      const doc = await tx.document.create({ data: { userProfileId: profileId!, type: "deck", title: artifact.title, content, config, version: 1 } })
      await tx.documentVersion.create({ data: { documentId: doc.id, versionNumber: 1, content, configSnapshot: config, revisionInstruction: null } })
      return doc
    })
    return safeNextResponse({ ok: true, documentId: document.id, artifact }, { status: 201 })
  } catch (error) {
    if (quotaKey && profileId) await refundQuota(quotaKey, profileId)
    return handleAuthorizationError(error)
  }
}
