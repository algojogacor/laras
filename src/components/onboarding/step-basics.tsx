"use client"

import { useT } from "@/components/providers/locale-provider"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { WizardState } from "./types"

export function StepBasics({
  state,
  update,
}: {
  state: WizardState
  update: <K extends keyof WizardState>(key: K, value: WizardState[K]) => void
}) {
  const t = useT()
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t.onboarding.fullName}>
          <Input
            value={state.fullName}
            onChange={(e) => update("fullName", e.target.value)}
            placeholder={t.onboarding.fullName}
            autoComplete="name"
          />
        </Field>
        <Field label={t.onboarding.headline} hint={t.onboarding.headlineHint}>
          <Input
            value={state.headline}
            onChange={(e) => update("headline", e.target.value)}
            placeholder={t.onboarding.headlineHint}
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t.onboarding.email}>
          <Input
            type="email"
            value={state.email}
            onChange={(e) => update("email", e.target.value)}
            placeholder="you@email.com"
            autoComplete="email"
          />
        </Field>
        <Field label={t.onboarding.phone}>
          <Input
            value={state.phone}
            onChange={(e) => update("phone", e.target.value)}
            placeholder="+62 ..."
            autoComplete="tel"
          />
        </Field>
      </div>

      <Field label={t.onboarding.location}>
        <Input
          value={state.location}
          onChange={(e) => update("location", e.target.value)}
          placeholder="Jakarta, Indonesia"
          autoComplete="address-level2"
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t.onboarding.linkedin}>
          <Input
            value={state.linkedin}
            onChange={(e) => update("linkedin", e.target.value)}
            placeholder="https://linkedin.com/in/..."
            inputMode="url"
          />
        </Field>
        <Field label={t.onboarding.portfolio}>
          <Input
            value={state.portfolio}
            onChange={(e) => update("portfolio", e.target.value)}
            placeholder="https://..."
            inputMode="url"
          />
        </Field>
      </div>

      <Field label={t.onboarding.summary} hint={t.onboarding.summaryHint}>
        <Textarea
          value={state.summary}
          onChange={(e) => update("summary", e.target.value)}
          placeholder={t.onboarding.summaryHint}
          rows={4}
        />
      </Field>
    </div>
  )
}

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}
