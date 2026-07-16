"use client"

import { useState } from "react"
import Link from "next/link"
import { Loader2, Sparkles, Download, RefreshCw, ArrowLeft, AlertTriangle, Quote, Copy, Check } from "lucide-react"
import { larasToast } from "@/lib/laras-toast"
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
import type { GeneratedBio } from "@/lib/content-engine"
import { apiClient } from "@/lib/api-client"

export function BioBuilder({ initialProfile }: { initialProfile: SerializedProfile }) {
  const t = useT()

  const [edits, setEdits] = useState({
    fullName: initialProfile.fullName ?? "",
    headline: initialProfile.headline ?? "",
    summary: initialProfile.summary ?? "",
  })
  const [locale, setLocale] = useState<"id" | "en">((initialProfile.docLocale as "id" | "en") || "id")
  const [tone, setTone] = useState(initialProfile.preferredTone || "warm")

  const [loading, setLoading] = useState(false)
  const [bio, setBio] = useState<GeneratedBio | null>(null)
  const [documentId, setDocumentId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("edit")
  const [copied, setCopied] = useState<string | null>(null)

  const hasExperiences = (initialProfile.experiences ?? []).length > 0

  async function generate() {
    setLoading(true); setBio(null)
    try {
      const res = await apiClient("/api/documents/bio/generate", {
        method: "POST",
        body: JSON.stringify({ locale, tone, edits: { ...edits } }),
      })
      const data = await res.json()
      if (!res.ok) { larasToast.error(t.documents.generateError); return }
      setBio(data.bio); setDocumentId(data.documentId); setActiveTab("preview")
      larasToast.success(t.documents.preview)
    } catch { larasToast.error(t.documents.generateError) }
    finally { setLoading(false) }
  }

  function download() {
    if (documentId) window.open(`/api/documents/bio/${documentId}/export`, "_blank")
  }

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key); larasToast.success(t.documents.copied); setTimeout(() => setCopied(null), 2000)
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
        <h1 className="font-serif text-3xl font-semibold tracking-tight">{t.documents.bioNewTitle}</h1>
        <p className="mt-1.5 max-w-2xl text-muted-foreground text-pretty">{t.documents.bioNewSubtitle}</p>
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
          <TabsTrigger value="edit" className="gap-1.5"><Quote className="h-3.5 w-3.5" />{t.documents.editBeforeGenerate}</TabsTrigger>
          <TabsTrigger value="preview" disabled={!bio} className="gap-1.5"><Sparkles className="h-3.5 w-3.5" />{t.documents.preview}</TabsTrigger>
        </TabsList>

        <TabsContent value="edit" className="mt-4">
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <Card className="shadow-soft">
                <CardHeader>
                  <CardTitle className="font-serif text-lg">{t.documents.bioNewTitle}</CardTitle>
                  <CardDescription>{t.documents.editBeforeGenerateDesc}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm">{t.onboarding.fullName}</Label>
                    <Input value={edits.fullName} onChange={(e) => setEdits({ ...edits, fullName: e.target.value })} className="h-10" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">{t.onboarding.headline}</Label>
                    <Input value={edits.headline} onChange={(e) => setEdits({ ...edits, headline: e.target.value })} className="h-10" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">{t.onboarding.summary}</Label>
                    <Textarea rows={3} value={edits.summary} onChange={(e) => setEdits({ ...edits, summary: e.target.value })} />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div>
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
                  <Button onClick={generate} disabled={loading || !hasExperiences} className="w-full shadow-soft" size="lg">
                    {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t.documents.generating}</> : <><Sparkles className="mr-2 h-4 w-4" />{t.documents.generate}</>}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="preview" className="mt-4">
          {bio && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-serif text-xl font-semibold">{t.documents.preview}</h2>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={generate} disabled={loading}>
                    {loading ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="mr-1.5 h-3.5 w-3.5" />}
                    {t.documents.regenerate}
                  </Button>
                  <Button size="sm" onClick={download} className="shadow-soft">
                    <Download className="mr-1.5 h-3.5 w-3.5" />{t.documents.downloadDocx}
                  </Button>
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-3">
                {/* Headline */}
                <BioCard label={t.documents.bioHeadline}>
                  <p className="font-serif text-lg font-medium leading-snug">{bio.headline}</p>
                  <CopyBtn copied={copied === "headline"} onClick={() => copy(bio.headline, "headline")} t={t} />
                </BioCard>
                {/* About */}
                <BioCard label={t.documents.bioAbout}>
                  <p className="text-sm leading-relaxed">{bio.about}</p>
                  <CopyBtn copied={copied === "about"} onClick={() => copy(bio.about, "about")} t={t} />
                </BioCard>
                {/* Personal */}
                <BioCard label={t.documents.bioPersonal} className="lg:col-span-1">
                  <div className="space-y-3">
                    {bio.personal.map((p, i) => <p key={i} className="text-sm leading-relaxed">{p}</p>)}
                  </div>
                  <CopyBtn copied={copied === "personal"} onClick={() => copy(bio.personal.join("\n\n"), "personal")} t={t} />
                </BioCard>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

function BioCard({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <Card className={cn("shadow-soft relative", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="font-serif text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">{children}</CardContent>
    </Card>
  )
}
function CopyBtn({ copied, onClick, t }: { copied: boolean; onClick: () => void; t: any }) {
  return (
    <Button variant="ghost" size="sm" onClick={onClick} className="absolute right-3 top-3 h-7 w-7 p-0">
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
    </Button>
  )
}
