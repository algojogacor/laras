"use client"

import Link from "next/link"
import { Download, ArrowLeft, Calendar, FileText } from "lucide-react"
import { PrintButton } from "@/components/documents/print-button"
import { DeleteDocButton } from "@/components/documents/delete-doc-button"
import type { Dictionary } from "@/lib/i18n/dictionary"
import type { SerializedProfile } from "@/lib/profile"
import type { GeneratedCVATS } from "@/lib/content-engine"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CVATSPreview } from "@/components/documents/cv-ats-preview"
import { ConcretenessPanel } from "@/components/documents/concreteness-panel"

type Check = {
  score: number; totalBullets: number; withEvidence: number; buzzwordNoEvidence: number
  flagged: string[]; summaryHasEvidence: boolean; verdict: "good" | "fair" | "weak"
}

export function CVATSViewer({
  documentId, title, cv, check, profile, locale, createdAt, updatedAt, version, dict,
}: {
  documentId: string
  title: string
  cv: GeneratedCVATS
  check: Check
  profile: SerializedProfile
  locale: "id" | "en"
  createdAt: Date
  updatedAt: Date
  version: number
  dict: Dictionary
}) {
  const t = dict

  return (
    <div className="space-y-6 animate-rise">
      {/* Header */}
      <div>
        <Link
          href="/documents"
          className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {t.documents.backToDocuments}
        </Link>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="font-serif text-3xl font-semibold tracking-tight">{title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <FileText className="h-3.5 w-3.5" /> {t.documents.types["cv-ats"]}
              </span>
              <span>·</span>
              <span>{t.documents.version} {version}</span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {new Date(updatedAt).toLocaleDateString()}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => window.open(`/api/documents/cv-ats/${documentId}/export`, "_blank")} className="shadow-soft" size="sm">
              <Download className="mr-1.5 h-4 w-4" />
              {t.documents.downloadDocx}
            </Button>
            <PrintButton className="print:hidden" />
            <DeleteDocButton documentId={documentId} />
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3 print:hidden">
        {/* Preview */}
        <div className="lg:col-span-2">
          <div className="overflow-hidden rounded-xl border border-border bg-muted/30 p-4 sm:p-8 scrollbar-laras max-h-[80vh] overflow-y-auto">
            <CVATSPreview profile={profile} cv={cv} locale={locale} />
          </div>
        </div>

        {/* Quality */}
        <div className="space-y-6">
          <Card className="shadow-soft sticky top-20">
            <CardHeader>
              <CardTitle className="font-serif text-lg">{t.documents.concretenessScore}</CardTitle>
            </CardHeader>
            <CardContent>
              <ConcretenessPanel check={check} />
              <div className="mt-4 border-t border-border pt-4">
                <Badge variant="secondary" className="text-xs">
                  {locale === "id" ? t.documents.docLangId : t.documents.docLangEn}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Print-only copy of the CV (no scroll container, no chrome) */}
      <div className="hidden print:block print-area">
        <CVATSPreview profile={profile} cv={cv} locale={locale} />
      </div>
    </div>
  )
}
