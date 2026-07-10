import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { getSession } from "@/lib/auth"
import { getLocaleAndDict } from "@/lib/i18n"
import { InterviewList } from "@/components/interview/interview-list"

export default async function InterviewPage() {
  const session = await getSession()
  if (!session) redirect("/login")
  const profile = await db.userProfile.findUnique({ where: { accountId: session.userId }, select: { id: true } })
  if (!profile) redirect("/onboarding")
  const { t, locale } = await getLocaleAndDict()
  const sets = await db.interviewSet.findMany({
    where: { userProfileId: profile.id },
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { questions: true } } },
  })
  const serialized = sets.map((s) => ({
    id: s.id, title: s.title, role: s.role, context: s.context,
    questionCount: s._count.questions,
    createdAt: s.createdAt.toISOString(), updatedAt: s.updatedAt.toISOString(),
  }))
  return <InterviewList initialSets={serialized} locale={locale} />
}
