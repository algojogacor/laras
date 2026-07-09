"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, Download, Monitor, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { useT } from "@/components/providers/locale-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { SerializedProfile } from "@/lib/profile"
import { THEMES } from "@/lib/deck-renderer"

export function DeckBuilder({ initialProfile }: { initialProfile: SerializedProfile }) {
  const t = useT()
  const [theme, setTheme] = useState("forest")
  const [downloading, setDownloading] = useState(false)

  const slides = [
    { n: 1, title: "Cover", desc: t.profile.basics },
    { n: 2, title: "About Me", desc: t.profile.summary },
    { n: 3, title: "Timeline", desc: t.profile.experience },
    { n: 4, title: "Skills", desc: t.profile.skills },
    { n: 5, title: "Project Highlights", desc: t.profile.experience },
    { n: 6, title: "Contact", desc: t.profile.basics },
  ]

  async function download() {
    setDownloading(true)
    try {
      window.location.href = `/api/documents/deck/export?theme=${theme}`
      toast.success(t.documents.downloadDocx)
    } catch {
      toast.error(t.auth.errGeneric)
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
            <h1 className="font-serif text-3xl font-semibold tracking-tight">Personal Deck</h1>
            <p className="mt-1.5 max-w-2xl text-muted-foreground text-pretty">6-slide presentation: Cover, About Me, Timeline, Skills, Project Highlights, Contact. Exports as a real .pptx.</p>
          </div>
          <Button onClick={download} disabled={downloading} size="sm" className="shadow-soft">
            {downloading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Download className="mr-1.5 h-4 w-4" />}
            {t.documents.downloadDocx}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Theme picker */}
        <div className="space-y-3">
          <h2 className="font-serif text-sm font-medium text-muted-foreground">Theme</h2>
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
                  <p className="font-serif text-sm font-semibold" style={{ color: `#${tp.bg}` }}>{tp.name}</p>
                  <p className="text-[10px] text-muted-foreground">{tp.fontHead}</p>
                </div>
              </div>
            </button>
          ))}
          <Card className="shadow-soft">
            <CardContent className="p-3">
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                {t.profile.experience}: {initialProfile.experiences.length} · {t.profile.skills}: {initialProfile.skills.length} · {t.profile.education}: {initialProfile.educations.length}
              </p>
              <Button asChild variant="outline" size="sm" className="mt-2 w-full">
                <Link href="/profile">{t.profile.edit}</Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Slide outline preview */}
        <div className="lg:col-span-2">
          <div className="grid gap-3 sm:grid-cols-2">
            {slides.map((s) => (
              <Card key={s.n} className="overflow-hidden shadow-soft">
                <CardContent className="p-0">
                  {/* mini slide preview */}
                  <div
                    className="relative flex h-32 items-end p-3"
                    style={{ background: `#${THEMES.find((tp) => tp.id === theme)?.bg}`, color: `#${THEMES.find((tp) => tp.id === theme)?.text}` }}
                  >
                    <div className="absolute left-0 top-0 h-full w-1" style={{ background: `#${THEMES.find((tp) => tp.id === theme)?.accent}` }} />
                    <div>
                      <p className="text-[10px] opacity-60">{t.documents.version} {s.n}</p>
                      <p className="font-serif text-base font-bold" style={{ fontFamily: "Georgia, serif" }}>{s.title}</p>
                    </div>
                  </div>
                  <div className="p-3">
                    <p className="text-xs text-muted-foreground">{s.desc}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
            <Monitor className="h-4 w-4 shrink-0" />
            <span>Opens cleanly in PowerPoint &amp; LibreOffice Impress. Smart layout re-adjusts based on your profile data.</span>
          </div>
        </div>
      </div>
    </div>
  )
}
