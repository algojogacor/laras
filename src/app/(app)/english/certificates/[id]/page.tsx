import { redirect, notFound } from "next/navigation"
import { db } from "@/lib/db"
import { getSession } from "@/lib/auth"
import { CertificateView } from "@/components/english/certificate-view"

export default async function CertificateDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) redirect("/login")
  const { id } = await params
  const profile = await db.userProfile.findUnique({ where: { accountId: session.userId }, select: { id: true, fullName: true } })
  if (!profile) redirect("/onboarding")
  const cert = await db.englishCertificate.findFirst({ where: { id, userProfileId: profile.id } })
  if (!cert) notFound()
  return <CertificateView cert={cert} userName={profile.fullName || ""} />
}
