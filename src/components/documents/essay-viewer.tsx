"use client"

import Link from "next/link"
import { useState } from "react"
import { Download, ArrowLeft, Calendar, Copy, Check } from "lucide-react"
import { toast } from "sonner"
import type { Dictionary } from "@/lib/i18n/dictionary"
import type { SerializedProfile } from "@/lib/profile"
import type { GeneratedEssay } from "@/lib/content-engine"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export function EssayViewer({ documentId, title, essay, profile, locale, updatedAt, version, dict }: {
  documentId: string; title: string; essay: GeneratedEssay; profile: SerializedProfile; locale: "id" | "en"; updatedAt: Date; version: number; dict: Dictionary
}) {
  const t = dict
  const [copied, setCopied] = useState(false)
  function copyAll() {
    const text = [essay.title, "", ...essay.paragraphs].join("\n")
    navigator.clipboard.writeText(text).then(() => { setCopied(true); toast.success(t.documents.copied); setTimeout(() => setCopied(false), 2000) })
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
              <span>{t.documents.version} {version}</span><span>·</span>
              <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{new Date(updatedAt).toLocaleDateString()}</span>
              <span>·</span><span>{essay.wordCount} {t.documents.essayWordCount.toLowerCase()}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={copyAll}>{copied ? <Check className="mr-1.5 h-4 w-4" /> : <Copy className="mr-1.5 h-4 w-4" />}{t.documents.copyToClipboard}</Button>
            <Button size="sm" onClick={() => window.open(`/api/documents/essay/${documentId}/export`, "_blank")} className="shadow-soft"><Download className="mr-1.5 h-4 w-4" />{t.documents.downloadDocx}</Button>
          </div>
        </div>
      </div>
      <div className="overflow-hidden rounded-xl border border-border bg-white p-8 shadow-lift sm:p-12" style={{ fontFamily: "Calibri, Arial, sans-serif" }}>
        <h2 className="mb-6 font-serif text-xl font-bold text-neutral-900">{essay.title}</h2>
        {essay.paragraphs.map((p, i) => <p key={i} className="mb-4 text-sm leading-relaxed text-neutral-800">{p}</p>)}
      </div>
      {essay.probingQA?.length > 0 && (
        <Card className="shadow-soft">
          <CardHeader><CardTitle className="font-serif text-lg">{t.documents.essayProbingTitle}</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {essay.probingQA.map((qa) => (
                <li key={qa.id} className="rounded-lg border border-border p-3">
                  <p className="text-sm font-medium">{qa.question}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{qa.answer}</p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
      <Card className="shadow-soft">
        <CardHeader><CardTitle className="font-serif text-lg">{t.documents.warnings}</CardTitle></CardHeader>
        <CardContent>
          {essay.warnings?.length ? (
            <ul className="space-y-1.5">{essay.warnings.map((w, i) => <li key={i} className="rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-400">{w}</li>)}</ul>
          ) : <p className="text-sm text-muted-foreground">{t.documents.noWarnings}</p>}
          <Badge variant="secondary" className="mt-3 text-xs">{locale === "id" ? t.documents.docLangId : t.documents.docLangEn}</Badge>
        </CardContent>
      </Card>
    </div>
  )
}
