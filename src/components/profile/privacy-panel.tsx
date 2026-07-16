"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  Globe2,
  Users,
  Lock,
  Loader2,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { larasToast } from "@/lib/laras-toast"
import { cn } from "@/lib/utils"
import { apiClient } from "@/lib/api-client"

type Visibility = "public" | "connections" | "private"
type ConsentField =
  | "fullName"
  | "email"
  | "phone"
  | "location"
  | "links"
  | "experiences"
  | "education"
  | "skills"
  | "certifications"
  | "languages"

interface ConsentEntry {
  field: ConsentField
  visibility: Visibility
}

interface PrivacyPanelLabels {
  title: string
  desc: string
  public: string
  publicDesc: string
  connections: string
  connectionsDesc: string
  private: string
  privateDesc: string
  fieldFullName: string
  fieldEmail: string
  fieldPhone: string
  fieldLocation: string
  fieldLinks: string
  fieldExperiences: string
  fieldEducation: string
  fieldSkills: string
  fieldCertifications: string
  fieldLanguages: string
  saved: string
  error: string
  summary: string
  publicCount: string
  connectionsCount: string
  privateCount: string
}

const VIS_OPTIONS: { value: Visibility; icon: LucideIcon }[] = [
  { value: "public", icon: Globe2 },
  { value: "connections", icon: Users },
  { value: "private", icon: Lock },
]

const VIS_STYLE: Record<Visibility, { active: string; icon: string }> = {
  public: { active: "bg-chart-2 text-white", icon: "text-chart-2" },
  connections: { active: "bg-chart-1 text-white", icon: "text-chart-1" },
  private: { active: "bg-muted-foreground text-white", icon: "text-muted-foreground" },
}

export function PrivacyPanel({
  initialEntries,
  labels,
}: {
  initialEntries: ConsentEntry[]
  labels: PrivacyPanelLabels
}) {
  const [entries, setEntries] = useState<ConsentEntry[]>(initialEntries)
  const [savingField, startSave] = useTransition()
  const router = useRouter()

  const labelForField = (f: ConsentField): string =>
    ({
      fullName: labels.fieldFullName,
      email: labels.fieldEmail,
      phone: labels.fieldPhone,
      location: labels.fieldLocation,
      links: labels.fieldLinks,
      experiences: labels.fieldExperiences,
      education: labels.fieldEducation,
      skills: labels.fieldSkills,
      certifications: labels.fieldCertifications,
      languages: labels.fieldLanguages,
    })[f]

  const labelForVis = (v: Visibility): string =>
    v === "public" ? labels.public : v === "connections" ? labels.connections : labels.private

  const counts = entries.reduce(
    (acc, e) => {
      acc[e.visibility]++
      return acc
    },
    { public: 0, connections: 0, private: 0 } as Record<Visibility, number>
  )

  const handleChange = (field: ConsentField, visibility: Visibility) => {
    const oldVisibility = entries.find((e) => e.field === field)?.visibility
    if (oldVisibility === visibility) return
    // Optimistic update
    setEntries((prev) => prev.map((e) => (e.field === field ? { ...e, visibility } : e)))
    startSave(async () => {
      try {
        const res = await apiClient("/api/profile/privacy", {
          method: "PATCH",
          body: JSON.stringify({ field, visibility }),
        })
        if (!res.ok) throw new Error("failed")
        larasToast.success(labels.saved)
        router.refresh()
      } catch {
        // Revert on failure to the previous visibility
        setEntries((prev) =>
          prev.map((e) => (e.field === field ? { ...e, visibility: oldVisibility ?? "private" } : e))
        )
        larasToast.error(labels.error)
      }
    })
  }

  return (
    <Card className="shadow-soft">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 font-serif text-base">
              <ShieldCheck className="h-4 w-4 text-primary" />
              {labels.title}
            </CardTitle>
            <CardDescription className="mt-0.5 text-xs">{labels.desc}</CardDescription>
          </div>
          {/* Visibility summary */}
          <div className="flex items-center gap-3 text-xs">
            <SummaryPill icon={Globe2} label={labels.publicCount} count={counts.public} className="text-chart-2" />
            <SummaryPill icon={Users} label={labels.connectionsCount} count={counts.connections} className="text-chart-1" />
            <SummaryPill icon={Lock} label={labels.privateCount} count={counts.private} className="text-muted-foreground" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {entries.map((entry) => (
          <div
            key={entry.field}
            className="flex flex-col gap-2 rounded-lg border border-border bg-card/50 p-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium">{labelForField(entry.field)}</p>
              <p className="text-[11px] text-muted-foreground">
                {labelForVis(entry.visibility)}
              </p>
            </div>
            {/* Segmented control */}
            <div className="inline-flex shrink-0 rounded-lg border border-border bg-muted/40 p-0.5">
              {VIS_OPTIONS.map((opt) => {
                const Icon = opt.icon
                const active = entry.visibility === opt.value
                const style = VIS_STYLE[opt.value]
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleChange(entry.field, opt.value)}
                    title={labelForVis(opt.value)}
                    className={cn(
                      "inline-flex h-7 w-7 items-center justify-center rounded-md transition-all",
                      active ? style.active : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </button>
                )
              })}
            </div>
          </div>
        ))}
        {savingField && (
          <p className="flex items-center gap-1.5 pt-1 text-[11px] text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            {labels.saved}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

function SummaryPill({
  icon: Icon,
  label,
  count,
  className,
}: {
  icon: typeof Globe2
  label: string
  count: number
  className: string
}) {
  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      <Icon className="h-3 w-3" />
      <span className="font-semibold tabular-nums">{count}</span>
      <span className="hidden text-muted-foreground sm:inline">{label}</span>
    </span>
  )
}
