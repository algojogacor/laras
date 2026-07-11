import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { applyRateLimit } from "@/lib/rate-limit"
import { serializeProfile, type ProfileWithRelations } from "@/lib/profile"
import { generateAnswerFeedback } from "@/lib/content-engine"
import {
  requireActor,
  isValidId,
  getRequiredProfileId,
  AuthorizationError,
  handleAuthorizationError,
  findOwnedInterviewQuestion,
} from "@/lib/authorization"

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireActor()
    const { id: setId } = await params // interview set id
    if (!isValidId(setId)) {
      throw new AuthorizationError("BAD_REQUEST")
    }
    const profileId = getRequiredProfileId(actor)

    let body: { questionId?: string; answer?: string; locale?: string }
    try {
      body = await request.json()
    } catch {
      throw new AuthorizationError("BAD_REQUEST")
    }

    const { questionId } = body
    if (!isValidId(questionId)) {
      throw new AuthorizationError("BAD_REQUEST")
    }

    // Rate limit: 20 feedback requests per minute per user (LLM cost-abuse protection)
    const limited = applyRateLimit(request, "generate", `user:${actor.accountId}:interview-feedback`)
    if (limited) return limited

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
      throw new AuthorizationError("NOT_FOUND")
    }

    // Authenticate parent-child-owner pair using secure helper
    const question = await findOwnedInterviewQuestion(questionId, setId, actor)

    const locale = (body.locale as "id" | "en") || (profile.docLocale as "id" | "en") || "id"
    const userAnswer = body.answer || ""

    // Save the user answer with ownership verified in the predicate
    const updateAns = await db.interviewQuestion.updateMany({
      where: {
        id: questionId,
        interviewSetId: setId,
        interviewSet: {
          userProfileId: profileId,
        },
      },
      data: { userAnswer },
    })
    if (updateAns.count !== 1) {
      throw new AuthorizationError("NOT_FOUND")
    }

    // Generate feedback
    let feedback
    try {
      feedback = await generateAnswerFeedback({
        locale,
        question: question.question,
        userAnswer,
        profile: serializeProfile(profile),
      })
    } catch (e) {
      console.error("[interview-feedback] LLM failed:", (e as Error).message)
      return NextResponse.json({ error: "feedback-failed" }, { status: 502 })
    }

    // Save feedback with ownership verified in the predicate
    const updateFb = await db.interviewQuestion.updateMany({
      where: {
        id: questionId,
        interviewSetId: setId,
        interviewSet: {
          userProfileId: profileId,
        },
      },
      data: {
        feedback: JSON.stringify(feedback),
        suggestedAnswer: feedback.suggestedAnswer,
      },
    })
    if (updateFb.count !== 1) {
      throw new AuthorizationError("NOT_FOUND")
    }

    return NextResponse.json({ ok: true, feedback })
  } catch (error) {
    return handleAuthorizationError(error)
  }
}

