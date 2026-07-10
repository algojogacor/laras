import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { getSession } from "@/lib/auth"
import { serializeProfile, type ProfileWithRelations } from "@/lib/profile"
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard"

export default async function OnboardingPage() {
  const session = await getSession()
  if (!session) redirect("/login")

  const account = await db.account.findUnique({
    where: { id: session.userId },
    include: {
      profile: {
        include: {
          experiences: { orderBy: { order: "asc" } },
          educations: { orderBy: { order: "asc" } },
          skills: { orderBy: { order: "asc" } },
          certifications: { orderBy: { order: "asc" } },
          languages: { orderBy: { order: "asc" } },
        },
      },
    },
  })
  if (!account) redirect("/login")

  // Ensure profile exists
  let profile = account.profile as ProfileWithRelations | null
  if (!profile) {
    profile = (await db.userProfile.create({
      data: { accountId: account.id, email: account.email, fullName: account.name },
      include: {
        experiences: true, educations: true, skills: true,
        certifications: true, languages: true,
      },
    })) as ProfileWithRelations
  }

  if (profile.onboardingComplete) redirect("/dashboard")

  return <OnboardingWizard initialProfile={serializeProfile(profile)} />
}
