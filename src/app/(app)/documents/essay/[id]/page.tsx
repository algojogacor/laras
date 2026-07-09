import { redirect, notFound } from "next/navigation"
import { db } from "@/lib/db"
import { getSession } from "@/lib/auth"
import { getLocaleAndDict } from "@/lib/i18n"
import { serializeProfile, type ProfileWithRelations } from "@/lib/profile"
import type { GeneratedEssay } from "@/lib/content-engine"
import { EssayViewer } from "@/components/documents/essay-viewer"

export default async function EssayDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) redirect("/login")
  const { id } = await params
  const profile = (await db.userProfile.findUnique({
    where: { accountId: session.userId },
    include: { experiences: { orderBy: { order: "asc" } }, educations: { orderBy: { order: "asc" } }, skills: { orderBy: { order: "asc" } }, certifications: { orderBy: { order: "asc" } }, languages: { orderBy: { order: "asc" } } },
  })) as ProfileWithRelations | null
  if (!profile) redirect("/onboarding")
  const doc = await db.document.findFirst({ where: { id, userProfileId: profile.id, type: "essay" } })
  if (!doc) notFound()
  const { t } = await getLocaleAndDict()
  const essay = JSON.parse(doc.content || "{}") as GeneratedEssay
  const config = doc.config ? JSON.parse(doc.config) : { locale: "id" }
  return <EssayViewer documentId={doc.id} title={doc.title} essay={essay} profile={serializeProfile(profile)} locale={(config.locale as "id" | "en") || "id"} updatedAt={doc.updatedAt} version={doc.version} dict={t} />
}
