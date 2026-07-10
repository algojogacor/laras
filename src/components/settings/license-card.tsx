"use client"

import { Crown, Sparkles, Check, Lock, ArrowUp } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { FeatureKey } from "@/lib/entitlement"

export interface LicenseCardProps {
  plan: "free" | "pro" | "org"
  status: "active" | "expired" | "suspended" | "cancelled" | "none"
  expiresAt: string | null
  labels: {
    yourPlan: string
    currentPlan: string
    planDesc: string
    planDescPro: string
    planDescOrg: string
    featuresIncluded: string
    featDocUnlimited: string
    featVisualCv: string
    featInterviewUnlimited: string
    featEnglishAdvanced: string
    featPrioritySupport: string
    upgradeTitle: string
    upgradeDesc: string
    contactAdmin: string
    locked: string
    expiresAt: string
    noExpiry: string
  }
}

const ALL_FEATURES: { key: FeatureKey; labelKey: keyof LicenseCardProps["labels"] }[] = [
  { key: "documents.unlimited", labelKey: "featDocUnlimited" },
  { key: "documents.visual_cv", labelKey: "featVisualCv" },
  { key: "interview.unlimited", labelKey: "featInterviewUnlimited" },
  { key: "english.advanced", labelKey: "featEnglishAdvanced" },
  { key: "support.priority", labelKey: "featPrioritySupport" },
]

export function LicenseCard({ plan, status, expiresAt, labels }: LicenseCardProps) {
  const isFree = plan === "free"
  const planDesc = plan === "org" ? labels.planDescOrg : plan === "pro" ? labels.planDescPro : labels.planDesc

  const grantedFeatures = new Set<FeatureKey>(
    plan === "free"
      ? []
      : ["documents.unlimited", "documents.visual_cv", "interview.unlimited", "english.advanced", "support.priority"]
  )

  const planStyle =
    plan === "org"
      ? "from-primary/10 to-transparent border-primary/20"
      : plan === "pro"
        ? "from-chart-1/10 to-transparent border-chart-1/20"
        : "from-muted/50 to-transparent border-border"

  const PlanIcon = plan === "free" ? Sparkles : Crown

  return (
    <Card className={cn("relative overflow-hidden border shadow-soft", planStyle)}>
      {/* Gradient wash */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br opacity-50" aria-hidden />
      <CardHeader className="relative pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 font-serif text-base">
            <PlanIcon className={cn("h-4 w-4", plan === "free" ? "text-muted-foreground" : "text-primary")} />
            {labels.yourPlan}
          </CardTitle>
          <Badge
            variant="outline"
            className={cn(
              "border-0 capitalize",
              plan === "org"
                ? "bg-primary/15 text-primary"
                : plan === "pro"
                  ? "bg-chart-1/15 text-chart-1"
                  : "bg-muted text-muted-foreground"
            )}
          >
            {plan.toUpperCase()}
          </Badge>
        </div>
        <CardDescription className="text-xs">{planDesc}</CardDescription>
      </CardHeader>
      <CardContent className="relative space-y-4">
        {/* Status + expiry */}
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1 capitalize">
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                status === "active" ? "bg-chart-2" : status === "none" ? "bg-muted-foreground/40" : "bg-chart-4"
              )}
            />
            {status === "none" ? "implicit" : status}
          </span>
          {expiresAt && (
            <span>
              {labels.expiresAt}: {new Date(expiresAt).toLocaleDateString()}
            </span>
          )}
          {!expiresAt && !isFree && (
            <span>{labels.noExpiry}</span>
          )}
        </div>

        {/* Features list */}
        <div>
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {labels.featuresIncluded}
          </p>
          <ul className="space-y-1.5">
            {ALL_FEATURES.map((f) => {
              const granted = grantedFeatures.has(f.key)
              const label = labels[f.labelKey]
              return (
                <li key={f.key} className="flex items-center gap-2 text-sm">
                  {granted ? (
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-chart-2/15 text-chart-2">
                      <Check className="h-3 w-3" strokeWidth={3} />
                    </span>
                  ) : (
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-muted text-muted-foreground">
                      <Lock className="h-2.5 w-2.5" />
                    </span>
                  )}
                  <span className={cn(granted ? "text-foreground" : "text-muted-foreground line-through")}>
                    {label}
                  </span>
                </li>
              )
            })}
          </ul>
        </div>

        {/* Upgrade nudge for free tier */}
        {isFree && (
          <div className="rounded-lg border border-dashed border-primary/30 bg-primary/[0.03] p-3">
            <div className="flex items-start gap-2">
              <ArrowUp className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div>
                <p className="text-sm font-medium text-foreground">{labels.upgradeTitle}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{labels.upgradeDesc}</p>
                <p className="mt-1.5 text-xs text-primary">{labels.contactAdmin}</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
