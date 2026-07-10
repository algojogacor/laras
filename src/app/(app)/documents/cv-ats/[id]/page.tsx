import { redirect, notFound } from "next/navigation"
import { db } from "@/lib/db"
import { getSession } from "@/lib/auth"
import { getLocaleAndDict } from "@/lib/i18n"
import { serializeProfile, type ProfileWithRelations } from "@/lib/profile"
import type { GeneratedCVATS } from "@/lib/content-engine"
import { CVATSViewer } from "@/components/documents/cv-ats-viewer"

export default async function DocumentDetailPage({
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
    where: { id, userProfileId: profile.id, type: "cv-ats" },
  })
  if (!doc) notFound()

  const { t } = await getLocaleAndDict()
  const cv = JSON.parse(doc.content || "{}") as GeneratedCVATS
  const config = doc.config ? JSON.parse(doc.config) : { locale: "id" }

  // Recompute check client-side-ish (deterministic) — reimport logic
  const { concretenessCheck } = await import("@/lib/content-engine")
  const check = concretenessCheck(cv, (config.locale as "id" | "en") || "id")

  return (
    <CVATSViewer
      documentId={doc.id}
      title={doc.title}
      cv={cv}
      check={check}
      profile={serializeProfile(profile)}
      locale={(config.locale as "id" | "en") || "id"}
      createdAt={doc.createdAt}
      updatedAt={doc.updatedAt}
      version={doc.version}
      dict={t}
    />
  )
}
