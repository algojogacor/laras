import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { applyRateLimit } from "@/lib/rate-limit"
import { generateInterviewQuestions } from "@/lib/content-engine"
import { canCreateInterviewSet } from "@/lib/entitlement"
import {
  requireActor,
  getRequiredProfileId,
  handleAuthorizationError,
  safeNextResponse
} from "@/lib/authorization"

export async function GET() {
  try {
    const actor = await requireActor()
    if (!actor.profileId) {
      return safeNextResponse({ sets: [] })
    }

    const sets = await db.interviewSet.findMany({
      where: { userProfileId: actor.profileId },
      orderBy: { updatedAt: "desc" },
      include: { _count: { select: { questions: true } } },
    })

    return safeNextResponse({
      sets: sets.map((s) => ({ ...s, questionCount: s._count.questions })),
    })
  } catch (error) {
    return handleAuthorizationError(error)
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireActor()
    const profileId = getRequiredProfileId(actor)

    // Rate limit: 20 interview set generations per minute per user (LLM cost-abuse protection)
    const limited = applyRateLimit(request, "generate", `user:${actor.accountId}:interview`)
    if (limited) return limited

    let body: any
    try {
      body = await request.json()
    } catch {
      return safeNextResponse({ error: "invalid-body" }, { status: 400 })
    }

    const profile = await db.userProfile.findUnique({
      where: { id: profileId },
      select: { id: true, docLocale: true },
    })
    if (!profile) {
      return safeNextResponse({ error: "no-profile" }, { status: 404 })
    }

    // Entitlement gate: free tier capped at 3 interview sets (Brief §9.4)
    const interviewEntitlement = await canCreateInterviewSet(profile)
    if (!interviewEntitlement.allowed) {
      return safeNextResponse(
        {
          error: "entitlement-limit",
          reason: interviewEntitlement.reason,
          used: interviewEntitlement.used,
          limit: interviewEntitlement.limit,
        },
        { status: 402 }
      )
    }

    const locale = (body.locale as "id" | "en") || (profile.docLocale as "id" | "en") || "id"
    const set = await db.interviewSet.create({
      data: {
        userProfileId: profileId,
        title: body.title || body.role || "Interview session",
        role: body.role || null,
        context: body.context || null,
      },
    })

    // Generate questions
    let questions
    try {
      questions = await generateInterviewQuestions({
        locale,
        role: body.role || "",
        context: body.context || "",
        count: 6,
      })
    } catch (e) {
      console.error("[interview-sets] LLM failed:", (e as Error).message)
      // Clean up the empty set we just created
      await db.interviewSet.delete({ where: { id: set.id } })
      return safeNextResponse({ error: "generation-failed" }, { status: 502 })
    }

    if (questions.length > 0) {
      await db.interviewQuestion.createMany({
        data: questions.map((q, i) => ({
          interviewSetId: set.id,
          question: q.question,
          category: q.category,
          order: i,
        })),
      })
    }

    const fullSet = await db.interviewSet.findUnique({
      where: { id: set.id },
      include: { questions: { orderBy: { order: "asc" } } },
    })
    return safeNextResponse({ ok: true, set: fullSet })
  } catch (error) {
    return handleAuthorizationError(error)
  }
}
