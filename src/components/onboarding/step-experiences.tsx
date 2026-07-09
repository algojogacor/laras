"use client"

import { useT } from "@/components/providers/locale-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus, Trash2 } from "lucide-react"
import {
  emptyExperience,
  type ExperienceInput,
  type ExpType,
  type WizardState,
} from "./types"

export function StepExperiences({
  state,
  update,
}: {
  state: WizardState
  update: <K extends keyof WizardState>(key: K, value: WizardState[K]) => void
}) {
  const t = useT()

  const setItem = (id: string, patch: Partial<ExperienceInput>) => {
    update(
      "experiences",
      state.experiences.map((e) => (e.id === id ? { ...e, ...patch } : e))
    )
  }
  const remove = (id: string) =>
    update(
      "experiences",
      state.experiences.filter((e) => e.id !== id)
    )
  const add = () =>
    update("experiences", [...state.experiences, emptyExperience()])

  return (
    <div className="space-y-4">
      {state.experiences.length === 0 && (
        <p className="rounded-lg border border-dashed border-border bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
          {t.onboarding.s2Desc}
        </p>
      )}

      {state.experiences.map((e, i) => (
        <div
          key={e.id}
          className="rounded-xl border border-border bg-card p-4 shadow-soft sm:p-5"
        >
          <div className="mb-3 flex items-center justify-between">
            <span className="font-serif text-sm font-semibold text-muted-foreground">
              #{i + 1}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => remove(e.id)}
              className="text-destructive hover:bg-destructive/5 hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
              {t.common.delete}
            </Button>
          </div>

          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-[1fr_2fr]">
              <div className="space-y-1.5">
                <Label>{t.onboarding.expType}</Label>
                <Select
                  value={e.type}
                  onValueChange={(v) => setItem(e.id, { type: v as ExpType })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="work">{t.onboarding.expTypeWork}</SelectItem>
                    <SelectItem value="org">{t.onboarding.expTypeOrg}</SelectItem>
                    <SelectItem value="project">{t.onboarding.expTypeProject}</SelectItem>
                    <SelectItem value="volunteer">{t.onboarding.expTypeVolunteer}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{t.onboarding.expTitle}</Label>
                <Input
                  value={e.title}
                  onChange={(ev) => setItem(e.id, { title: ev.target.value })}
                  placeholder={t.onboarding.expTitle}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>{t.onboarding.expOrg}</Label>
              <Input
                value={e.organization}
                onChange={(ev) => setItem(e.id, { organization: ev.target.value })}
                placeholder={t.onboarding.expOrg}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>{t.onboarding.expStart}</Label>
                <Input
                  value={e.startDate}
                  onChange={(ev) => setItem(e.id, { startDate: ev.target.value })}
                  placeholder="2023-01"
                  inputMode="numeric"
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t.onboarding.expEnd}</Label>
                <Input
                  value={e.current ? "Present" : e.endDate}
                  onChange={(ev) => setItem(e.id, { endDate: ev.target.value })}
                  placeholder="2024-05 / Present"
                  disabled={e.current}
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={e.current}
                onCheckedChange={(v) =>
                  setItem(e.id, { current: v === true, endDate: v === true ? "" : e.endDate })
                }
              />
              {t.onboarding.expCurrent}
            </label>

            <div className="space-y-1.5">
              <Label>{t.onboarding.expDesc}</Label>
              <Textarea
                value={e.description}
                onChange={(ev) => setItem(e.id, { description: ev.target.value })}
                rows={2}
                placeholder={t.onboarding.expDesc}
              />
            </div>

            <div className="space-y-1.5">
              <Label>{t.onboarding.expAchievements}</Label>
              <Textarea
                value={e.achievements}
                onChange={(ev) => setItem(e.id, { achievements: ev.target.value })}
                rows={3}
                placeholder={t.onboarding.expAchievementsHint}
              />
              <p className="text-xs text-muted-foreground">
                {t.onboarding.expAchievementsHint}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-foreground">
                {t.onboarding.expContext}
              </Label>
              <Textarea
                value={e.contextNotes}
                onChange={(ev) => setItem(e.id, { contextNotes: ev.target.value })}
                rows={3}
                placeholder={t.onboarding.expContextHint}
              />
              <p className="text-xs text-accent-foreground/80">
                {t.onboarding.expContextHint}
              </p>
            </div>
          </div>
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        onClick={add}
        className="w-full border-dashed"
      >
        <Plus className="h-4 w-4" />
        {t.onboarding.addExperience}
      </Button>
    </div>
  )
}
