import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { calculateScore, getSkillBreakdown, getWeaknessTags } from "@/lib/scoring"
import {
  requireActor,
  isValidId,
  getRequiredProfileId,
  AuthorizationError,
  handleAuthorizationError,
  findOwnedEnglishSession,
  safeNextResponse
} from "@/lib/authorization"

export async function POST(request: Request) {
  try {
    const actor = await requireActor()
    const profileId = getRequiredProfileId(actor)

    let body: { sessionId?: string; answers?: Record<string, number> }
    try {
      body = await request.json()
    } catch {
      throw new AuthorizationError("BAD_REQUEST")
    }

    const { sessionId } = body
    if (!isValidId(sessionId)) {
      throw new AuthorizationError("BAD_REQUEST")
    }

    // Authenticate English session ownership
    const eng = await findOwnedEnglishSession(sessionId, actor)

    const questions = JSON.parse(eng.questions || "[]") as { id: string; answer: number; explanation?: string; category?: string }[]
    const answers = body.answers || {}
    let correct = 0
    const results = questions.map((q) => {
      const userAns = answers[q.id]
      const isCorrect = typeof userAns === "number" && userAns === q.answer
      if (isCorrect) correct++
      return { id: q.id, userAnswer: userAns ?? null, correctAnswer: q.answer, isCorrect, explanation: q.explanation, category: q.category }
    })

    // Calculate estimated practice scores (Brief: TOEFL/IELTS 2026 scoring)
    const scoring = calculateScore(correct, questions.length, "LARAS_TOEFL_STYLE")
    const skillBreakdown = getSkillBreakdown(results, questions)
    const weaknessTags = getWeaknessTags(skillBreakdown)

    const score = scoring.percentage

    // Atomic owner-scoped update
    const updateResult = await db.englishSession.updateMany({
      where: { id: sessionId, userProfileId: profileId },
      data: { userAnswers: JSON.stringify(answers), score },
    })

    if (updateResult.count !== 1) {
      throw new AuthorizationError("NOT_FOUND")
    }

    return safeNextResponse({
      ok: true,
      score,
      correct,
      total: questions.length,
      results,
      scoring,
      skillBreakdown,
      weaknessTags,
    })
  } catch (error) {
    return handleAuthorizationError(error)
  }
}
