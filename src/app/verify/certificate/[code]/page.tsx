import { db } from "@/lib/db"
import { notFound } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Award, CheckCircle2, XCircle } from "lucide-react"
import { getLocale } from "@/lib/i18n"

export default async function VerifyCertificatePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const locale = await getLocale()
  const isID = locale === "id"

  const cert = await db.englishCertificate.findUnique({
    where: { certificateId: code },
    include: { userProfile: { select: { fullName: true } } },
  })

  if (!cert) notFound()

  const issuedDate = new Date(cert.issuedAt).toLocaleDateString(
    isID ? "id-ID" : "en-US",
    { year: "numeric", month: "long", day: "numeric" },
  )

  const t = isID
    ? {
        verified: "Sertifikat Terverifikasi",
        revoked: "Sertifikat Dicabut",
        valid: "Sertifikat ini valid.",
        revokedDesc: "Sertifikat ini telah dicabut.",
        certId: "ID Sertifikat",
        recipient: "Penerima",
        testMode: "Mode Tes",
        score: "Skor",
        practiceEstimate: "(estimasi latihan)",
        estCEFR: "Est. CEFR",
        estTOEFL: "Est. TOEFL (1-6)",
        issued: "Diterbitkan",
        footer: "Sertifikat Skor Latihan Laras — Non-Resmi",
      }
    : {
        verified: "Certificate Verified",
        revoked: "Certificate Revoked",
        valid: "This certificate is valid.",
        revokedDesc: "This certificate has been revoked.",
        certId: "Certificate ID",
        recipient: "Recipient",
        testMode: "Test Mode",
        score: "Score",
        practiceEstimate: "(practice estimate)",
        estCEFR: "Est. CEFR",
        estTOEFL: "Est. TOEFL (1-6)",
        issued: "Issued",
        footer: "Laras Practice Score Certificate — Non-Official",
      }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-lg shadow-lift">
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            {cert.status === "active" ? (
              <CheckCircle2 className="h-16 w-16 text-emerald-500" />
            ) : (
              <XCircle className="h-16 w-16 text-red-500" />
            )}
          </div>
          <h1 className="mt-4 text-center font-serif text-2xl font-bold">
            {cert.status === "active" ? t.verified : t.revoked}
          </h1>
          <p className="mt-1 text-center text-sm text-muted-foreground">
            {cert.status === "active" ? t.valid : t.revokedDesc}
          </p>

          <div className="mt-6 space-y-3 rounded-lg border border-border p-4">
            <div className="flex justify-between">
              <span className="text-xs text-muted-foreground">{t.certId}</span>
              <span className="font-mono text-xs font-semibold">{cert.certificateId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-muted-foreground">{t.recipient}</span>
              <span className="text-sm font-medium">{cert.userProfile.fullName || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-muted-foreground">{t.testMode}</span>
              <span className="text-sm font-medium capitalize">{cert.testMode}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-muted-foreground">{t.score}</span>
              <span className="text-sm font-semibold">
                {cert.percentage}% {t.practiceEstimate}
              </span>
            </div>
            {cert.estimatedCEFR && (
              <div className="flex justify-between">
                <span className="text-xs text-muted-foreground">{t.estCEFR}</span>
                <span className="text-sm font-medium">{cert.estimatedCEFR}</span>
              </div>
            )}
            {cert.estimatedTOEFL && (
              <div className="flex justify-between">
                <span className="text-xs text-muted-foreground">{t.estTOEFL}</span>
                <span className="text-sm font-medium">{cert.estimatedTOEFL}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-xs text-muted-foreground">{t.issued}</span>
              <span className="text-sm font-medium">{issuedDate}</span>
            </div>
          </div>

          {/* Disclaimer */}
          <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/40">
            <p className="text-center text-[10px] text-amber-800 dark:text-amber-400">
              {cert.disclaimerText}
            </p>
          </div>

          <div className="mt-4 flex items-center justify-center gap-2">
            <Award className="h-4 w-4 text-accent" />
            <span className="text-xs text-muted-foreground">{t.footer}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
