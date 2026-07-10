import { notFound } from "next/navigation"
import { db } from "@/lib/db"
import { getSession } from "@/lib/auth"
import { getLocaleAndDict } from "@/lib/i18n"
import { serializeProfile, type ProfileWithRelations } from "@/lib/profile"
import { getConsentMap } from "@/lib/privacy"
import { areConnected } from "@/lib/connections"
import { PublicProfileView } from "@/components/profile/public-profile-view"
import type { Visibility } from "@/lib/privacy"

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ profileId: string }>
}) {
  const { profileId } = await params

  const profile = (await db.userProfile.findUnique({
    where: { id: profileId },
    include: {
      experiences: { orderBy: { order: "asc" } },
      educations: { orderBy: { order: "asc" } },
      skills: { orderBy: { order: "asc" } },
      certifications: { orderBy: { order: "asc" } },
      languages: { orderBy: { order: "asc" } },
      verificationBadges: { select: { type: true, status: true } },
    },
  })) as ProfileWithRelations & { verificationBadges: { type: string; status: string }[] }

  if (!profile) notFound()

  const { t } = await getLocaleAndDict()
  const session = await getSession()

  // Resolve viewer relationship
  let viewerRelation: "owner" | "connection" | "public" = "public"
  if (session) {
    const myProfile = await db.userProfile.findUnique({
      where: { accountId: session.userId },
      select: { id: true },
    })
    if (myProfile?.id === profile.id) {
      viewerRelation = "owner"
    } else if (myProfile) {
      const connected = await areConnected(myProfile.id, profile.id)
      if (connected) viewerRelation = "connection"
    }
  }

  // Get consent map
  const consent = await getConsentMap(profile.id)
  const serialized = serializeProfile(profile)

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <PublicProfileView
        profile={{
          id: serialized.id,
          fullName: serialized.fullName,
          headline: serialized.headline,
          summary: serialized.summary,
          email: serialized.email,
          phone: serialized.phone,
          location: serialized.location,
          links: serialized.links,
          photoUrl: serialized.photoUrl,
          createdAt: profile.createdAt.toISOString(),
          experiences: serialized.experiences.map((e) => ({
            title: e.title,
            organization: e.organization,
            startDate: e.startDate,
            endDate: e.endDate,
            current: e.current,
            description: e.description,
          })),
          educations: serialized.educations.map((e) => ({
            institution: e.institution,
            degree: e.degree,
            field: e.field,
            startDate: e.startDate,
            endDate: e.endDate,
          })),
          skills: serialized.skills.map((s) => ({
            name: s.name,
            category: s.category,
            proficiency: s.proficiency,
          })),
          certifications: serialized.certifications.map((c) => ({
            name: c.name,
            issuer: c.issuer,
          })),
          languages: serialized.languages.map((l) => ({
            language: l.language,
            level: l.level,
          })),
          consent: consent as Record<string, Visibility>,
          viewerRelation,
          verifiedBadges: profile.verificationBadges,
        }}
        labels={{
          title: t.publicProfile.title,
          back: t.publicProfile.back,
          connectToView: t.publicProfile.connectToView,
          privateField: t.publicProfile.privateField,
          connectionsOnly: t.publicProfile.connectionsOnly,
          editProfile: t.publicProfile.editProfile,
          headline: t.publicProfile.headline,
          summary: t.publicProfile.summary,
          experience: t.publicProfile.experience,
          education: t.publicProfile.education,
          skills: t.publicProfile.skills,
          certifications: t.publicProfile.certifications,
          languages: t.publicProfile.languages,
          location: t.publicProfile.location,
          links: t.publicProfile.links,
          noExperience: t.publicProfile.noExperience,
          noEducation: t.publicProfile.noEducation,
          noSkills: t.publicProfile.noSkills,
          connectButton: t.publicProfile.connectButton,
          verifiedBadges: t.publicProfile.verifiedBadges,
          memberSince: t.publicProfile.memberSince,
        }}
      />
    </div>
  )
}
