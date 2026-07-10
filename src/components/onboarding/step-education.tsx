"use client"

import { useT } from "@/components/providers/locale-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import { Plus, Trash2 } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  emptyCertification,
  emptyEducation,
  emptyLanguage,
  type CertificationInput,
  type EducationInput,
  type LangLevel,
  type LanguageInput,
  type WizardState,
} from "./types"

export function StepEducation({
  state,
  update,
}: {
  state: WizardState
  update: <K extends keyof WizardState>(key: K, value: WizardState[K]) => void
}) {
  const t = useT()

  // --- Education handlers ---
  const setEdu = (id: string, patch: Partial<EducationInput>) =>
    update(
      "educations",
      state.educations.map((e) => (e.id === id ? { ...e, ...patch } : e))
    )
  const removeEdu = (id: string) =>
    update("educations", state.educations.filter((e) => e.id !== id))
  const addEdu = () =>
    update("educations", [...state.educations, emptyEducation()])

  // --- Certification handlers ---
  const setCert = (id: string, patch: Partial<CertificationInput>) =>
    update(
      "certifications",
      state.certifications.map((c) => (c.id === id ? { ...c, ...patch } : c))
    )
  const removeCert = (id: string) =>
    update("certifications", state.certifications.filter((c) => c.id !== id))
  const addCert = () =>
    update("certifications", [...state.certifications, emptyCertification()])

  // --- Language handlers ---
  const setLang = (id: string, patch: Partial<LanguageInput>) =>
    update(
      "languages",
      state.languages.map((l) => (l.id === id ? { ...l, ...patch } : l))
    )
  const removeLang = (id: string) =>
    update("languages", state.languages.filter((l) => l.id !== id))
  const addLang = () =>
    update("languages", [...state.languages, emptyLanguage()])

  return (
    <div className="space-y-8">
      {/* Education */}
      <section className="space-y-4">
        <SubHeading>{t.onboarding.addEducation}</SubHeading>

        {state.educations.length === 0 && (
          <EmptyHint>{t.onboarding.s4Desc}</EmptyHint>
        )}

        {state.educations.map((e, i) => (
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
                onClick={() => removeEdu(e.id)}
                className="text-destructive hover:bg-destructive/5 hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
                {t.common.delete}
              </Button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>{t.onboarding.eduInstitution}</Label>
                <Input
                  value={e.institution}
                  onChange={(ev) => setEdu(e.id, { institution: ev.target.value })}
                  placeholder={t.onboarding.eduInstitution}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>{t.onboarding.eduDegree}</Label>
                  <Input
                    value={e.degree}
                    onChange={(ev) => setEdu(e.id, { degree: ev.target.value })}
                    placeholder={t.onboarding.eduDegree}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{t.onboarding.eduField}</Label>
                  <Input
                    value={e.field}
                    onChange={(ev) => setEdu(e.id, { field: ev.target.value })}
                    placeholder={t.onboarding.eduField}
                  />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>{t.onboarding.eduStart}</Label>
                  <Input
                    value={e.startDate}
                    onChange={(ev) => setEdu(e.id, { startDate: ev.target.value })}
                    placeholder="2021-08"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{t.onboarding.eduEnd}</Label>
                  <Input
                    value={e.current ? "Present" : e.endDate}
                    onChange={(ev) => setEdu(e.id, { endDate: ev.target.value })}
                    placeholder="2025-06 / Present"
                    disabled={e.current}
                  />
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={e.current}
                    onCheckedChange={(v) =>
                      setEdu(e.id, {
                        current: v === true,
                        endDate: v === true ? "" : e.endDate,
                      })
                    }
                  />
                  {t.onboarding.eduCurrent}
                </label>
                <div className="w-full sm:w-32">
                  <Label className="sr-only">{t.onboarding.eduGpa}</Label>
                  <Input
                    value={e.gpa}
                    onChange={(ev) => setEdu(e.id, { gpa: ev.target.value })}
                    placeholder={t.onboarding.eduGpa}
                  />
                </div>
              </div>
            </div>
          </div>
        ))}

        <Button
          type="button"
          variant="outline"
          onClick={addEdu}
          className="w-full border-dashed"
        >
          <Plus className="h-4 w-4" />
          {t.onboarding.addEducation}
        </Button>
      </section>

      <Separator />

      {/* Certifications */}
      <section className="space-y-4">
        <SubHeading>{t.onboarding.addCert}</SubHeading>

        {state.certifications.length === 0 && <EmptyHint>{t.onboarding.s4Desc}</EmptyHint>}

        {state.certifications.map((c, i) => (
          <div
            key={c.id}
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
                onClick={() => removeCert(c.id)}
                className="text-destructive hover:bg-destructive/5 hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
                {t.common.delete}
              </Button>
            </div>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>{t.onboarding.certName}</Label>
                <Input
                  value={c.name}
                  onChange={(ev) => setCert(c.id, { name: ev.target.value })}
                  placeholder={t.onboarding.certName}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>{t.onboarding.certIssuer}</Label>
                  <Input
                    value={c.issuer}
                    onChange={(ev) => setCert(c.id, { issuer: ev.target.value })}
                    placeholder={t.onboarding.certIssuer}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{t.onboarding.certDate}</Label>
                  <Input
                    value={c.issueDate}
                    onChange={(ev) => setCert(c.id, { issueDate: ev.target.value })}
                    placeholder="2024-05"
                  />
                </div>
              </div>
            </div>
          </div>
        ))}

        <Button
          type="button"
          variant="outline"
          onClick={addCert}
          className="w-full border-dashed"
        >
          <Plus className="h-4 w-4" />
          {t.onboarding.addCert}
        </Button>
      </section>

      <Separator />

      {/* Languages */}
      <section className="space-y-4">
        <SubHeading>{t.onboarding.addLanguage}</SubHeading>

        {state.languages.length === 0 && <EmptyHint>{t.onboarding.s4Desc}</EmptyHint>}

        {state.languages.map((l, i) => (
          <div
            key={l.id}
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
                onClick={() => removeLang(l.id)}
                className="text-destructive hover:bg-destructive/5 hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
                {t.common.delete}
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>{t.onboarding.langName}</Label>
                <Input
                  value={l.language}
                  onChange={(ev) => setLang(l.id, { language: ev.target.value })}
                  placeholder={t.onboarding.langName}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t.onboarding.langLevel}</Label>
                <Select
                  value={l.level}
                  onValueChange={(v) => setLang(l.id, { level: v as LangLevel })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="native">Native</SelectItem>
                    <SelectItem value="fluent">Fluent</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="beginner">Beginner</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        ))}

        <Button
          type="button"
          variant="outline"
          onClick={addLang}
          className="w-full border-dashed"
        >
          <Plus className="h-4 w-4" />
          {t.onboarding.addLanguage}
        </Button>
      </section>
    </div>
  )
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="font-serif text-base font-semibold tracking-tight text-foreground">
      {children}
    </h3>
  )
}

function EmptyHint({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-lg border border-dashed border-border bg-muted/30 px-4 py-4 text-center text-xs text-muted-foreground">
      {children}
    </p>
  )
}
