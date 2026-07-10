"use client"

import { useState } from "react"
import Link from "next/link"
import { Loader2, Sparkles, Download, RefreshCw, ArrowLeft, AlertTriangle, PenLine, Copy, Check, HelpCircle } from "lucide-react"
import { toast } from "sonner"
import { useT } from "@/components/providers/locale-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import type { SerializedProfile } from "@/lib/profile"
import type { GeneratedEssay, EssayProbingQuestion } from "@/lib/content-engine"
import { GenerationOverlay } from "@/components/documents/generation-overlay"

type Check = { hasEvidence: boolean; buzzwords: string[] }

export function EssayBuilder({ initialProfile }: { initialProfile: SerializedProfile }) {
  const t = useT()

  const [essayType, setEssayType] = useState("scholarship")
  const [prompt, setPrompt] = useState("")
  const [targetOrg, setTargetOrg] = useState("")
  const [wordLimit, setWordLimit] = useState("")
  const [locale, setLocale] = useState<"id" | "en">((initialProfile.docLocale as "id" | "en") || "id")
  const [tone, setTone] = useState(initialProfile.preferredTone || "warm")
  const [edits, setEdits] = useState({
    fullName: initialProfile.fullName ?? "",
    headline: initialProfile.headline ?? "",
    summary: initialProfile.summary ?? "",
  })

  const [probing, setProbing] = useState<EssayProbingQuestion[]>([])
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [probingLoading, setProbingLoading] = useState(false)

  const [essay, setEssay] = useState<GeneratedEssay | null>(null)
  const [check, setCheck] = useState<Check | null>(null)
  const [documentId, setDocumentId] = useState<string | null>(null)
  const [genLoading, setGenLoading] = useState(false)
  const [genError, setGenError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("setup")
  const [copied, setCopied] = useState(false)

  const essayTypes = [
    { value: "scholarship", label: t.documents.essayTypeScholarship },
    { value: "org", label: t.documents.essayTypeOrg },
    { value: "volunteer", label: t.documents.essayTypeVolunteer },
    { value: "personal-statement", label: t.documents.essayTypePersonal },
    { value: "motivation-letter", label: t.documents.essayTypeMotivation },
  ]
  const toneOptions = [
    { value: "formal", label: t.onboarding.toneFormal },
    { value: "direct", label: t.onboarding.toneDirect },
    { value: "warm", label: t.onboarding.toneWarm },
  ]

  async function generateProbing() {
    setProbingLoading(true)
    setGenError(null)
    try {
      const res = await fetch("/api/documents/essay/probe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale, essayType, prompt, targetOrg }),
      })
      const data = await res.json()
      if (!res.ok) {
        const msg = data?.message || data?.error || t.auth.errGeneric
        setGenError(typeof msg === "string" ? msg : t.auth.errGeneric)
        return
      }
      setProbing(data.questions)
      setAnswers({})
      setActiveTab("probing")
      toast.success(t.documents.essayProbingTitle)
    } catch { setGenError(t.auth.errGeneric) }
    finally { setProbingLoading(false) }
  }

  async function generateDraft() {
    const answered = Object.entries(answers).filter(([, v]) => v.trim()).length
    if (answered === 0) { toast.error(t.documents.essayNoProbing); return }
    setGenLoading(true); setGenError(null); setEssay(null)
    try {
      const probingQA = probing.map((q) => ({ id: q.id, question: q.question, answer: answers[q.id] || "" }))
      const res = await fetch("/api/documents/essay/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale, tone, essayType, prompt, targetOrg, wordLimit, probingQA, edits }),
      })
      const data = await res.json()
      if (!res.ok) {
        const msg = data?.message || data?.error || t.documents.generateError
        setGenError(typeof msg === "string" ? msg : t.documents.generateError)
        return
      }
      setEssay(data.essay); setCheck(data.check); setDocumentId(data.documentId)
      setActiveTab("preview")
      toast.success(t.documents.preview)
    } catch { setGenError(t.documents.generateError) }
    finally { setGenLoading(false) }
  }

  function download() { if (documentId) window.open(`/api/documents/essay/${documentId}/export`, "_blank") }
  function copyAll() {
    if (!essay) return
    const text = [essay.title, "", ...essay.paragraphs].join("\n")
    navigator.clipboard.writeText(text).then(() => { setCopied(true); toast.success(t.documents.copied); setTimeout(() => setCopied(false), 2000) })
  }

  const answeredCount = Object.values(answers).filter((v) => v?.trim()).length

  return (
    <div className="space-y-6 animate-rise">
      <div>
        <Link href="/documents" className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" />{t.documents.backToDocuments}
        </Link>
        <h1 className="font-serif text-3xl font-semibold tracking-tight">{t.documents.essayNewTitle}</h1>
        <p className="mt-1.5 max-w-2xl text-muted-foreground text-pretty">{t.documents.essayNewSubtitle}</p>
      </div>

      <div className="rounded-xl border border-accent/30 bg-accent/5 p-4">
        <p className="flex items-start gap-2 text-sm text-foreground/80 text-pretty">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
          {t.documents.essayProbingDesc}
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="setup" className="gap-1.5"><PenLine className="h-3.5 w-3.5" />{t.documents.editBeforeGenerate}</TabsTrigger>
          <TabsTrigger value="probing" disabled={probing.length === 0} className="gap-1.5"><HelpCircle className="h-3.5 w-3.5" />{t.documents.essayProbingTitle}</TabsTrigger>
          <TabsTrigger value="preview" disabled={!essay} className="gap-1.5"><Sparkles className="h-3.5 w-3.5" />{t.documents.preview}</TabsTrigger>
        </TabsList>

        {/* SETUP */}
        <TabsContent value="setup" className="mt-4">
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-4">
              <Card className="shadow-soft">
                <CardHeader>
                  <CardTitle className="font-serif text-lg">{t.documents.essayNewTitle}</CardTitle>
                  <CardDescription>{t.documents.essayNewSubtitle}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-sm">{t.documents.essayType}</Label>
                      <Select value={essayType} onValueChange={setEssayType}>
                        <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {essayTypes.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm">{t.documents.essayTargetOrg}</Label>
                      <Input value={targetOrg} onChange={(e) => setTargetOrg(e.target.value)} className="h-10" placeholder="Cth: LPDP / BEM FT / Google" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">{t.documents.essayPrompt}</Label>
                    <Textarea rows={4} value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder={t.documents.essayPromptHint} />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-1.5">
                      <Label className="text-sm">{t.documents.essayWordLimit}</Label>
                      <Input type="number" value={wordLimit} onChange={(e) => setWordLimit(e.target.value)} className="h-10" placeholder="500" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm">{t.documents.docLanguage}</Label>
                      <Select value={locale} onValueChange={(v) => setLocale(v as "id" | "en")}>
                        <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="id">{t.documents.docLangId}</SelectItem>
                          <SelectItem value="en">{t.documents.docLangEn}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm">{t.documents.docTone}</Label>
                      <Select value={tone} onValueChange={setTone}>
                        <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {toneOptions.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Inline profile edit (Section 4.2) */}
              <Card className="shadow-soft">
                <CardHeader><CardTitle className="font-serif text-sm">{t.documents.editBeforeGenerate}</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">{t.onboarding.fullName}</Label>
                    <Input value={edits.fullName} onChange={(e) => setEdits({ ...edits, fullName: e.target.value })} className="h-9 text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">{t.onboarding.headline}</Label>
                    <Input value={edits.headline} onChange={(e) => setEdits({ ...edits, headline: e.target.value })} className="h-9 text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">{t.onboarding.summary}</Label>
                    <Textarea rows={2} value={edits.summary} onChange={(e) => setEdits({ ...edits, summary: e.target.value })} className="text-sm" />
                  </div>
                </CardContent>
              </Card>
            </div>
            <div>
              <Card className="shadow-soft sticky top-20">
                <CardHeader><CardTitle className="font-serif text-lg">{t.documents.essayProbingTitle}</CardTitle></CardHeader>
                <CardContent>
                  <Button onClick={generateProbing} disabled={probingLoading} className="w-full shadow-soft" size="lg">
                    {probingLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t.documents.generating}</> : <><HelpCircle className="mr-2 h-4 w-4" />{t.documents.essayGenerateProbing}</>}
                  </Button>
                  <p className="mt-3 text-xs text-muted-foreground">{t.documents.essayProbingDesc}</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* PROBING */}
        <TabsContent value="probing" className="mt-4">
          <div className="mx-auto max-w-2xl space-y-4">
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle className="font-serif text-lg">{t.documents.essayProbingTitle}</CardTitle>
                <CardDescription>{t.documents.essayProbingDesc}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {probing.map((q, i) => (
                  <div key={q.id} className="space-y-2">
                    <div className="flex items-start gap-2.5">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/15 text-xs font-semibold text-accent">{i + 1}</span>
                      <div className="flex-1">
                        <p className="text-sm font-medium leading-snug">{q.question}</p>
                        {q.hint && <p className="mt-0.5 text-xs text-muted-foreground">{t.documents.essayProbingHint}: {q.hint}</p>}
                      </div>
                    </div>
                    <Textarea
                      rows={3}
                      value={answers[q.id] || ""}
                      onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                      className="ml-8.5"
                      placeholder="..."
                    />
                  </div>
                ))}
                <div className="flex items-center justify-between border-t border-border pt-4">
                  <span className="text-xs text-muted-foreground">{answeredCount}/{probing.length} {t.documents.essayProbingTitle.toLowerCase()}</span>
                  <Button onClick={generateDraft} disabled={genLoading || answeredCount === 0} className="shadow-soft" size="sm">
                    {genLoading ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />{t.documents.generating}</> : <><Sparkles className="mr-1.5 h-3.5 w-3.5" />{t.documents.essayGenerateDraft}</>}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* PREVIEW */}
        <TabsContent value="preview" className="mt-4">
          {essay && check && (
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h2 className="font-serif text-xl font-semibold">{t.documents.preview}</h2>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={copyAll}>
                      {copied ? <Check className="mr-1.5 h-3.5 w-3.5" /> : <Copy className="mr-1.5 h-3.5 w-3.5" />}
                      {t.documents.copyToClipboard}
                    </Button>
                    <Button variant="outline" size="sm" onClick={generateDraft} disabled={genLoading}>
                      {genLoading ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="mr-1.5 h-3.5 w-3.5" />}
                      {t.documents.regenerate}
                    </Button>
                    <Button size="sm" onClick={download} className="shadow-soft">
                      <Download className="mr-1.5 h-3.5 w-3.5" />{t.documents.downloadDocx}
                    </Button>
                  </div>
                </div>
                <div className="overflow-hidden rounded-xl border border-border bg-white p-8 shadow-lift sm:p-12" style={{ fontFamily: "Calibri, Arial, sans-serif" }}>
                  <h2 className="mb-6 font-serif text-xl font-bold text-neutral-900">{essay.title}</h2>
                  {essay.paragraphs.map((p, i) => <p key={i} className="mb-4 text-sm leading-relaxed text-neutral-800">{p}</p>)}
                </div>
              </div>
              <div className="space-y-6">
                <Card className="shadow-soft sticky top-20">
                  <CardHeader><CardTitle className="font-serif text-lg">{t.documents.preview}</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between rounded-lg border border-border p-3">
                      <span className="text-sm text-muted-foreground">{t.documents.essayWordCount}</span>
                      <span className={cn("font-serif text-lg font-semibold", essay.wordCount >= 250 ? "text-emerald-600" : "text-amber-600")}>{essay.wordCount}</span>
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
                    {essay.warnings?.length > 0 && (
                      <div>
                        <p className="mb-1.5 text-xs font-medium text-muted-foreground">{t.documents.warnings}</p>
                        <ul className="space-y-1">
                          {essay.warnings.map((w, i) => <li key={i} className="rounded border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-400">{w}</li>)}
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
        loading={genLoading || probingLoading}
        error={genError}
        onRetry={() => {
          setGenError(null)
          if (probingLoading) generateProbing()
          else if (genLoading) generateDraft()
        }}
        onCancel={() => { setGenError(null); setGenLoading(false); setProbingLoading(false) }}
        locale={locale}
      />
    </div>
  )
}
