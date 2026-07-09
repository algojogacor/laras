import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { getSession } from "@/lib/auth"
import { serializeProfile, type ProfileWithRelations } from "@/lib/profile"
import { CVVisualBuilder } from "@/components/documents/cv-visual/cv-visual-builder"

export default async function NewCVVisualPage() {
  const session = await getSession()
  if (!session) redirect("/login")
  const profile = (await db.userProfile.findUnique({
    where: { accountId: session.userId },
    include: { experiences: { orderBy: { order: "asc" } }, educations: { orderBy: { order: "asc" } }, skills: { orderBy: { order: "asc" } }, certifications: { orderBy: { order: "asc" } }, languages: { orderBy: { order: "asc" } } },
  })) as ProfileWithRelations | null
  if (!profile) redirect("/onboarding")
  return <CVVisualBuilder initialProfile={serializeProfile(profile)} />
}
