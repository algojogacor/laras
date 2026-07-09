"use client"

import Link from "next/link"
import { useState } from "react"
import { Download, ArrowLeft, Calendar, Copy, Check } from "lucide-react"
import { PrintButton } from "@/components/documents/print-button"
import { DeleteDocButton } from "@/components/documents/delete-doc-button"
import { FollowUpRevisionPanel } from "@/components/documents/follow-up-revision-panel"
import { toast } from "sonner"
import type { Dictionary } from "@/lib/i18n/dictionary"
import type { SerializedProfile } from "@/lib/profile"
import type { GeneratedBio } from "@/lib/content-engine"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export function BioViewer({
  documentId, title, bio, profile, locale, updatedAt, version, dict,
}: {
  documentId: string
  title: string
  bio: GeneratedBio
  profile: SerializedProfile
  locale: "id" | "en"
  updatedAt: Date
  version: number
  dict: Dictionary
}) {
  const t = dict
  const [copied, setCopied] = useState<string | null>(null)

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key); toast.success(t.documents.copied); setTimeout(() => setCopied(null), 2000)
    })
  }

  return (
    <div className="space-y-6 animate-rise">
      <div>
        <Link href="/documents" className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" />{t.documents.backToDocuments}
        </Link>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="font-serif text-3xl font-semibold tracking-tight">{title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span>{t.documents.version} {version}</span>
              <span>·</span>
              <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{new Date(updatedAt).toLocaleDateString()}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => window.open(`/api/documents/bio/${documentId}/export`, "_blank")} className="shadow-soft">
              <Download className="mr-1.5 h-4 w-4" />{t.documents.downloadDocx}
            </Button>
            <PrintButton className="print:hidden" />
            <DeleteDocButton documentId={documentId} />
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="shadow-soft relative">
          <CardHeader className="pb-2"><CardTitle className="font-serif text-sm font-medium text-muted-foreground">{t.documents.bioHeadline}</CardTitle></CardHeader>
          <CardContent className="pt-0">
            <p className="font-serif text-lg font-medium leading-snug">{bio.headline}</p>
            <Button variant="ghost" size="sm" onClick={() => copy(bio.headline, "headline")} className="absolute right-3 top-3 h-7 w-7 p-0">
              {copied === "headline" ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-soft relative">
          <CardHeader className="pb-2"><CardTitle className="font-serif text-sm font-medium text-muted-foreground">{t.documents.bioAbout}</CardTitle></CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm leading-relaxed">{bio.about}</p>
            <Button variant="ghost" size="sm" onClick={() => copy(bio.about, "about")} className="absolute right-3 top-3 h-7 w-7 p-0">
              {copied === "about" ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-soft relative">
          <CardHeader className="pb-2"><CardTitle className="font-serif text-sm font-medium text-muted-foreground">{t.documents.bioPersonal}</CardTitle></CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              {bio.personal.map((p, i) => <p key={i} className="text-sm leading-relaxed">{p}</p>)}
            </div>
            <Button variant="ghost" size="sm" onClick={() => copy(bio.personal.join("\n\n"), "personal")} className="absolute right-3 top-3 h-7 w-7 p-0">
              {copied === "personal" ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-soft">
        <CardHeader><CardTitle className="font-serif text-lg">{t.documents.warnings}</CardTitle></CardHeader>
        <CardContent>
          {bio.warnings?.length ? (
            <ul className="space-y-1.5">
              {bio.warnings.map((w, i) => (
                <li key={i} className="rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-400">{w}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">{t.documents.noWarnings}</p>
          )}
          <Badge variant="secondary" className="mt-3 text-xs">{locale === "id" ? t.documents.docLangId : t.documents.docLangEn}</Badge>
        </CardContent>
      </Card>

      {/* Follow-up revision panel */}
      <FollowUpRevisionPanel
        documentId={documentId}
        documentType="bio"
        onRevised={() => window.location.reload()}
      />
    </div>
  )
}
