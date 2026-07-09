"use client"

import Link from "next/link"
import { Award, Printer, ArrowLeft, Trophy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

type Cert = {
  id: string; certificateId: string; title: string; testMode: string; testSpec: string
  rawScore: number; percentage: number; estimatedCEFR: string | null
  estimatedTOEFL: string | null; estimatedIELTS: string | null
  confidence: string; questionCount: number; disclaimerText: string
  issuedAt: string | Date
}

export function CertificateView({ cert, userName }: { cert: Cert; userName: string }) {
  const issuedDate = new Date(cert.issuedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })

  function printPDF() {
    setTimeout(() => window.print(), 300)
  }

  return (
    <div className="space-y-6 animate-rise">
      <div className="print:hidden">
        <Link href="/english/certificates" className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" />Back to certificates
        </Link>
        <Button onClick={printPDF} size="sm" className="shadow-soft">
          <Printer className="mr-1.5 h-4 w-4" />Download PDF
        </Button>
      </div>

      {/* Certificate */}
      <Card className="print-area shadow-lift print:border-0 print:shadow-none">
        <CardContent className="p-8 sm:p-12">
          {/* Header */}
          <div className="flex items-center justify-between border-b-2 border-primary pb-4">
            <div>
              <h1 className="font-serif text-2xl font-bold text-primary">Laras</h1>
              <p className="text-xs text-muted-foreground">Career & Opportunity Readiness Ecosystem</p>
            </div>
            <Award className="h-12 w-12 text-accent" />
          </div>

          {/* Title */}
          <div className="mt-8 text-center">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Practice Score Certificate</p>
            <h2 className="mt-2 font-serif text-3xl font-bold">{cert.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">Non-Official Practice Result</p>
          </div>

          {/* Recipient */}
          <div className="mt-8 text-center">
            <p className="text-xs text-muted-foreground">This certificate is presented to</p>
            <p className="mt-1 font-serif text-2xl font-semibold">{userName}</p>
          </div>

          {/* Score */}
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <ScoreBox label="Percentage" value={`${cert.percentage}%`} />
            <ScoreBox label="Raw Score" value={`${cert.rawScore}/${cert.questionCount}`} />
            {cert.estimatedCEFR && <ScoreBox label="Est. CEFR" value={cert.estimatedCEFR} />}
            {cert.estimatedTOEFL && <ScoreBox label="Est. TOEFL (1-6)" value={cert.estimatedTOEFL} />}
            {cert.estimatedIELTS && <ScoreBox label="Est. IELTS Band" value={cert.estimatedIELTS} />}
            <ScoreBox label="Confidence" value={cert.confidence} />
          </div>

          {/* Test details */}
          <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Test Mode</p>
              <p className="font-medium capitalize">{cert.testMode}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Test Specification</p>
              <p className="font-medium">{cert.testSpec.replace(/_/g, " ")}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Questions</p>
              <p className="font-medium">{cert.questionCount}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Date Issued</p>
              <p className="font-medium">{issuedDate}</p>
            </div>
          </div>

          {/* Certificate ID + verification */}
          <div className="mt-6 rounded-lg border border-border bg-muted/30 p-4 text-center">
            <p className="text-xs text-muted-foreground">Certificate ID</p>
            <p className="font-mono text-sm font-semibold">{cert.certificateId}</p>
            <p className="mt-1 text-[10px] text-muted-foreground">
              Verify at: {typeof window !== "undefined" ? window.location.origin : "laras.app"}/verify/certificate/{cert.certificateId}
            </p>
          </div>

          {/* Disclaimer */}
          <div className="mt-6 rounded-lg border-2 border-amber-300 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/40">
            <p className="text-center text-xs font-medium text-amber-800 dark:text-amber-400">
              ⚠️ {cert.disclaimerText}
            </p>
          </div>

          {/* Footer */}
          <div className="mt-8 flex items-center justify-between border-t border-border pt-4">
            <p className="text-[10px] text-muted-foreground">Laras Practice Score Certificate — Non-Official</p>
            <p className="text-[10px] text-muted-foreground">© {new Date().getFullYear()} Laras</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function ScoreBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border p-3 text-center">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className="font-serif text-lg font-semibold text-primary">{value}</p>
    </div>
  )
}
