"use client"

import { useT } from "@/components/providers/locale-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus, Trash2 } from "lucide-react"
import {
  emptySkill,
  type SkillCategory,
  type SkillInput,
  type SkillProficiency,
  type WizardState,
} from "./types"

export function StepSkills({
  state,
  update,
}: {
  state: WizardState
  update: <K extends keyof WizardState>(key: K, value: WizardState[K]) => void
}) {
  const t = useT()

  const setItem = (id: string, patch: Partial<SkillInput>) => {
    update(
      "skills",
      state.skills.map((s) => (s.id === id ? { ...s, ...patch } : s))
    )
  }
  const remove = (id: string) =>
    update("skills", state.skills.filter((s) => s.id !== id))
  const add = () => update("skills", [...state.skills, emptySkill()])

  return (
    <div className="space-y-4">
      {state.skills.length === 0 && (
        <p className="rounded-lg border border-dashed border-border bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
          {t.onboarding.s3Desc}
        </p>
      )}

      {state.skills.map((s, i) => (
        <div
          key={s.id}
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
              onClick={() => remove(s.id)}
              className="text-destructive hover:bg-destructive/5 hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
              {t.common.delete}
            </Button>
          </div>

          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label>{t.onboarding.skillName}</Label>
                <Input
                  value={s.name}
                  onChange={(e) => setItem(s.id, { name: e.target.value })}
                  placeholder={t.onboarding.skillName}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t.onboarding.skillCategory}</Label>
                <Select
                  value={s.category}
                  onValueChange={(v) => setItem(s.id, { category: v as SkillCategory })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="technical">Technical</SelectItem>
                    <SelectItem value="soft">Soft</SelectItem>
                    <SelectItem value="tool">Tool</SelectItem>
                    <SelectItem value="domain">Domain</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{t.onboarding.skillProficiency}</Label>
                <Select
                  value={s.proficiency}
                  onValueChange={(v) =>
                    setItem(s.id, { proficiency: v as SkillProficiency })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                    <SelectItem value="expert">Expert</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>{t.onboarding.skillContext}</Label>
              <Textarea
                value={s.context}
                onChange={(e) => setItem(s.id, { context: e.target.value })}
                rows={2}
                placeholder={t.onboarding.skillContextHint}
              />
              <p className="text-xs text-muted-foreground">
                {t.onboarding.skillContextHint}
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
        {t.onboarding.addSkill}
      </Button>
    </div>
  )
}
