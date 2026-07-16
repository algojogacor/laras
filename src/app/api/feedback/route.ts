import { NextRequest } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { requireActor, getRequiredProfileId, handleAuthorizationError, safeNextResponse } from "@/lib/authorization"
import { applyRateLimit } from "@/lib/rate-limit"

const schema = z.object({
  category: z.enum(["bug", "confusing", "visual", "performance", "missing", "suggestion"]),
  page: z.string().trim().min(1).max(160),
  description: z.string().trim().min(10).max(5000),
  expectedBehavior: z.string().trim().max(2000).optional(),
  consentToContact: z.boolean().default(false),
  appVersion: z.string().trim().min(1).max(80),
  technicalContext: z.string().trim().max(1000).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const actor = await requireActor()
    const profileId = getRequiredProfileId(actor)
    const limited = applyRateLimit(request, "api", `profile:${profileId}:beta-feedback`)
    if (limited) return limited
    const parsed = schema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return safeNextResponse({ error: "invalid-feedback" }, { status: 400 })
    const feedback = await db.betaFeedback.create({ data: { userProfileId: profileId, ...parsed.data } })
    return safeNextResponse({ ok: true, feedback: { id: feedback.id, status: feedback.status } }, { status: 201 })
  } catch (error) {
    return handleAuthorizationError(error)
  }
}
