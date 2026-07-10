import { redirect, notFound } from "next/navigation"
import { db } from "@/lib/db"
import { getSession } from "@/lib/auth"
import { getLocaleAndDict } from "@/lib/i18n"
import { serializeProfile, type ProfileWithRelations } from "@/lib/profile"
import type { GeneratedBio } from "@/lib/content-engine"
import { BioViewer } from "@/components/documents/bio-viewer"

export default async function BioDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await getSession()
  if (!session) redirect("/login")
  const { id } = await params

  const profile = (await db.userProfile.findUnique({
    where: { accountId: session.userId },
    include: {
      experiences: { orderBy: { order: "asc" } },
      educations: { orderBy: { order: "asc" } },
      skills: { orderBy: { order: "asc" } },
      certifications: { orderBy: { order: "asc" } },
      languages: { orderBy: { order: "asc" } },
    },
  })) as ProfileWithRelations | null
  if (!profile) redirect("/onboarding")

  const doc = await db.document.findFirst({
    where: { id, userProfileId: profile.id, type: "bio" },
  })
  if (!doc) notFound()

  const { t } = await getLocaleAndDict()
  const bio = JSON.parse(doc.content || "{}") as GeneratedBio
  const config = doc.config ? JSON.parse(doc.config) : { locale: "id" }

  return (
    <BioViewer
      documentId={doc.id}
      title={doc.title}
      bio={bio}
      profile={serializeProfile(profile)}
      locale={(config.locale as "id" | "en") || "id"}
      updatedAt={doc.updatedAt}
      version={doc.version}
      dict={t}
    />
  )
}
