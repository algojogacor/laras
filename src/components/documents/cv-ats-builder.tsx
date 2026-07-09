"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Loader2, Sparkles, Download, RefreshCw, ArrowLeft, AlertTriangle, Wand2 } from "lucide-react"
import { toast } from "sonner"
import { useT } from "@/components/providers/locale-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import type { SerializedProfile } from "@/lib/profile"
import type { GeneratedCVATS } from "@/lib/content-engine"
import { CVATSPreview } from "@/components/documents/cv-ats-preview"
import { ConcretenessPanel } from "@/components/documents/concreteness-panel"

type Check = {
  score: number; totalBullets: number; withEvidence: number; buzzwordNoEvidence: number
  flagged: string[]; summaryHasEvidence: boolean; verdict: "good" | "fair" | "weak"
}

export function CVATSBuilder({ initialProfile }: { initialProfile: SerializedProfile }) {
  const t = useT()
  const router = useRouter()

  // Edit-before-generate local state (edits applied on top of profile, not saved to profile)
  const [edits, setEdits] = useState({
    fullName: initialProfile.fullName ?? "",
    headline: initialProfile.headline ?? "",
    email: initialProfile.email ?? "",
    phone: initialProfile.phone ?? "",
    location: initialProfile.location ?? "",
    summary: initialProfile.summary ?? "",
  })
  const [locale, setLocale] = useState<"id" | "en">((initialProfile.docLocale as "id" | "en") || "id")
  const [tone, setTone] = useState(initialProfile.preferredTone || "warm")
  const [region, setRegion] = useState(initialProfile.targetRegion || "domestic")

  const [loading, setLoading] = useState(false)
  const [cv, setCv] = useState<GeneratedCVATS | null>(null)
  const [check, setCheck] = useState<Check | null>(null)
  const [documentId, setDocumentId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("edit")

  const hasExperiences = (initialProfile.experiences ?? []).length > 0

  async function generate() {
    setLoading(true)
    setCv(null)
    try {
      const res = await fetch("/api/documents/cv-ats/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locale, tone, region,
          edits: {
            fullName: edits.fullName, headline: edits.headline, email: edits.email,
            phone: edits.phone, location: edits.location, summary: edits.summary,
          },
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(t.documents.generateError)
        return
      }
      setCv(data.cv)
      setCheck(data.check)
      setDocumentId(data.documentId)
      setActiveTab("preview")
      toast.success(t.documents.preview)
    } catch {
      toast.error(t.documents.generateError)
    } finally {
      setLoading(false)
    }
  }

  function downloadDocx() {
    if (!documentId) return
    window.open(`/api/documents/cv-ats/${documentId}/export`, "_blank")
  }

  const toneOptions = [
    { value: "formal", label: t.onboarding.toneFormal },
    { value: "direct", label: t.onboarding.toneDirect },
    { value: "warm", label: t.onboarding.toneWarm },
  ]
  const regionOptions = [
    { value: "domestic", label: t.onboarding.regionDomestic },
    { value: "international", label: t.onboarding.regionInternational },
  ]

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
        <h1 className="font-serif text-3xl font-semibold tracking-tight">{t.documents.cvAtsNewTitle}</h1>
        <p className="mt-1.5 max-w-2xl text-muted-foreground text-pretty">{t.documents.cvAtsNewSubtitle}</p>
      </div>

      {!hasExperiences && (
        <Card className="border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40">
          <CardContent className="flex items-center gap-3 p-4">
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
            <p className="flex-1 text-sm text-amber-800 dark:text-amber-400">{t.documents.needExperiences}</p>
            <Button asChild variant="outline" size="sm">
              <Link href="/profile">{t.documents.completeProfileFirst}</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="edit" className="gap-1.5">
            <Wand2 className="h-3.5 w-3.5" />
            {t.documents.editBeforeGenerate}
          </TabsTrigger>
          <TabsTrigger value="preview" disabled={!cv} className="gap-1.5">
            <Sparkles className="h-3.5 w-3.5" />
            {t.documents.preview}
          </TabsTrigger>
        </TabsList>

        {/* ── Edit tab ── */}
        <TabsContent value="edit" className="mt-4">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Editable basics */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="shadow-soft">
                <CardHeader>
                  <CardTitle className="font-serif text-lg">{t.documents.editBeforeGenerate}</CardTitle>
                  <CardDescription>{t.documents.editBeforeGenerateDesc}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-sm">{t.onboarding.fullName}</Label>
                      <Input value={edits.fullName} onChange={(e) => setEdits({ ...edits, fullName: e.target.value })} className="h-10" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm">{t.onboarding.headline}</Label>
                      <Input value={edits.headline} onChange={(e) => setEdits({ ...edits, headline: e.target.value })} className="h-10" />
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-1.5">
                      <Label className="text-sm">{t.onboarding.email}</Label>
                      <Input value={edits.email} onChange={(e) => setEdits({ ...edits, email: e.target.value })} className="h-10" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm">{t.onboarding.phone}</Label>
                      <Input value={edits.phone} onChange={(e) => setEdits({ ...edits, phone: e.target.value })} className="h-10" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm">{t.onboarding.location}</Label>
                      <Input value={edits.location} onChange={(e) => setEdits({ ...edits, location: e.target.value })} className="h-10" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">{t.onboarding.summary}</Label>
                    <Textarea rows={3} value={edits.summary} onChange={(e) => setEdits({ ...edits, summary: e.target.value })} />
                  </div>
                </CardContent>
              </Card>

              {/* Read-only experiences (edit in profile) */}
              <Card className="shadow-soft">
                <CardHeader>
                  <CardTitle className="font-serif text-lg">{t.documents.sectionExperience}</CardTitle>
                  <CardDescription>{t.profile.experience} — {initialProfile.experiences.length}</CardDescription>
                </CardHeader>
                <CardContent>
                  {initialProfile.experiences.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t.documents.needExperiences}</p>
                  ) : (
                    <ul className="space-y-3">
                      {initialProfile.experiences.map((e) => (
                        <li key={e.id} className="rounded-lg border border-border p-3">
                          <p className="text-sm font-medium">{e.title} — {e.organization}</p>
                          <p className="text-xs text-muted-foreground">{e.startDate} → {e.current ? t.documents.present : e.endDate}</p>
                          {e.contextNotes && (
                            <p className="mt-1 text-xs italic text-muted-foreground/80">"{e.contextNotes.slice(0, 120)}{e.contextNotes.length > 120 ? "…" : ""}"</p>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                  <Button asChild variant="outline" size="sm" className="mt-3">
                    <Link href="/profile">{t.profile.edit}</Link>
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Config sidebar */}
            <div className="space-y-6">
              <Card className="shadow-soft sticky top-20">
                <CardHeader>
                  <CardTitle className="font-serif text-lg">{t.documents.preview}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">{t.documents.docLanguage}</Label>
                    <RadioGroup value={locale} onValueChange={(v) => setLocale(v as "id" | "en")} className="grid grid-cols-2 gap-2">
                      {[{ value: "id", label: t.documents.docLangId }, { value: "en", label: t.documents.docLangEn }].map((o) => (
                        <label key={o.value} className={cn("flex cursor-pointer items-center gap-2 rounded-lg border p-2.5 text-sm transition-colors", locale === o.value ? "border-primary bg-primary/5" : "border-border hover:bg-secondary")}>
                          <RadioGroupItem value={o.value} />
                          {o.label}
                        </label>
                      ))}
                    </RadioGroup>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">{t.documents.docTone}</Label>
                    <RadioGroup value={tone} onValueChange={setTone} className="space-y-1.5">
                      {toneOptions.map((o) => (
                        <label key={o.value} className={cn("flex cursor-pointer items-center gap-2 rounded-lg border p-2.5 text-sm transition-colors", tone === o.value ? "border-primary bg-primary/5" : "border-border hover:bg-secondary")}>
                          <RadioGroupItem value={o.value} />
                          {o.label}
                        </label>
                      ))}
                    </RadioGroup>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">{t.documents.docRegion}</Label>
                    <RadioGroup value={region} onValueChange={setRegion} className="space-y-1.5">
                      {regionOptions.map((o) => (
                        <label key={o.value} className={cn("flex cursor-pointer items-center gap-2 rounded-lg border p-2.5 text-sm transition-colors", region === o.value ? "border-primary bg-primary/5" : "border-border hover:bg-secondary")}>
                          <RadioGroupItem value={o.value} />
                          {o.label}
                        </label>
                      ))}
                    </RadioGroup>
                  </div>

                  <Button onClick={generate} disabled={loading || !hasExperiences} className="w-full shadow-soft" size="lg">
                    {loading ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t.documents.generating}</>
                    ) : (
                      <><Sparkles className="mr-2 h-4 w-4" />{t.documents.generate}</>
                    )}
                  </Button>
                  <p className="text-center text-xs text-muted-foreground">
                    {t.documents.editBeforeGenerateDesc}
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ── Preview tab ── */}
        <TabsContent value="preview" className="mt-4">
          {cv && check && (
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Preview */}
              <div className="lg:col-span-2">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h2 className="font-serif text-xl font-semibold">{t.documents.preview}</h2>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={generate} disabled={loading}>
                      {loading ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="mr-1.5 h-3.5 w-3.5" />}
                      {t.documents.regenerate}
                    </Button>
                    <Button size="sm" onClick={downloadDocx} className="shadow-soft">
                      <Download className="mr-1.5 h-3.5 w-3.5" />
                      {t.documents.downloadDocx}
                    </Button>
                  </div>
                </div>
                <div className="overflow-hidden rounded-xl border border-border bg-muted/30 p-4 sm:p-8 scrollbar-laras max-h-[80vh] overflow-y-auto">
                  <CVATSPreview profile={{ ...initialProfile, ...edits }} cv={cv} locale={locale} />
                </div>
              </div>

              {/* Quality sidebar */}
              <div className="space-y-6">
                <Card className="shadow-soft sticky top-20">
                  <CardHeader>
                    <CardTitle className="font-serif text-lg">{t.documents.concretenessScore}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ConcretenessPanel check={check} />
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
