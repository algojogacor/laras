import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { getSession } from "@/lib/auth"
import { getLocaleAndDict } from "@/lib/i18n"
import { CertificateList } from "@/components/english/certificate-list"

export default async function CertificatesPage() {
  const session = await getSession()
  if (!session) redirect("/login")
  const profile = await db.userProfile.findUnique({ where: { accountId: session.userId }, select: { id: true, fullName: true } })
  if (!profile) redirect("/onboarding")
  const { locale } = await getLocaleAndDict()
  const certs = await db.englishCertificate.findMany({
    where: { userProfileId: profile.id, status: "active" },
    orderBy: { issuedAt: "desc" },
  })
  const serialized = certs.map((c) => ({
    id: c.id, certificateId: c.certificateId, title: c.title, testMode: c.testMode,
    percentage: c.percentage, estimatedCEFR: c.estimatedCEFR, estimatedTOEFL: c.estimatedTOEFL,
    confidence: c.confidence, issuedAt: c.issuedAt.toISOString(),
  }))
  return <CertificateList certificates={serialized} userName={profile.fullName || ""} locale={locale} />
}
