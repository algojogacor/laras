"use client"

import { useState } from "react"
import Link from "next/link"
import { Loader2, Sparkles, Download, RefreshCw, ArrowLeft, AlertTriangle, Mail, Copy, Check } from "lucide-react"
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
import type { GeneratedCoverLetter } from "@/lib/content-engine"
import { GenerationOverlay } from "@/components/documents/generation-overlay"

type Check = { hasEvidence: boolean; buzzwords: string[] }

export function CoverLetterBuilder({ initialProfile }: { initialProfile: SerializedProfile }) {
  const t = useT()

  const [edits, setEdits] = useState({
    fullName: initialProfile.fullName ?? "",
    headline: initialProfile.headline ?? "",
    email: initialProfile.email ?? "",
    phone: initialProfile.phone ?? "",
    location: initialProfile.location ?? "",
    summary: initialProfile.summary ?? "",
  })
  const [position, setPosition] = useState("")
  const [organization, setOrganization] = useState("")
  const [locale, setLocale] = useState<"id" | "en">((initialProfile.docLocale as "id" | "en") || "id")
  const [tone, setTone] = useState(initialProfile.preferredTone || "warm")

  const [loading, setLoading] = useState(false)
  const [genError, setGenError] = useState<string | null>(null)
  const [cl, setCl] = useState<GeneratedCoverLetter | null>(null)
  const [check, setCheck] = useState<Check | null>(null)
  const [documentId, setDocumentId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("edit")
  const [copied, setCopied] = useState(false)
  const [regenerating, setRegenerating] = useState(false)

  const hasExperiences = (initialProfile.experiences ?? []).length > 0

  async function generate(isRegen = false) {
    if (isRegen) setRegenerating(true); else setLoading(true)
    setGenError(null)
    setCl(null)
    try {
      const res = await fetch("/api/documents/cover-letter/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locale, tone, region: initialProfile.targetRegion || "domestic",
          position, organization,
          edits: { ...edits },
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        const msg = data?.message || data?.error || t.documents.generateError
        setGenError(typeof msg === "string" ? msg : t.documents.generateError)
        return
      }
      setCl(data.cl); setCheck(data.check); setDocumentId(data.documentId)
      setActiveTab("preview")
      toast.success(t.documents.preview)
    } catch {
      setGenError(t.documents.generateError)
    } finally {
      setLoading(false); setRegenerating(false)
    }
  }

  function download() {
    if (documentId) window.open(`/api/documents/cover-letter/${documentId}/export`, "_blank")
  }

  function copyAll() {
    if (!cl) return
    const text = [cl.recipientGreeting, "", ...cl.paragraphs, "", cl.closing, "", edits.fullName].join("\n")
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true); toast.success(t.documents.copied); setTimeout(() => setCopied(false), 2000)
    })
  }

  const toneOptions = [
    { value: "formal", label: t.onboarding.toneFormal },
    { value: "direct", label: t.onboarding.toneDirect },
    { value: "warm", label: t.onboarding.toneWarm },
  ]

  return (
    <div className="space-y-6 animate-rise">
      <div>
        <Link href="/documents" className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" />{t.documents.backToDocuments}
        </Link>
        <h1 className="font-serif text-3xl font-semibold tracking-tight">{t.documents.clNewTitle}</h1>
        <p className="mt-1.5 max-w-2xl text-muted-foreground text-pretty">{t.documents.clNewSubtitle}</p>
      </div>

      {!hasExperiences && (
        <Card className="border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40">
          <CardContent className="flex items-center gap-3 p-4">
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
            <p className="flex-1 text-sm text-amber-800 dark:text-amber-400">{t.documents.needExperiences}</p>
            <Button asChild variant="outline" size="sm"><Link href="/profile">{t.documents.completeProfileFirst}</Link></Button>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="edit" className="gap-1.5"><Mail className="h-3.5 w-3.5" />{t.documents.editBeforeGenerate}</TabsTrigger>
          <TabsTrigger value="preview" disabled={!cl} className="gap-1.5"><Sparkles className="h-3.5 w-3.5" />{t.documents.preview}</TabsTrigger>
        </TabsList>

        <TabsContent value="edit" className="mt-4">
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              <Card className="shadow-soft">
                <CardHeader>
                  <CardTitle className="font-serif text-lg">{t.documents.clNewTitle}</CardTitle>
                  <CardDescription>{t.documents.editBeforeGenerateDesc}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-sm">{t.documents.clPosition}</Label>
                      <Input value={position} onChange={(e) => setPosition(e.target.value)} placeholder={t.documents.clPositionHint} className="h-10" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm">{t.documents.clOrganization}</Label>
                      <Input value={organization} onChange={(e) => setOrganization(e.target.value)} placeholder={t.documents.clOrgHint} className="h-10" />
                    </div>
                  </div>
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
                  <div className="space-y-1.5">
                    <Label className="text-sm">{t.onboarding.summary}</Label>
                    <Textarea rows={3} value={edits.summary} onChange={(e) => setEdits({ ...edits, summary: e.target.value })} />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="shadow-soft sticky top-20">
                <CardHeader><CardTitle className="font-serif text-lg">{t.documents.preview}</CardTitle></CardHeader>
                <CardContent className="space-y-5">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">{t.documents.docLanguage}</Label>
                    <RadioGroup value={locale} onValueChange={(v) => setLocale(v as "id" | "en")} className="grid grid-cols-2 gap-2">
                      {[{ value: "id", label: t.documents.docLangId }, { value: "en", label: t.documents.docLangEn }].map((o) => (
                        <label key={o.value} className={cn("flex cursor-pointer items-center gap-2 rounded-lg border p-2.5 text-sm transition-colors", locale === o.value ? "border-primary bg-primary/5" : "border-border hover:bg-secondary")}>
                          <RadioGroupItem value={o.value} />{o.label}
                        </label>
                      ))}
                    </RadioGroup>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">{t.documents.docTone}</Label>
                    <RadioGroup value={tone} onValueChange={setTone} className="space-y-1.5">
                      {toneOptions.map((o) => (
                        <label key={o.value} className={cn("flex cursor-pointer items-center gap-2 rounded-lg border p-2.5 text-sm transition-colors", tone === o.value ? "border-primary bg-primary/5" : "border-border hover:bg-secondary")}>
                          <RadioGroupItem value={o.value} />{o.label}
                        </label>
                      ))}
                    </RadioGroup>
                  </div>
                  <Button onClick={() => generate(false)} disabled={loading || !hasExperiences} className="w-full shadow-soft" size="lg">
                    {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t.documents.generating}</> : <><Sparkles className="mr-2 h-4 w-4" />{t.documents.generate}</>}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="preview" className="mt-4">
          {cl && check && (
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h2 className="font-serif text-xl font-semibold">{t.documents.preview}</h2>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={copyAll}>
                      {copied ? <Check className="mr-1.5 h-3.5 w-3.5" /> : <Copy className="mr-1.5 h-3.5 w-3.5" />}
                      {t.documents.copyToClipboard}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => generate(true)} disabled={regenerating}>
                      {regenerating ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="mr-1.5 h-3.5 w-3.5" />}
                      {t.documents.regenerate}
                    </Button>
                    <Button size="sm" onClick={download} className="shadow-soft">
                      <Download className="mr-1.5 h-3.5 w-3.5" />{t.documents.downloadDocx}
                    </Button>
                  </div>
                </div>
                <div className="overflow-hidden rounded-xl border border-border bg-white p-8 shadow-lift sm:p-12" style={{ fontFamily: "Calibri, Arial, sans-serif", minHeight: "297mm" }}>
                  <div className="mb-6 border-b border-neutral-200 pb-4">
                    <p className="text-sm font-bold text-neutral-900">{edits.fullName}</p>
                    <p className="text-xs text-neutral-600">{[edits.email, edits.phone, edits.location].filter(Boolean).join("  |  ")}</p>
                  </div>
                  <p className="mb-4 text-sm text-neutral-800">{cl.recipientGreeting}</p>
                  {cl.paragraphs.map((p, i) => (
                    <p key={i} className="mb-4 text-sm leading-relaxed text-neutral-800">{p}</p>
                  ))}
                  <p className="mt-6 text-sm text-neutral-800">{cl.closing}</p>
                  <p className="mt-6 text-sm font-bold text-neutral-900">{edits.fullName}</p>
                </div>
              </div>

              <div className="space-y-6">
                <Card className="shadow-soft sticky top-20">
                  <CardHeader><CardTitle className="font-serif text-lg">{t.documents.preview}</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between rounded-lg border border-border p-3">
                      <span className="text-sm text-muted-foreground">{t.documents.clWordCount}</span>
                      <span className={cn("font-serif text-lg font-semibold", cl.wordCount >= 250 && cl.wordCount <= 380 ? "text-emerald-600" : "text-amber-600")}>{cl.wordCount}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg border border-border p-3">
                      <span className="text-sm text-muted-foreground">{t.documents.bulletsWithEvidence}</span>
                      <span className={cn("font-serif text-lg font-semibold", check.hasEvidence ? "text-emerald-600" : "text-amber-600")}>{check.hasEvidence ? "✓" : "—"}</span>
                    </div>
                    {check.buzzwords.length > 0 && (
                      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/40">
                        <p className="text-xs font-medium text-amber-800 dark:text-amber-400">{t.documents.buzzwordWarnings}</p>
                        <ul className="mt-1 flex flex-wrap gap-1">
                          {check.buzzwords.map((b) => <li key={b} className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-800 dark:bg-amber-900/60 dark:text-amber-400">{b}</li>)}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <GenerationOverlay
        loading={loading || regenerating}
        error={genError}
        onRetry={() => { setGenError(null); generate(regenerating) }}
        onCancel={() => { setGenError(null); setLoading(false); setRegenerating(false) }}
        locale={locale}
      />
    </div>
  )
}
