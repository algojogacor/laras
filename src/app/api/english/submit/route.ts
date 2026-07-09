import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSession } from "@/lib/auth"
import { calculateScore, getSkillBreakdown, getWeaknessTags } from "@/lib/scoring"

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  let body: { sessionId?: string; answers?: Record<string, number> }
  try { body = await request.json() } catch { return NextResponse.json({ error: "invalid-body" }, { status: 400 }) }

  const profile = await db.userProfile.findUnique({ where: { accountId: session.userId }, select: { id: true, fullName: true } })
  if (!profile) return NextResponse.json({ error: "no-profile" }, { status: 404 })

  const eng = await db.englishSession.findFirst({ where: { id: body.sessionId, userProfileId: profile.id } })
  if (!eng) return NextResponse.json({ error: "not-found" }, { status: 404 })

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
  await db.englishSession.update({
    where: { id: eng.id },
    data: { userAnswers: JSON.stringify(answers), score },
  })

  return NextResponse.json({
    ok: true,
    score,
    correct,
    total: questions.length,
    results,
    scoring,
    skillBreakdown,
    weaknessTags,
  })
}
