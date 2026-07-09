import { db } from "@/lib/db"
import { notFound } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Award, CheckCircle2, XCircle } from "lucide-react"

export default async function VerifyCertificatePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const cert = await db.englishCertificate.findUnique({
    where: { certificateId: code },
    include: { userProfile: { select: { fullName: true } } },
  })

  if (!cert) notFound()

  const issuedDate = new Date(cert.issuedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })

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
            {cert.status === "active" ? "Certificate Verified" : "Certificate Revoked"}
          </h1>
          <p className="mt-1 text-center text-sm text-muted-foreground">
            {cert.status === "active" ? "This certificate is valid." : "This certificate has been revoked."}
          </p>

          <div className="mt-6 space-y-3 rounded-lg border border-border p-4">
            <div className="flex justify-between">
              <span className="text-xs text-muted-foreground">Certificate ID</span>
              <span className="font-mono text-xs font-semibold">{cert.certificateId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-muted-foreground">Recipient</span>
              <span className="text-sm font-medium">{cert.userProfile.fullName || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-muted-foreground">Test Mode</span>
              <span className="text-sm font-medium capitalize">{cert.testMode}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-muted-foreground">Score</span>
              <span className="text-sm font-semibold">{cert.percentage}% (practice estimate)</span>
            </div>
            {cert.estimatedCEFR && (
              <div className="flex justify-between">
                <span className="text-xs text-muted-foreground">Est. CEFR</span>
                <span className="text-sm font-medium">{cert.estimatedCEFR}</span>
              </div>
            )}
            {cert.estimatedTOEFL && (
              <div className="flex justify-between">
                <span className="text-xs text-muted-foreground">Est. TOEFL (1-6)</span>
                <span className="text-sm font-medium">{cert.estimatedTOEFL}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-xs text-muted-foreground">Issued</span>
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
            <span className="text-xs text-muted-foreground">Laras Practice Score Certificate — Non-Official</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
