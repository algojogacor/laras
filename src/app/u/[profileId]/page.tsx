import { notFound } from "next/navigation"
import { db } from "@/lib/db"
import { getSession } from "@/lib/auth"
import { getLocaleAndDict } from "@/lib/i18n"
import { projectPublicProfile } from "@/lib/public-profile.server"
import { PublicProfileView } from "@/components/profile/public-profile-view"

export const dynamic = "force-dynamic"

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ profileId: string }>
}) {
  const { profileId } = await params

  const profile = await db.userProfile.findUnique({
    where: { id: profileId },
    select: {
      id: true,
      accountId: true,
      fullName: true,
      headline: true,
      summary: true,
      email: true,
      phone: true,
      location: true,
      photoUrl: true,
      links: true,
      createdAt: true,
      experiences: {
        orderBy: { order: "asc" },
        select: {
          title: true,
          organization: true,
          startDate: true,
          endDate: true,
          current: true,
          location: true,
          description: true,
        },
      },
      educations: {
        orderBy: { order: "asc" },
        select: {
          institution: true,
          degree: true,
          field: true,
          startDate: true,
          endDate: true,
          current: true,
        },
      },
      skills: {
        orderBy: { order: "asc" },
        select: { name: true, category: true, proficiency: true },
      },
      certifications: {
        orderBy: { order: "asc" },
        select: { name: true, issuer: true },
      },
      languages: {
        orderBy: { order: "asc" },
        select: { language: true, level: true },
      },
      verificationBadges: {
        where: { status: "verified" },
        select: { type: true, status: true },
      },
      consentSettings: {
        select: { field: true, visibility: true },
      },
    },
  })

  if (!profile) notFound()

  const { t } = await getLocaleAndDict()
  const session = await getSession()
  let viewer: { accountId: string; profileId: string | null } | null = null
  let relationships:
    | Array<{ requesterId: string; addresseeId: string; status: string }>
    | undefined = []

  if (session) {
    if (session.userId === profile.accountId) {
      viewer = { accountId: session.userId, profileId: profile.id }
    } else {
      const viewerProfile = await db.userProfile.findUnique({
        where: { accountId: session.userId },
        select: { id: true },
      })
      viewer = { accountId: session.userId, profileId: viewerProfile?.id ?? null }

      if (viewerProfile) {
        try {
          relationships = await db.connection.findMany({
            where: {
              OR: [
                { requesterId: viewerProfile.id, addresseeId: profile.id },
                { requesterId: profile.id, addresseeId: viewerProfile.id },
              ],
            },
            select: { requesterId: true, addresseeId: true, status: true },
            take: 2,
          })
        } catch {
          relationships = undefined
          console.error("[public-profile] relationship resolution failed")
        }
      } else {
        relationships = undefined
      }
    }
  }

  const publicProfile = projectPublicProfile({
    profile,
    consentSettings: profile.consentSettings,
    viewer,
    relationships,
  })

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <PublicProfileView
        data={publicProfile}
        profileId={profileId}
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
