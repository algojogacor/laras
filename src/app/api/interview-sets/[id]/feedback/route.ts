import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSession } from "@/lib/auth"
import { serializeProfile, type ProfileWithRelations } from "@/lib/profile"
import { generateAnswerFeedback } from "@/lib/content-engine"

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  const { id } = await params // interview set id
  let body: { questionId?: string; answer?: string; locale?: string }
  try { body = await request.json() } catch { return NextResponse.json({ error: "invalid-body" }, { status: 400 }) }

  const profile = (await db.userProfile.findUnique({
    where: { accountId: session.userId },
    include: { experiences: { orderBy: { order: "asc" } }, educations: { orderBy: { order: "asc" } }, skills: { orderBy: { order: "asc" } }, certifications: { orderBy: { order: "asc" } }, languages: { orderBy: { order: "asc" } } },
  })) as ProfileWithRelations | null
  if (!profile) return NextResponse.json({ error: "no-profile" }, { status: 404 })

  const question = await db.interviewQuestion.findFirst({
    where: { id: body.questionId, interviewSetId: id },
    include: { interviewSet: { select: { userProfileId: true } } },
  })
  if (!question) return NextResponse.json({ error: "not-found" }, { status: 404 })
  if (question.interviewSet.userProfileId !== profile.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const locale = (body.locale as "id" | "en") || (profile.docLocale as "id" | "en") || "id"
  const userAnswer = body.answer || ""

  // Save the user answer
  await db.interviewQuestion.update({ where: { id: question.id }, data: { userAnswer } })

  // Generate feedback
  const feedback = await generateAnswerFeedback({
    locale,
    question: question.question,
    userAnswer,
    profile: serializeProfile(profile),
  })

  // Save feedback
  await db.interviewQuestion.update({
    where: { id: question.id },
    data: { feedback: JSON.stringify(feedback), suggestedAnswer: feedback.suggestedAnswer },
  })

  return NextResponse.json({ ok: true, feedback })
}
