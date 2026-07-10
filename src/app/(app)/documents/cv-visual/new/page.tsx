import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { getSession } from "@/lib/auth"
import { getLocaleAndDict } from "@/lib/i18n"
import { serializeProfile, type ProfileWithRelations } from "@/lib/profile"
import { canAccessVisualCV } from "@/lib/entitlement"
import { CVVisualBuilder } from "@/components/documents/cv-visual/cv-visual-builder"
import { FeatureLock } from "@/components/shared/feature-lock"

export default async function NewCVVisualPage() {
  const session = await getSession()
  if (!session) redirect("/login")
  const profile = (await db.userProfile.findUnique({
    where: { accountId: session.userId },
    include: { experiences: { orderBy: { order: "asc" } }, educations: { orderBy: { order: "asc" } }, skills: { orderBy: { order: "asc" } }, certifications: { orderBy: { order: "asc" } }, languages: { orderBy: { order: "asc" } } },
  })) as ProfileWithRelations | null
  if (!profile) redirect("/onboarding")

  // Entitlement gate: Visual CV is a Pro+ feature (Brief §9.4)
  const access = await canAccessVisualCV(profile)
  if (!access.allowed) {
    const { t } = await getLocaleAndDict()
    return (
      <FeatureLock
        title={t.documents.lockedTitle}
        message={t.documents.lockedVisualCv}
        upgrade={t.documents.lockedUpgrade}
        contactAdmin={t.documents.lockedContactAdmin}
        backHref="/documents"
        backLabel={t.documents.lockedBack}
      />
    )
  }

  return <CVVisualBuilder initialProfile={serializeProfile(profile)} />
}
