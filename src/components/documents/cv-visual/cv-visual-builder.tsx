"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, Printer, Eye } from "lucide-react"
import { toast } from "sonner"
import { useT } from "@/components/providers/locale-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { SerializedProfile } from "@/lib/profile"
import { TEMPLATES } from "@/components/documents/cv-visual/templates"

export function CVVisualBuilder({ initialProfile }: { initialProfile: SerializedProfile }) {
  const t = useT()
  const [selected, setSelected] = useState<string>("modern-minimal")
  const ActiveTemplate = TEMPLATES.find((tp) => tp.id === selected)?.Component ?? TEMPLATES[0].Component

  function printPDF() {
    toast.success(t.documents.downloadPdf || "Print")
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
        {/* Template picker */}
        <div className="space-y-3 print:hidden">
          <h2 className="font-serif text-sm font-medium text-muted-foreground">{t.documents.editBeforeGenerate}</h2>
          {TEMPLATES.map((tp) => {
            const Icon = tp.Component
            return (
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
            )
          })}
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

        {/* Preview */}
        <div className="lg:col-span-3 print:block">
          <div className="overflow-hidden rounded-xl border border-border bg-muted/30 p-4 print:border-0 print:bg-white print:p-0 sm:p-8">
            <div className="print:block">
              <ActiveTemplate profile={initialProfile} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
