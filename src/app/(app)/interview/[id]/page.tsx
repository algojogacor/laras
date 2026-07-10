import { redirect, notFound } from "next/navigation"
import { db } from "@/lib/db"
import { getSession } from "@/lib/auth"
import { getLocaleAndDict } from "@/lib/i18n"
import { InterviewPractice } from "@/components/interview/interview-practice"
import type { AnswerFeedback } from "@/lib/content-engine"

export default async function InterviewPracticePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) redirect("/login")
  const { id } = await params
  const profile = await db.userProfile.findUnique({ where: { accountId: session.userId }, select: { id: true } })
  if (!profile) redirect("/onboarding")
  const set = await db.interviewSet.findFirst({
    where: { id, userProfileId: profile.id },
    include: { questions: { orderBy: { order: "asc" } } },
  })
  if (!set) notFound()
  const { locale } = await getLocaleAndDict()
  const questions = set.questions.map((q) => ({
    id: q.id, question: q.question, category: q.category ?? "general",
    userAnswer: q.userAnswer, suggestedAnswer: q.suggestedAnswer,
    feedback: q.feedback ? (JSON.parse(q.feedback) as AnswerFeedback) : null,
    order: q.order,
  }))
  return <InterviewPractice setId={set.id} title={set.title} role={set.role} questions={questions} locale={locale} />
}
