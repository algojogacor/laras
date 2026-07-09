import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { getSession } from "@/lib/auth"
import { getLocaleAndDict } from "@/lib/i18n"
import { ApplicationsBoard } from "@/components/applications/applications-board"

export default async function ApplicationsPage() {
  const session = await getSession()
  if (!session) redirect("/login")

  const profile = await db.userProfile.findUnique({
    where: { accountId: session.userId },
    select: { id: true },
  })
  if (!profile) redirect("/onboarding")

  const { t, locale } = await getLocaleAndDict()

  const applications = await db.application.findMany({
    where: { userProfileId: profile.id },
    orderBy: { order: "asc" },
  })

  const serialized = applications.map((a) => ({
    id: a.id,
    type: a.type,
    position: a.position,
    organization: a.organization,
    status: a.status,
    deadline: a.deadline,
    location: a.location,
    url: a.url,
    summary: a.summary,
    notes: a.notes,
    jobDescription: a.jobDescription,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
  }))

  return <ApplicationsBoard initialApplications={serialized} locale={locale} />
}
