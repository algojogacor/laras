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

  const [applications, documents, appDocs] = await Promise.all([
    db.application.findMany({
      where: { userProfileId: profile.id },
      orderBy: { order: "asc" },
    }),
    db.document.findMany({
      where: { userProfileId: profile.id },
      orderBy: { updatedAt: "desc" },
      select: { id: true, type: true, title: true },
    }),
    db.applicationDocument.findMany({
      where: { application: { userProfileId: profile.id } },
      select: { applicationId: true, documentId: true },
    }),
  ])

  // map: appId -> documentIds[]
  const linkedMap: Record<string, string[]> = {}
  for (const ad of appDocs) {
    if (!linkedMap[ad.applicationId]) linkedMap[ad.applicationId] = []
    linkedMap[ad.applicationId].push(ad.documentId)
  }

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
    linkedDocIds: linkedMap[a.id] || [],
  }))

  const docs = documents.map((d) => ({ id: d.id, type: d.type, title: d.title }))

  return <ApplicationsBoard initialApplications={serialized} documents={docs} locale={locale} />
}
