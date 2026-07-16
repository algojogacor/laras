"use client"

import { useReducer, useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { AnimatePresence, motion } from "framer-motion"
import { Loader2, Plus, Trash2, ArrowLeft, ArrowRight, Check, Sparkles } from "lucide-react"
import { larasToast } from "@/lib/laras-toast"
import { apiClient } from "@/lib/api-client"
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { SerializedProfile } from "@/lib/profile"

type Exp = {
  type: string; title: string; organization: string; startDate: string; endDate: string
  current: boolean; description: string; achievementsText: string; contextNotes: string
}
type Skill = { name: string; category: string; proficiency: string; context: string }
type Edu = { institution: string; degree: string; field: string; startDate: string; endDate: string; current: boolean; gpa: string }
type Cert = { name: string; issuer: string; issueDate: string }
type Lang = { language: string; level: string }

type State = {
  fullName: string; headline: string; email: string; phone: string; location: string; summary: string
  linkedin: string; portfolio: string
  experiences: Exp[]
  skills: Skill[]
  educations: Edu[]
  certifications: Cert[]
  languages: Lang[]
  opportunityTypes: string[]
  targetRegion: string; urgency: string; preferredTone: string
}

const emptyExp = (): Exp => ({ type: "work", title: "", organization: "", startDate: "", endDate: "", current: false, description: "", achievementsText: "", contextNotes: "" })
const emptySkill = (): Skill => ({ name: "", category: "technical", proficiency: "intermediate", context: "" })
const emptyEdu = (): Edu => ({ institution: "", degree: "", field: "", startDate: "", endDate: "", current: false, gpa: "" })
const emptyCert = (): Cert => ({ name: "", issuer: "", issueDate: "" })
const emptyLang = (): Lang => ({ language: "", level: "intermediate" })

function init(p: SerializedProfile): State {
  return {
    fullName: p.fullName ?? "",
    headline: p.headline ?? "",
    email: p.email ?? "",
    phone: p.phone ?? "",
    location: p.location ?? "",
    summary: p.summary ?? "",
    linkedin: p.links?.linkedin ?? "",
    portfolio: p.links?.portfolio ?? "",
    experiences: (p.experiences?.length ? p.experiences : []).map((e) => ({
      type: e.type, title: e.title, organization: e.organization,
      startDate: e.startDate ?? "", endDate: e.endDate ?? "", current: e.current,
      description: e.description ?? "",
      achievementsText: (e.achievements ?? []).join("\n"),
      contextNotes: e.contextNotes ?? "",
    })),
    skills: (p.skills?.length ? p.skills : []).map((s) => ({
      name: s.name, category: s.category ?? "technical",
      proficiency: s.proficiency ?? "intermediate", context: s.context ?? "",
    })),
    educations: (p.educations?.length ? p.educations : []).map((e) => ({
      institution: e.institution, degree: e.degree ?? "", field: e.field ?? "",
      startDate: e.startDate ?? "", endDate: e.endDate ?? "", current: e.current, gpa: e.gpa ?? "",
    })),
    certifications: (p.certifications?.length ? p.certifications : []).map((c) => ({
      name: c.name, issuer: c.issuer ?? "", issueDate: c.issueDate ?? "",
    })),
    languages: (p.languages?.length ? p.languages : []).map((l) => ({
      language: l.language, level: l.level ?? "intermediate",
    })),
    opportunityTypes: p.opportunityTypes ?? [],
    targetRegion: p.targetRegion ?? "domestic",
    urgency: p.urgency ?? "exploring",
    preferredTone: p.preferredTone ?? "warm",
  }
}

type Action =
  | { type: "set"; field: keyof State; value: any }
  | { type: "setExp"; i: number; field: keyof Exp; value: any }
  | { type: "addExp" } | { type: "delExp"; i: number }
  | { type: "setSkill"; i: number; field: keyof Skill; value: any }
  | { type: "addSkill" } | { type: "delSkill"; i: number }
  | { type: "setEdu"; i: number; field: keyof Edu; value: any }
  | { type: "addEdu" } | { type: "delEdu"; i: number }
  | { type: "setCert"; i: number; field: keyof Cert; value: any }
  | { type: "addCert" } | { type: "delCert"; i: number }
  | { type: "setLang"; i: number; field: keyof Lang; value: any }
  | { type: "addLang" } | { type: "delLang"; i: number }
  | { type: "toggleOpp"; value: string }

function reducer(s: State, a: Action): State {
  switch (a.type) {
    case "set": return { ...s, [a.field]: a.value }
    case "setExp": return { ...s, experiences: s.experiences.map((e, i) => i === a.i ? { ...e, [a.field]: a.value } : e) }
    case "addExp": return { ...s, experiences: [...s.experiences, emptyExp()] }
    case "delExp": return { ...s, experiences: s.experiences.filter((_, i) => i !== a.i) }
    case "setSkill": return { ...s, skills: s.skills.map((e, i) => i === a.i ? { ...e, [a.field]: a.value } : e) }
    case "addSkill": return { ...s, skills: [...s.skills, emptySkill()] }
    case "delSkill": return { ...s, skills: s.skills.filter((_, i) => i !== a.i) }
    case "setEdu": return { ...s, educations: s.educations.map((e, i) => i === a.i ? { ...e, [a.field]: a.value } : e) }
    case "addEdu": return { ...s, educations: [...s.educations, emptyEdu()] }
    case "delEdu": return { ...s, educations: s.educations.filter((_, i) => i !== a.i) }
    case "setCert": return { ...s, certifications: s.certifications.map((e, i) => i === a.i ? { ...e, [a.field]: a.value } : e) }
    case "addCert": return { ...s, certifications: [...s.certifications, emptyCert()] }
    case "delCert": return { ...s, certifications: s.certifications.filter((_, i) => i !== a.i) }
    case "setLang": return { ...s, languages: s.languages.map((e, i) => i === a.i ? { ...e, [a.field]: a.value } : e) }
    case "addLang": return { ...s, languages: [...s.languages, emptyLang()] }
    case "delLang": return { ...s, languages: s.languages.filter((_, i) => i !== a.i) }
    case "toggleOpp": return { ...s, opportunityTypes: s.opportunityTypes.includes(a.value) ? s.opportunityTypes.filter((x) => x !== a.value) : [...s.opportunityTypes, a.value] }
    default: return s
  }
}

function buildPayload(s: State) {
  return {
    fullName: s.fullName, headline: s.headline, summary: s.summary, email: s.email, phone: s.phone, location: s.location,
    links: { linkedin: s.linkedin, portfolio: s.portfolio },
    targetRegion: s.targetRegion, opportunityTypes: s.opportunityTypes, preferredTone: s.preferredTone, urgency: s.urgency,
    experiences: s.experiences.filter((e) => e.title || e.organization).map((e) => ({
      type: e.type, title: e.title, organization: e.organization, startDate: e.startDate || null,
      endDate: e.current ? "Present" : e.endDate || null, current: e.current, description: e.description || null,
      achievements: e.achievementsText.split("\n").map((x) => x.trim()).filter(Boolean),
      contextNotes: e.contextNotes || null,
    })),
    skills: s.skills.filter((x) => x.name).map((x) => ({ ...x })),
    educations: s.educations.filter((x) => x.institution).map((x) => ({ ...x })),
    certifications: s.certifications.filter((x) => x.name).map((x) => ({ ...x })),
    languages: s.languages.filter((x) => x.language).map((x) => ({ ...x })),
  }
}

export function OnboardingWizard({ initialProfile }: { initialProfile: SerializedProfile }) {
  const t = useT()
  const router = useRouter()
  const [state, dispatch] = useReducer(reducer, initialProfile, init)
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [finishing, setFinishing] = useState(false)

  const steps = [
    { n: 1, title: t.onboarding.s1Title, desc: t.onboarding.s1Desc },
    { n: 2, title: t.onboarding.s2Title, desc: t.onboarding.s2Desc },
    { n: 3, title: t.onboarding.s3Title, desc: t.onboarding.s3Desc },
    { n: 4, title: t.onboarding.s4Title, desc: t.onboarding.s4Desc },
    { n: 5, title: t.onboarding.s5Title, desc: t.onboarding.s5Desc },
  ]
  const current = steps[step - 1]

  async function saveProgress(nextStep?: number) {
    setSaving(true)
    try {
      const res = await apiClient("/api/profile", {
        method: "PUT",
        body: JSON.stringify(buildPayload(state)),
      })
      if (!res.ok) throw new Error()
      if (nextStep) setStep(nextStep)
    } catch {
      larasToast.error(t.auth.errGeneric)
    } finally {
      setSaving(false)
    }
  }

  async function next() {
    if (step < 5) await saveProgress(step + 1)
    else await finish()
  }
  async function back() {
    if (step > 1) await saveProgress(step - 1)
  }
  async function finish() {
    setFinishing(true)
    try {
      const res = await apiClient("/api/profile", {
        method: "PUT",
        body: JSON.stringify(buildPayload(state)),
      })
      if (!res.ok) throw new Error()
      await apiClient("/api/profile", {
        method: "PATCH",
        body: JSON.stringify({ onboardingComplete: true }),
      })
      larasToast.success(t.onboarding.complete)
      router.push("/dashboard")
      router.refresh()
    } catch {
      larasToast.error(t.auth.errGeneric)
    } finally {
      setFinishing(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl animate-rise">
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-serif text-3xl font-semibold tracking-tight">{t.onboarding.title}</h1>
        <p className="mt-1.5 text-muted-foreground text-pretty">{t.onboarding.subtitle}</p>
      </div>

      {/* Step indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{t.onboarding.step} {step} {t.onboarding.of} 5</span>
          {saving && (
            <span className="flex items-center gap-1.5">
              <Loader2 className="h-3 w-3 animate-spin" /> {t.common.loading}
            </span>
          )}
        </div>
        <div className="mt-2 flex gap-1.5">
          {steps.map((s) => (
            <button
              key={s.n}
              type="button"
              onClick={() => { if (s.n < step) setStep(s.n) }}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-colors",
                s.n <= step ? "bg-primary" : "bg-muted",
                s.n < step && "cursor-pointer"
              )}
              aria-label={`Step ${s.n}`}
            />
          ))}
        </div>
        <div className="mt-4">
          <h2 className="font-serif text-xl font-semibold">{current.title}</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">{current.desc}</p>
        </div>
      </div>

      {/* Step content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        >
          {step === 1 && <StepBasics t={t} state={state} dispatch={dispatch} />}
          {step === 2 && <StepExperiences t={t} state={state} dispatch={dispatch} />}
          {step === 3 && <StepSkills t={t} state={state} dispatch={dispatch} />}
          {step === 4 && <StepEducation t={t} state={state} dispatch={dispatch} />}
          {step === 5 && <StepGoals t={t} state={state} dispatch={dispatch} />}
        </motion.div>
      </AnimatePresence>

      {/* Footer nav */}
      <div className="mt-8 flex items-center justify-between gap-3">
        <Button variant="ghost" size="sm" onClick={back} disabled={step === 1 || saving || finishing}>
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          {t.onboarding.back}
        </Button>
        <div className="flex items-center gap-2">
          {step < 5 && (
            <Button variant="ghost" size="sm" onClick={() => setStep(step + 1)} disabled={saving}>
              {t.onboarding.skip}
            </Button>
          )}
          <Button onClick={next} disabled={saving || finishing} size="sm" className="shadow-soft">
            {(saving || finishing) && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            {step === 5 ? t.onboarding.finish : t.onboarding.next}
            {!saving && !finishing && <ArrowRight className="ml-1.5 h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  )
}

/* ---------- Reusable field bits ---------- */
function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

function RepeatableCard({ index, onDelete, children }: { index: number; onDelete: () => void; children: ReactNode }) {
  return (
    <Card className="relative shadow-soft">
      <CardContent className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
            {index + 1}
          </span>
          <button
            type="button"
            onClick={onDelete}
            className="inline-flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            aria-label="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
        {children}
      </CardContent>
    </Card>
  )
}

function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button type="button" variant="outline" onClick={onClick} className="w-full border-dashed">
      <Plus className="mr-1.5 h-4 w-4" />
      {label}
    </Button>
  )
}

/* ---------- Step 1: Basics ---------- */
function StepBasics({ t, state, dispatch }: any) {
  return (
    <div className="space-y-4">
      <Field label={t.onboarding.fullName}>
        <Input value={state.fullName} onChange={(e: any) => dispatch({ type: "set", field: "fullName", value: e.target.value })} className="h-11" />
      </Field>
      <Field label={t.onboarding.headline} hint={t.onboarding.headlineHint}>
        <Input value={state.headline} onChange={(e: any) => dispatch({ type: "set", field: "headline", value: e.target.value })} className="h-11" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t.onboarding.email}>
          <Input type="email" value={state.email} onChange={(e: any) => dispatch({ type: "set", field: "email", value: e.target.value })} className="h-11" />
        </Field>
        <Field label={t.onboarding.phone}>
          <Input value={state.phone} onChange={(e: any) => dispatch({ type: "set", field: "phone", value: e.target.value })} className="h-11" />
        </Field>
      </div>
      <Field label={t.onboarding.location}>
        <Input value={state.location} onChange={(e: any) => dispatch({ type: "set", field: "location", value: e.target.value })} className="h-11" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t.onboarding.linkedin}>
          <Input value={state.linkedin} onChange={(e: any) => dispatch({ type: "set", field: "linkedin", value: e.target.value })} className="h-11" placeholder="https://linkedin.com/in/..." />
        </Field>
        <Field label={t.onboarding.portfolio}>
          <Input value={state.portfolio} onChange={(e: any) => dispatch({ type: "set", field: "portfolio", value: e.target.value })} className="h-11" placeholder="https://..." />
        </Field>
      </div>
      <Field label={t.onboarding.summary} hint={t.onboarding.summaryHint}>
        <Textarea rows={4} value={state.summary} onChange={(e: any) => dispatch({ type: "set", field: "summary", value: e.target.value })} />
      </Field>
    </div>
  )
}

/* ---------- Step 2: Experiences ---------- */
function StepExperiences({ t, state, dispatch }: any) {
  return (
    <div className="space-y-4">
      {state.experiences.map((e: Exp, i: number) => (
        <RepeatableCard key={i} index={i} onDelete={() => dispatch({ type: "delExp", i })}>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t.onboarding.expTitle}>
                <Input value={e.title} onChange={(ev: any) => dispatch({ type: "setExp", i, field: "title", value: ev.target.value })} className="h-10" />
              </Field>
              <Field label={t.onboarding.expOrg}>
                <Input value={e.organization} onChange={(ev: any) => dispatch({ type: "setExp", i, field: "organization", value: ev.target.value })} className="h-10" />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label={t.onboarding.expType}>
                <Select value={e.type} onValueChange={(v) => dispatch({ type: "setExp", i, field: "type", value: v })}>
                  <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="work">{t.onboarding.expTypeWork}</SelectItem>
                    <SelectItem value="org">{t.onboarding.expTypeOrg}</SelectItem>
                    <SelectItem value="project">{t.onboarding.expTypeProject}</SelectItem>
                    <SelectItem value="volunteer">{t.onboarding.expTypeVolunteer}</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label={t.onboarding.expStart}>
                <Input value={e.startDate} onChange={(ev: any) => dispatch({ type: "setExp", i, field: "startDate", value: ev.target.value })} className="h-10" placeholder="2023-01" />
              </Field>
              <Field label={t.onboarding.expEnd}>
                <Input value={e.endDate} disabled={e.current} onChange={(ev: any) => dispatch({ type: "setExp", i, field: "endDate", value: ev.target.value })} className="h-10" placeholder="2024-05" />
              </Field>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={e.current} onChange={(ev) => dispatch({ type: "setExp", i, field: "current", value: ev.target.checked })} className="h-4 w-4 rounded border-border accent-primary" />
              {t.onboarding.expCurrent}
            </label>
            <Field label={t.onboarding.expDesc}>
              <Textarea rows={2} value={e.description} onChange={(ev: any) => dispatch({ type: "setExp", i, field: "description", value: ev.target.value })} />
            </Field>
            <Field label={t.onboarding.expAchievements} hint={t.onboarding.expAchievementsHint}>
              <Textarea rows={3} value={e.achievementsText} onChange={(ev: any) => dispatch({ type: "setExp", i, field: "achievementsText", value: ev.target.value })} placeholder={"• ...\n• ..."} />
            </Field>
            <div className="rounded-lg border border-accent/30 bg-accent/5 p-3">
              <Field label={t.onboarding.expContext} hint={t.onboarding.expContextHint}>
                <Textarea rows={3} value={e.contextNotes} onChange={(ev: any) => dispatch({ type: "setExp", i, field: "contextNotes", value: ev.target.value })} />
              </Field>
            </div>
          </div>
        </RepeatableCard>
      ))}
      <AddButton label={t.onboarding.addExperience} onClick={() => dispatch({ type: "addExp" })} />
    </div>
  )
}

/* ---------- Step 3: Skills ---------- */
function StepSkills({ t, state, dispatch }: any) {
  return (
    <div className="space-y-4">
      {state.skills.map((s: Skill, i: number) => (
        <RepeatableCard key={i} index={i} onDelete={() => dispatch({ type: "delSkill", i })}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t.onboarding.skillName}>
              <Input value={s.name} onChange={(ev: any) => dispatch({ type: "setSkill", i, field: "name", value: ev.target.value })} className="h-10" />
            </Field>
            <Field label={t.onboarding.skillProficiency}>
              <Select value={s.proficiency} onValueChange={(v) => dispatch({ type: "setSkill", i, field: "proficiency", value: v })}>
                <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                  <SelectItem value="expert">Expert</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
          <div className="mt-4">
            <Field label={t.onboarding.skillContext} hint={t.onboarding.skillContextHint}>
              <Textarea rows={2} value={s.context} onChange={(ev: any) => dispatch({ type: "setSkill", i, field: "context", value: ev.target.value })} />
            </Field>
          </div>
        </RepeatableCard>
      ))}
      <AddButton label={t.onboarding.addSkill} onClick={() => dispatch({ type: "addSkill" })} />
    </div>
  )
}

/* ---------- Step 4: Education + Certifications + Languages ---------- */
function StepEducation({ t, state, dispatch }: any) {
  return (
    <div className="space-y-8">
      {/* Education */}
      <section>
        <h3 className="mb-3 font-serif text-lg font-semibold">{t.profile.education}</h3>
        <div className="space-y-4">
          {state.educations.map((e: Edu, i: number) => (
            <RepeatableCard key={i} index={i} onDelete={() => dispatch({ type: "delEdu", i })}>
              <div className="space-y-4">
                <Field label={t.onboarding.eduInstitution}>
                  <Input value={e.institution} onChange={(ev: any) => dispatch({ type: "setEdu", i, field: "institution", value: ev.target.value })} className="h-10" />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label={t.onboarding.eduDegree}>
                    <Input value={e.degree} onChange={(ev: any) => dispatch({ type: "setEdu", i, field: "degree", value: ev.target.value })} className="h-10" />
                  </Field>
                  <Field label={t.onboarding.eduField}>
                    <Input value={e.field} onChange={(ev: any) => dispatch({ type: "setEdu", i, field: "field", value: ev.target.value })} className="h-10" />
                  </Field>
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <Field label={t.onboarding.eduStart}>
                    <Input value={e.startDate} onChange={(ev: any) => dispatch({ type: "setEdu", i, field: "startDate", value: ev.target.value })} className="h-10" />
                  </Field>
                  <Field label={t.onboarding.eduEnd}>
                    <Input value={e.endDate} disabled={e.current} onChange={(ev: any) => dispatch({ type: "setEdu", i, field: "endDate", value: ev.target.value })} className="h-10" />
                  </Field>
                  <Field label={t.onboarding.eduGpa}>
                    <Input value={e.gpa} onChange={(ev: any) => dispatch({ type: "setEdu", i, field: "gpa", value: ev.target.value })} className="h-10" />
                  </Field>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={e.current} onChange={(ev) => dispatch({ type: "setEdu", i, field: "current", value: ev.target.checked })} className="h-4 w-4 rounded border-border accent-primary" />
                  {t.onboarding.eduCurrent}
                </label>
              </div>
            </RepeatableCard>
          ))}
          <AddButton label={t.onboarding.addEducation} onClick={() => dispatch({ type: "addEdu" })} />
        </div>
      </section>

      {/* Certifications */}
      <section>
        <h3 className="mb-3 font-serif text-lg font-semibold">{t.profile.certifications}</h3>
        <div className="space-y-4">
          {state.certifications.map((c: Cert, i: number) => (
            <RepeatableCard key={i} index={i} onDelete={() => dispatch({ type: "delCert", i })}>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label={t.onboarding.certName}>
                  <Input value={c.name} onChange={(ev: any) => dispatch({ type: "setCert", i, field: "name", value: ev.target.value })} className="h-10" />
                </Field>
                <Field label={t.onboarding.certIssuer}>
                  <Input value={c.issuer} onChange={(ev: any) => dispatch({ type: "setCert", i, field: "issuer", value: ev.target.value })} className="h-10" />
                </Field>
                <Field label={t.onboarding.certDate}>
                  <Input value={c.issueDate} onChange={(ev: any) => dispatch({ type: "setCert", i, field: "issueDate", value: ev.target.value })} className="h-10" placeholder="2024-05" />
                </Field>
              </div>
            </RepeatableCard>
          ))}
          <AddButton label={t.onboarding.addCert} onClick={() => dispatch({ type: "addCert" })} />
        </div>
      </section>

      {/* Languages */}
      <section>
        <h3 className="mb-3 font-serif text-lg font-semibold">{t.profile.languages}</h3>
        <div className="space-y-4">
          {state.languages.map((l: Lang, i: number) => (
            <RepeatableCard key={i} index={i} onDelete={() => dispatch({ type: "delLang", i })}>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={t.onboarding.langName}>
                  <Input value={l.language} onChange={(ev: any) => dispatch({ type: "setLang", i, field: "language", value: ev.target.value })} className="h-10" />
                </Field>
                <Field label={t.onboarding.langLevel}>
                  <Select value={l.level} onValueChange={(v) => dispatch({ type: "setLang", i, field: "level", value: v })}>
                    <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="native">Native</SelectItem>
                      <SelectItem value="fluent">Fluent</SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="beginner">Beginner</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            </RepeatableCard>
          ))}
          <AddButton label={t.onboarding.addLanguage} onClick={() => dispatch({ type: "addLang" })} />
        </div>
      </section>
    </div>
  )
}

/* ---------- Step 5: Goals & preferences ---------- */
function StepGoals({ t, state, dispatch }: any) {
  const opps = [
    { value: "work", label: t.onboarding.opWork },
    { value: "org", label: t.onboarding.opOrg },
    { value: "scholarship", label: t.onboarding.opScholarship },
    { value: "volunteer", label: t.onboarding.opVolunteer },
  ]
  return (
    <div className="space-y-6">
      <Field label={t.onboarding.opportunityTypes}>
        <div className="flex flex-wrap gap-2">
          {opps.map((o) => {
            const active = state.opportunityTypes.includes(o.value)
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => dispatch({ type: "toggleOpp", value: o.value })}
                className={cn(
                  "rounded-full border px-4 py-2 text-sm font-medium transition-all",
                  active
                    ? "border-primary bg-primary text-primary-foreground shadow-soft"
                    : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
                )}
              >
                {active && <Check className="mr-1.5 inline h-3.5 w-3.5" />}
                {o.label}
              </button>
            )
          })}
        </div>
      </Field>

      <Field label={t.onboarding.targetRegion}>
        <RadioGroup value={state.targetRegion} onValueChange={(v) => dispatch({ type: "set", field: "targetRegion", value: v })} className="grid gap-2 sm:grid-cols-2">
          {[
            { value: "domestic", label: t.onboarding.regionDomestic },
            { value: "international", label: t.onboarding.regionInternational },
          ].map((r) => (
            <label key={r.value} className={cn("flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition-colors", state.targetRegion === r.value ? "border-primary bg-primary/5" : "border-border hover:bg-secondary")}>
              <RadioGroupItem value={r.value} />
              <span className="text-sm font-medium">{r.label}</span>
            </label>
          ))}
        </RadioGroup>
      </Field>

      <Field label={t.onboarding.urgency}>
        <RadioGroup value={state.urgency} onValueChange={(v) => dispatch({ type: "set", field: "urgency", value: v })} className="grid gap-2 sm:grid-cols-3">
          {[
            { value: "deadline-soon", label: t.onboarding.urgencyDeadline },
            { value: "active", label: t.onboarding.urgencyActive },
            { value: "exploring", label: t.onboarding.urgencyExploring },
          ].map((r) => (
            <label key={r.value} className={cn("flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition-colors", state.urgency === r.value ? "border-primary bg-primary/5" : "border-border hover:bg-secondary")}>
              <RadioGroupItem value={r.value} />
              <span className="text-sm font-medium">{r.label}</span>
            </label>
          ))}
        </RadioGroup>
      </Field>

      <Field label={t.onboarding.preferredTone}>
        <RadioGroup value={state.preferredTone} onValueChange={(v) => dispatch({ type: "set", field: "preferredTone", value: v })} className="grid gap-2 sm:grid-cols-3">
          {[
            { value: "formal", label: t.onboarding.toneFormal },
            { value: "direct", label: t.onboarding.toneDirect },
            { value: "warm", label: t.onboarding.toneWarm },
          ].map((r) => (
            <label key={r.value} className={cn("flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition-colors", state.preferredTone === r.value ? "border-primary bg-primary/5" : "border-border hover:bg-secondary")}>
              <RadioGroupItem value={r.value} />
              <span className="text-sm font-medium">{r.label}</span>
            </label>
          ))}
        </RadioGroup>
      </Field>

      <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
        <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <p className="text-sm text-muted-foreground text-pretty">
          {t.onboarding.subtitle}
        </p>
      </div>
    </div>
  )
}
