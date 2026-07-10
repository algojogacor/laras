import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { getSession } from "@/lib/auth"
import { getLocaleAndDict } from "@/lib/i18n"
import { computeCompletion, serializeProfile, type ProfileWithRelations } from "@/lib/profile"
import { getConsentEntries } from "@/lib/privacy"
import { ProfileEditor } from "@/components/profile/profile-editor"
import { PrivacyPanel } from "@/components/profile/privacy-panel"

export default async function ProfilePage() {
  const session = await getSession()
  if (!session) redirect("/login")

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

  const completion = computeCompletion(profile)
  const { t } = await getLocaleAndDict()
  const consentEntries = await getConsentEntries(profile.id)

  return (
    <div className="space-y-6">
      <ProfileEditor initialProfile={serializeProfile(profile)} initialCompletion={completion} />
      <PrivacyPanel
        initialEntries={consentEntries}
        labels={{
          title: t.profile.privacyTitle,
          desc: t.profile.privacyDesc,
          public: t.profile.privacyPublic,
          publicDesc: t.profile.privacyPublicDesc,
          connections: t.profile.privacyConnections,
          connectionsDesc: t.profile.privacyConnectionsDesc,
          private: t.profile.privacyPrivate,
          privateDesc: t.profile.privacyPrivateDesc,
          fieldFullName: t.profile.privacyFieldFullName,
          fieldEmail: t.profile.privacyFieldEmail,
          fieldPhone: t.profile.privacyFieldPhone,
          fieldLocation: t.profile.privacyFieldLocation,
          fieldLinks: t.profile.privacyFieldLinks,
          fieldExperiences: t.profile.privacyFieldExperiences,
          fieldEducation: t.profile.privacyFieldEducation,
          fieldSkills: t.profile.privacyFieldSkills,
          fieldCertifications: t.profile.privacyFieldCertifications,
          fieldLanguages: t.profile.privacyFieldLanguages,
          saved: t.profile.privacySaved,
          error: t.profile.privacyError,
          summary: t.profile.privacySummary,
          publicCount: t.profile.privacyPublicCount,
          connectionsCount: t.profile.privacyConnectionsCount,
          privateCount: t.profile.privacyPrivateCount,
        }}
      />
    </div>
  )
}
