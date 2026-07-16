"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Loader2, Globe2, PenLine, UserCog, Check } from "lucide-react"
import { toast } from "sonner"
import { apiClient } from "@/lib/api-client"
import { useT, useLocale } from "@/components/providers/locale-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import type { SerializedProfile } from "@/lib/profile"

export function SettingsForm({ initialProfile }: { initialProfile: SerializedProfile }) {
  const t = useT()
  const { setLocale } = useLocale()
  const router = useRouter()

  const [uiLocale, setUiLocale] = useState(initialProfile.uiLocale || "id")
  const [docLocale, setDocLocale] = useState(initialProfile.docLocale || "id")
  const [targetRegion, setTargetRegion] = useState(initialProfile.targetRegion || "domestic")
  const [preferredTone, setPreferredTone] = useState(initialProfile.preferredTone || "warm")
  const [urgency, setUrgency] = useState(initialProfile.urgency || "exploring")
  const [opportunityTypes, setOpportunityTypes] = useState<string[]>(initialProfile.opportunityTypes || [])
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    try {
      const res = await apiClient("/api/profile", {
        method: "PUT",
        body: JSON.stringify({
          fullName: initialProfile.fullName,
          headline: initialProfile.headline,
          summary: initialProfile.summary,
          email: initialProfile.email,
          phone: initialProfile.phone,
          location: initialProfile.location,
          links: initialProfile.links,
          uiLocale, docLocale, targetRegion, preferredTone, urgency, opportunityTypes,
          // pass through relations unchanged
          experiences: initialProfile.experiences,
          skills: initialProfile.skills,
          educations: initialProfile.educations,
          certifications: initialProfile.certifications,
          languages: initialProfile.languages,
        }),
      })
      if (!res.ok) throw new Error()
      // If UI locale changed, update the live locale too
      if (uiLocale !== initialProfile.uiLocale) {
        setLocale(uiLocale as "id" | "en")
      }
      toast.success(t.settings.saved)
      router.refresh()
    } catch {
      toast.error(t.auth.errGeneric)
    } finally {
      setSaving(false)
    }
  }

  function toggleOpp(value: string) {
    setOpportunityTypes((prev) => prev.includes(value) ? prev.filter((x) => x !== value) : [...prev, value])
  }

  const opps = [
    { value: "work", label: t.onboarding.opWork },
    { value: "org", label: t.onboarding.opOrg },
    { value: "scholarship", label: t.onboarding.opScholarship },
    { value: "volunteer", label: t.onboarding.opVolunteer },
  ]
  const tones = [
    { value: "formal", label: t.settings.toneFormal },
    { value: "direct", label: t.settings.toneDirect },
    { value: "warm", label: t.settings.toneWarm },
  ]
  const urgencies = [
    { value: "deadline-soon", label: t.onboarding.urgencyDeadline },
    { value: "active", label: t.onboarding.urgencyActive },
    { value: "exploring", label: t.onboarding.urgencyExploring },
  ]

  return (
    <div className="space-y-6 animate-rise max-w-3xl">
      <div>
        <h1 className="font-serif text-3xl font-semibold tracking-tight">{t.settings.title}</h1>
        <p className="mt-1.5 text-muted-foreground">{t.settings.subtitle}</p>
      </div>

      {/* Language & Region */}
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="font-serif text-lg flex items-center gap-2">
            <Globe2 className="h-4 w-4 text-primary" />{t.settings.language}
          </CardTitle>
          <CardDescription>{t.settings.languageDesc}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label className="text-sm font-medium">{t.settings.uiLocale}</Label>
            <RadioGroup value={uiLocale} onValueChange={setUiLocale} className="grid gap-2 sm:grid-cols-2">
              {[{ value: "id", label: t.documents.docLangId }, { value: "en", label: t.documents.docLangEn }].map((o) => (
                <label key={o.value} className={cn("flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm transition-colors", uiLocale === o.value ? "border-primary bg-primary/5" : "border-border hover:bg-secondary")}>
                  <RadioGroupItem value={o.value} />{o.label}
                </label>
              ))}
            </RadioGroup>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">{t.settings.docLocale}</Label>
            <RadioGroup value={docLocale} onValueChange={setDocLocale} className="grid gap-2 sm:grid-cols-2">
              {[{ value: "id", label: t.documents.docLangId }, { value: "en", label: t.documents.docLangEn }].map((o) => (
                <label key={o.value} className={cn("flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm transition-colors", docLocale === o.value ? "border-primary bg-primary/5" : "border-border hover:bg-secondary")}>
                  <RadioGroupItem value={o.value} />{o.label}
                </label>
              ))}
            </RadioGroup>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">{t.settings.targetRegion}</Label>
            <RadioGroup value={targetRegion} onValueChange={setTargetRegion} className="grid gap-2 sm:grid-cols-2">
              {[{ value: "domestic", label: t.settings.regionDomestic }, { value: "international", label: t.settings.regionInternational }].map((o) => (
                <label key={o.value} className={cn("flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm transition-colors", targetRegion === o.value ? "border-primary bg-primary/5" : "border-border hover:bg-secondary")}>
                  <RadioGroupItem value={o.value} />{o.label}
                </label>
              ))}
            </RadioGroup>
          </div>
        </CardContent>
      </Card>

      {/* Style & Goals */}
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="font-serif text-lg flex items-center gap-2">
            <PenLine className="h-4 w-4 text-primary" />{t.settings.writing}
          </CardTitle>
          <CardDescription>{t.settings.writingDesc}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label className="text-sm font-medium">{t.settings.preferredTone}</Label>
            <RadioGroup value={preferredTone} onValueChange={setPreferredTone} className="grid gap-2 sm:grid-cols-3">
              {tones.map((o) => (
                <label key={o.value} className={cn("flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm transition-colors", preferredTone === o.value ? "border-primary bg-primary/5" : "border-border hover:bg-secondary")}>
                  <RadioGroupItem value={o.value} />{o.label}
                </label>
              ))}
            </RadioGroup>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">{t.settings.urgency}</Label>
            <RadioGroup value={urgency} onValueChange={setUrgency} className="grid gap-2 sm:grid-cols-3">
              {urgencies.map((o) => (
                <label key={o.value} className={cn("flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm transition-colors", urgency === o.value ? "border-primary bg-primary/5" : "border-border hover:bg-secondary")}>
                  <RadioGroupItem value={o.value} />{o.label}
                </label>
              ))}
            </RadioGroup>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">{t.settings.opportunityTypes}</Label>
            <div className="flex flex-wrap gap-2">
              {opps.map((o) => {
                const active = opportunityTypes.includes(o.value)
                return (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => toggleOpp(o.value)}
                    className={cn("rounded-full border px-4 py-2 text-sm font-medium transition-all", active ? "border-primary bg-primary text-primary-foreground shadow-soft" : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground")}
                  >
                    {active && <Check className="mr-1.5 inline h-3.5 w-3.5" />}
                    {o.label}
                  </button>
                )
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Account */}
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="font-serif text-lg flex items-center gap-2">
            <UserCog className="h-4 w-4 text-primary" />{t.settings.account}
          </CardTitle>
          <CardDescription>{t.settings.accountDesc}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <p className="text-sm font-medium">{t.profile.export}</p>
              <p className="text-xs text-muted-foreground">{t.profile.exportDesc}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => window.open("/api/export", "_blank")}>{t.profile.export}</Button>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-destructive/30 p-3">
            <div>
              <p className="text-sm font-medium text-destructive">{t.profile.delete}</p>
              <p className="text-xs text-muted-foreground">{t.profile.deleteConfirm}</p>
            </div>
            <Button asChild variant="outline" size="sm" className="border-destructive/40 text-destructive hover:bg-destructive/10">
              <Link href="/profile">{t.profile.delete}</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Save bar */}
      <div className="sticky bottom-4 flex justify-end">
        <Button onClick={save} disabled={saving} size="sm" className="shadow-lift">
          {saving ? <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" />{t.settings.saving}</> : t.settings.save}
        </Button>
      </div>
    </div>
  )
}
