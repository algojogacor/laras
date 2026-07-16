"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, Printer, Eye } from "lucide-react"
import { larasToast } from "@/lib/laras-toast"
import { useT } from "@/components/providers/locale-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import type { SerializedProfile } from "@/lib/profile"
import { TEMPLATES } from "@/components/documents/cv-visual/templates"

export function CVVisualBuilder({ initialProfile }: { initialProfile: SerializedProfile }) {
  const t = useT()
  const [selected, setSelected] = useState<string>("modern-minimal")
  const [edits, setEdits] = useState({
    fullName: initialProfile.fullName ?? "",
    headline: initialProfile.headline ?? "",
    summary: initialProfile.summary ?? "",
    email: initialProfile.email ?? "",
    phone: initialProfile.phone ?? "",
    location: initialProfile.location ?? "",
  })
  const ActiveTemplate = TEMPLATES.find((tp) => tp.id === selected)?.Component ?? TEMPLATES[0].Component
  const editedProfile = { ...initialProfile, ...edits }

  function printPDF() {
    larasToast.success(t.documents.downloadPdf || "Print")
    setTimeout(() => window.print(), 300)
  }

  return (
    <div className="space-y-6 animate-rise print:block print:space-y-0">
      <div className="print:hidden">
        <Link href="/documents" className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" />{t.documents.backToDocuments}
        </Link>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="font-serif text-3xl font-semibold tracking-tight">{t.documents.title}</h1>
            <p className="mt-1.5 text-muted-foreground">{t.documents.subtitle}</p>
          </div>
          <Button onClick={printPDF} size="sm" className="shadow-soft">
            <Printer className="mr-1.5 h-4 w-4" />{t.documents.downloadPdf}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-4 print:block">
        {/* Template picker + inline edit */}
        <div className="space-y-3 print:hidden">
          <h2 className="font-serif text-sm font-medium text-muted-foreground">{t.documents.editBeforeGenerate}</h2>
          {TEMPLATES.map((tp) => (
            <button
              key={tp.id}
              onClick={() => setSelected(tp.id)}
              className={cn(
                "w-full rounded-xl border p-3 text-left transition-all",
                selected === tp.id ? "border-primary bg-primary/5 shadow-soft" : "border-border hover:border-primary/30 hover:bg-secondary"
              )}
            >
              <div className="flex items-center justify-between">
                <span className="font-serif text-sm font-semibold">{tp.name}</span>
                {selected === tp.id && <Eye className="h-3.5 w-3.5 text-primary" />}
              </div>
              <p className="mt-0.5 text-[11px] text-muted-foreground">{tp.desc}</p>
            </button>
          ))}

          {/* Inline edit section (Section 4.2) */}
          <Card className="shadow-soft">
            <CardContent className="space-y-3 p-3">
              <p className="text-xs font-medium text-muted-foreground">{t.documents.editBeforeGenerateDesc}</p>
              <div className="space-y-1.5">
                <Label className="text-[11px]">{t.onboarding.fullName}</Label>
                <Input value={edits.fullName} onChange={(e) => setEdits({ ...edits, fullName: e.target.value })} className="h-8 text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px]">{t.onboarding.headline}</Label>
                <Input value={edits.headline} onChange={(e) => setEdits({ ...edits, headline: e.target.value })} className="h-8 text-xs" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label className="text-[11px]">{t.onboarding.email}</Label>
                  <Input value={edits.email} onChange={(e) => setEdits({ ...edits, email: e.target.value })} className="h-8 text-xs" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px]">{t.onboarding.phone}</Label>
                  <Input value={edits.phone} onChange={(e) => setEdits({ ...edits, phone: e.target.value })} className="h-8 text-xs" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px]">{t.onboarding.location}</Label>
                <Input value={edits.location} onChange={(e) => setEdits({ ...edits, location: e.target.value })} className="h-8 text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px]">{t.onboarding.summary}</Label>
                <Textarea rows={2} value={edits.summary} onChange={(e) => setEdits({ ...edits, summary: e.target.value })} className="text-xs" />
              </div>
              <p className="text-[10px] text-muted-foreground">
                {t.profile.experience}: {initialProfile.experiences.length} · {t.profile.skills}: {initialProfile.skills.length}
              </p>
              <Button asChild variant="outline" size="sm" className="w-full">
                <Link href="/profile">{t.profile.edit}</Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Preview */}
        <div className="lg:col-span-3 print:block">
          <div className="overflow-hidden rounded-xl border border-border bg-muted/30 p-4 print:border-0 print:bg-white print:p-0 sm:p-8">
            <div className="print:block">
              <ActiveTemplate profile={editedProfile} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
