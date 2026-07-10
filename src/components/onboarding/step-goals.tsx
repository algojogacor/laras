"use client"

import { useT } from "@/components/providers/locale-provider"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { cn } from "@/lib/utils"
import {
  type OppType,
  type PreferredTone,
  type TargetRegion,
  type Urgency,
  type WizardState,
} from "./types"

export function StepGoals({
  state,
  update,
}: {
  state: WizardState
  update: <K extends keyof WizardState>(key: K, value: WizardState[K]) => void
}) {
  const t = useT()

  const oppOptions: { value: OppType; label: string }[] = [
    { value: "work", label: t.onboarding.opWork },
    { value: "org", label: t.onboarding.opOrg },
    { value: "scholarship", label: t.onboarding.opScholarship },
    { value: "volunteer", label: t.onboarding.opVolunteer },
  ]

  const toggleOpp = (v: OppType) => {
    const exists = state.opportunityTypes.includes(v)
    update(
      "opportunityTypes",
      exists
        ? state.opportunityTypes.filter((x) => x !== v)
        : [...state.opportunityTypes, v]
    )
  }

  return (
    <div className="space-y-8">
      {/* Opportunity types */}
      <section className="space-y-3">
        <Label className="text-sm font-medium">
          {t.onboarding.opportunityTypes}
        </Label>
        <div className="flex flex-wrap gap-2">
          {oppOptions.map((o) => {
            const active = state.opportunityTypes.includes(o.value)
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => toggleOpp(o.value)}
                aria-pressed={active}
                className={cn(
                  "rounded-full border px-4 py-2 text-sm font-medium transition-all",
                  active
                    ? "border-primary bg-primary text-primary-foreground shadow-xs"
                    : "border-border bg-background text-foreground hover:border-primary/40 hover:bg-secondary"
                )}
              >
                {o.label}
              </button>
            )
          })}
        </div>
      </section>

      {/* Target region */}
      <section className="space-y-3">
        <Label className="text-sm font-medium">{t.onboarding.targetRegion}</Label>
        <RadioGroup
          value={state.targetRegion}
          onValueChange={(v) => update("targetRegion", v as TargetRegion)}
          className="grid gap-2 sm:grid-cols-2"
        >
          <RadioCard value="domestic" label={t.onboarding.regionDomestic} />
          <RadioCard
            value="international"
            label={t.onboarding.regionInternational}
          />
        </RadioGroup>
      </section>

      {/* Urgency */}
      <section className="space-y-3">
        <Label className="text-sm font-medium">{t.onboarding.urgency}</Label>
        <RadioGroup
          value={state.urgency}
          onValueChange={(v) => update("urgency", v as Urgency)}
          className="grid gap-2 sm:grid-cols-3"
        >
          <RadioCard value="deadline-soon" label={t.onboarding.urgencyDeadline} />
          <RadioCard value="active" label={t.onboarding.urgencyActive} />
          <RadioCard value="exploring" label={t.onboarding.urgencyExploring} />
        </RadioGroup>
      </section>

      {/* Preferred tone */}
      <section className="space-y-3">
        <Label className="text-sm font-medium">{t.onboarding.preferredTone}</Label>
        <RadioGroup
          value={state.preferredTone}
          onValueChange={(v) => update("preferredTone", v as PreferredTone)}
          className="grid gap-2 sm:grid-cols-3"
        >
          <RadioCard value="formal" label={t.onboarding.toneFormal} />
          <RadioCard value="direct" label={t.onboarding.toneDirect} />
          <RadioCard value="warm" label={t.onboarding.toneWarm} />
        </RadioGroup>
      </section>
    </div>
  )
}

function RadioCard({ value, label }: { value: string; label: string }) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-card p-3 text-sm transition-all hover:border-primary/40 hover:bg-secondary/40",
        "has-[:checked]:border-primary has-[:checked]:bg-primary/5 has-[:checked]:shadow-soft"
      )}
    >
      <RadioGroupItem value={value} />
      <span className="font-medium">{label}</span>
    </label>
  )
}
