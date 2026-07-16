"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Download, Monitor, Loader2 } from "lucide-react"
import { larasToast } from "@/lib/laras-toast"
import { useLocale } from "@/components/providers/locale-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import type { SerializedProfile } from "@/lib/profile"
import { ARTIFACT_TEMPLATES } from "@/lib/artifacts/templates"
import { apiClient } from "@/lib/api-client"

const THEMES = ARTIFACT_TEMPLATES.map((template) => ({
  id: template.id,
  name: template.name,
  bg: template.light.background,
  accent: template.light.accent,
  text: template.light.ink,
  fontHead: template.fonts.heading,
}))

export function DeckBuilder({ initialProfile }: { initialProfile: SerializedProfile }) {
  const { t, locale } = useLocale()
  const router = useRouter()
  const [theme, setTheme] = useState("professional-minimal")
  const [downloading, setDownloading] = useState(false)
  const [edits, setEdits] = useState({
    fullName: initialProfile.fullName ?? "",
    headline: initialProfile.headline ?? "",
    summary: initialProfile.summary ?? "",
  })

  const narrative = [
    { title: t.documents.studio.narrativeCover, desc: t.profile.basics },
    { title: t.documents.studio.narrativeSummary, desc: t.profile.summary },
    { title: t.documents.studio.narrativeTimeline, desc: t.profile.experience },
    { title: t.documents.studio.narrativeEvidence, desc: t.documents.studio.contentAware },
  ]

  async function download() {
    setDownloading(true)
    try {
      const response = await apiClient("/api/artifacts", { method: "POST", body: JSON.stringify({ themeFamily: theme, edits }) })
      if (!response.ok) throw new Error("create-failed")
      const body = await response.json()
      larasToast.success(t.documents.studio.saved)
      router.push(`/documents/${body.documentId}/studio`)
    } catch {
      larasToast.error(t.auth.errGeneric)
    } finally {
      setTimeout(() => setDownloading(false), 1500)
    }
  }

  return (
    <div className="space-y-6 animate-rise">
      <div>
        <Link href="/documents" className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" />{t.documents.backToDocuments}
        </Link>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="font-serif text-3xl font-semibold tracking-tight">{t.documents.studio.personalDeck}</h1>
            <p className="mt-1.5 max-w-2xl text-muted-foreground text-pretty">{t.documents.studio.personalDeckDesc}</p>
          </div>
          <Button onClick={download} disabled={downloading} size="sm" className="shadow-soft">
            {downloading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Download className="mr-1.5 h-4 w-4" />}
            {t.documents.studio.newDeck}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Theme picker */}
        <div className="space-y-3">
          <h2 className="font-serif text-sm font-medium text-muted-foreground">{t.documents.studio.template}</h2>
          {THEMES.map((tp) => (
            <button
              key={tp.id}
              onClick={() => setTheme(tp.id)}
              className={cn("w-full rounded-xl border p-3 text-left transition-all", theme === tp.id ? "border-primary bg-primary/5 shadow-soft" : "border-border hover:border-primary/30 hover:bg-secondary")}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ background: `#${tp.bg}`, border: `2px solid #${tp.accent}` }}>
                  <span className="h-2 w-2 rounded-full" style={{ background: `#${tp.accent}` }} />
                </div>
                <div>
                  <p className="font-serif text-sm font-semibold" style={{ color: `#${tp.bg}` }}>{tp.name[locale]}</p>
                  <p className="text-[10px] text-muted-foreground">{tp.fontHead}</p>
                </div>
              </div>
            </button>
          ))}
          {/* Inline edit section (Section 4.2) */}
          <Card className="shadow-soft">
            <CardContent className="space-y-3 p-3">
              <p className="text-xs font-medium text-muted-foreground">{t.documents.editBeforeGenerate}</p>
              <div className="space-y-1.5">
                <Label className="text-[11px]">{t.onboarding.fullName}</Label>
                <Input value={edits.fullName} onChange={(e) => setEdits({ ...edits, fullName: e.target.value })} className="h-8 text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px]">{t.onboarding.headline}</Label>
                <Input value={edits.headline} onChange={(e) => setEdits({ ...edits, headline: e.target.value })} className="h-8 text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px]">{t.onboarding.summary}</Label>
                <Textarea rows={2} value={edits.summary} onChange={(e) => setEdits({ ...edits, summary: e.target.value })} className="text-xs" />
              </div>
              <p className="text-[10px] text-muted-foreground">
                {t.profile.experience}: {initialProfile.experiences.length} · {t.profile.skills}: {initialProfile.skills.length} · {t.profile.education}: {initialProfile.educations.length}
              </p>
              <Button asChild variant="outline" size="sm" className="w-full">
                <Link href="/profile">{t.profile.edit}</Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Slide outline preview */}
        <div className="lg:col-span-2">
          <div className="grid gap-3 sm:grid-cols-2">
            {narrative.map((section, index) => (
              <Card key={section.title} className="overflow-hidden shadow-soft">
                <CardContent className="p-0">
                  {/* mini slide preview */}
                  <div
                    className="relative flex h-32 items-end p-3"
                    style={{ background: `#${THEMES.find((tp) => tp.id === theme)?.bg}`, color: `#${THEMES.find((tp) => tp.id === theme)?.text}` }}
                  >
                    <div className="absolute left-0 top-0 h-full w-1" style={{ background: `#${THEMES.find((tp) => tp.id === theme)?.accent}` }} />
                    <div>
                      <p className="text-[10px] opacity-60">{t.documents.studio.narrativeSection} {index + 1}</p>
                      <p className="font-serif text-base font-bold" style={{ fontFamily: "Georgia, serif" }}>{section.title}</p>
                    </div>
                  </div>
                  <div className="p-3">
                    <p className="text-xs text-muted-foreground">{section.desc}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
            <Monitor className="h-4 w-4 shrink-0" />
            <span>{t.documents.studio.compatibilityNote}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
