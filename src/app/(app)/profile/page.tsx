import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { getSession } from "@/lib/auth"
import { computeCompletion, serializeProfile, type ProfileWithRelations } from "@/lib/profile"
import { ProfileEditor } from "@/components/profile/profile-editor"

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

  return <ProfileEditor initialProfile={serializeProfile(profile)} initialCompletion={completion} />
}
