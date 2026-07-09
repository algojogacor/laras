"use client"

import { useState, useMemo } from "react"
import { Settings2, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react"
import { useT } from "@/components/providers/locale-provider"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  type GenerationConfig,
  type OutputFormat,
  type DocLocale,
  type TargetRegion,
  type Tone,
  type Density,
  type EvidenceRequirement,
  type CreativityLevel,
  type AntiHallucinationStrictness,
  validateConfig,
} from "@/lib/generation-config"

/**
 * Reusable configuration panel for ALL generate flows (Brief Task 1).
 * Props control which options are shown (e.g. slideCount only for Deck).
 * The config genuinely affects LLM prompts, renderers, and exports.
 */
export function ConfigPanel({
  config,
  onChange,
  showLength = true,
  showTemplate = false,
  templates = [],
  showSlideCount = false,
  showWordCount = true,
  showSections = false,
  sectionOptions = [],
}: {
  config: GenerationConfig
  onChange: (config: GenerationConfig) => void
  showLength?: boolean
  showTemplate?: boolean
  templates?: { id: string; name: string }[]
  showSlideCount?: boolean
  showWordCount?: boolean
  showSections?: boolean
  sectionOptions?: string[]
}) {
  const t = useT()
  const [expanded, setExpanded] = useState(false)
  const warnings = useMemo(() => validateConfig(config), [config])

  function update<K extends keyof GenerationConfig>(key: K, value: GenerationConfig[K]) {
    onChange({ ...config, [key]: value })
  }

  const tones: { value: Tone; label: string }[] = [
    { value: "formal", label: "Formal" },
    { value: "warm", label: t.onboarding.toneWarm },
    { value: "confident", label: t.onboarding.toneDirect },
    { value: "concise", label: "Concise" },
    { value: "persuasive", label: "Persuasive" },
    { value: "academic", label: "Academic" },
    { value: "professional", label: "Professional" },
  ]

  const densities: { value: Density; label: string }[] = [
    { value: "compact", label: "Compact" },
    { value: "normal", label: "Normal" },
    { value: "detailed", label: "Detailed" },
    { value: "very-detailed", label: "Very Detailed" },
  ]

  const regions: { value: TargetRegion; label: string }[] = [
    { value: "indonesia", label: t.onboarding.regionDomestic },
    { value: "global", label: "Global" },
    { value: "us", label: "US" },
    { value: "uk", label: "UK" },
    { value: "custom", label: "Custom" },
  ]

  return (
    <Card className="shadow-soft">
      <CardHeader className="pb-3">
        <CardTitle className="font-serif text-sm font-medium flex items-center gap-2">
          <Settings2 className="h-4 w-4 text-primary" />
          {t.documents.editBeforeGenerate}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Core config: language, region, tone */}
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label className="text-xs">{t.documents.docLanguage}</Label>
            <Select value={config.docLocale} onValueChange={(v) => update("docLocale", v as DocLocale)}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="id">{t.documents.docLangId}</SelectItem>
                <SelectItem value="en">{t.documents.docLangEn}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{t.documents.docRegion}</Label>
            <Select value={config.targetRegion} onValueChange={(v) => update("targetRegion", v as TargetRegion)}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {regions.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{t.documents.docTone}</Label>
            <Select value={config.tone} onValueChange={(v) => update("tone", v as Tone)}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {tones.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Density + evidence requirement */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Density</Label>
            <Select value={config.density} onValueChange={(v) => update("density", v as Density)}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {densities.map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Evidence requirement</Label>
            <Select value={config.evidenceRequirement} onValueChange={(v) => update("evidenceRequirement", v as EvidenceRequirement)}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="strict-numbers">Strict (numbers required)</SelectItem>
                <SelectItem value="balanced">Balanced</SelectItem>
                <SelectItem value="narrative-ok">Narrative OK</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Length controls */}
        {showLength && (
          <div className="grid gap-3 sm:grid-cols-3">
            {showWordCount && (
              <div className="space-y-1.5">
                <Label className="text-xs">Word count target</Label>
                <Input
                  type="number"
                  value={config.wordCount ?? ""}
                  onChange={(e) => update("wordCount", e.target.value ? Number(e.target.value) : undefined)}
                  className="h-9"
                  placeholder="auto"
                />
              </div>
            )}
            {showSlideCount && (
              <div className="space-y-1.5">
                <Label className="text-xs">Slide count</Label>
                <Input
                  type="number"
                  value={config.slideCount ?? ""}
                  onChange={(e) => update("slideCount", e.target.value ? Number(e.target.value) : undefined)}
                  className="h-9"
                  placeholder="6"
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs">Bullet count per exp.</Label>
              <Input
                type="number"
                value={config.bulletCount ?? ""}
                onChange={(e) => update("bulletCount", e.target.value ? Number(e.target.value) : undefined)}
                className="h-9"
                placeholder="3"
              />
            </div>
          </div>
        )}

        {/* Template picker */}
        {showTemplate && templates.length > 0 && (
          <div className="space-y-1.5">
            <Label className="text-xs">Template / theme</Label>
            <Select value={config.template} onValueChange={(v) => update("template", v)}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {templates.map((tp) => <SelectItem key={tp.id} value={tp.id}>{tp.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Advanced settings (collapsible) */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          Advanced settings
        </button>

        {expanded && (
          <div className="space-y-3 rounded-lg border border-border p-3">
            {/* AI behavior */}
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Creativity</Label>
                <Select value={config.creativity} onValueChange={(v) => update("creativity", v as CreativityLevel)}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low (safe)</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High (creative)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Anti-hallucination</Label>
                <Select value={config.antiHallucination} onValueChange={(v) => update("antiHallucination", v as AntiHallucinationStrictness)}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="strict">Strict</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="lenient">Lenient</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Save as</Label>
                <Select
                  value={config.saveAsNewVersion ? "new" : "overwrite"}
                  onValueChange={(v) => update("saveAsNewVersion", v === "new")}
                >
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">New version</SelectItem>
                    <SelectItem value="overwrite">Overwrite current</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Target context */}
            <div className="space-y-1.5">
              <Label className="text-xs">Target job/org/scholarship context</Label>
              <Input
                value={config.targetJobOrg ?? ""}
                onChange={(e) => update("targetJobOrg", e.target.value)}
                className="h-9"
                placeholder="e.g. Social Media Specialist at Tokopedia"
              />
            </div>

            {/* Additional instruction */}
            <div className="space-y-1.5">
              <Label className="text-xs">Additional instruction</Label>
              <Textarea
                rows={2}
                value={config.additionalInstruction ?? ""}
                onChange={(e) => update("additionalInstruction", e.target.value)}
                placeholder="e.g. Focus on leadership experience, avoid mentioning GPA"
              />
            </div>

            {/* Export filename */}
            <div className="space-y-1.5">
              <Label className="text-xs">Export filename (optional)</Label>
              <Input
                value={config.exportFilename ?? ""}
                onChange={(e) => update("exportFilename", e.target.value)}
                className="h-9"
                placeholder="auto-generated"
              />
            </div>
          </div>
        )}

        {/* Warnings */}
        {warnings.length > 0 && (
          <div className="space-y-1.5">
            {warnings.map((w, i) => (
              <div key={i} className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-400">
                <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                <span>{w}</span>
              </div>
            ))}
          </div>
        )}

        {/* Config summary badge */}
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="secondary" className="text-[10px]">{config.docLocale.toUpperCase()}</Badge>
          <Badge variant="secondary" className="text-[10px]">{config.tone}</Badge>
          <Badge variant="secondary" className="text-[10px]">{config.density}</Badge>
          {config.wordCount && <Badge variant="secondary" className="text-[10px]">{config.wordCount}w</Badge>}
          {config.slideCount && <Badge variant="secondary" className="text-[10px]">{config.slideCount} slides</Badge>}
        </div>
      </CardContent>
    </Card>
  )
}
