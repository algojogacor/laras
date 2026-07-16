"use client"

import { useState, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { larasToast } from "@/lib/laras-toast"
import { apiClient } from "@/lib/api-client"
import {
  Loader2,
  Pencil,
  Save,
  X,
  Download,
  Trash2,
  ExternalLink,
  Plus,
  AlertTriangle,
} from "lucide-react"

import { useT } from "@/components/providers/locale-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

import type { SerializedProfile } from "@/lib/profile"
import {
  emptyExperience,
  emptySkill,
  emptyEducation,
  emptyCertification,
  emptyLanguage,
  buildProfilePayload,
  type WizardState,
  type ExpType,
  type SkillCategory,
  type SkillProficiency,
  type LangLevel,
  type OppType,
  type TargetRegion,
  type Urgency,
  type PreferredTone,
  type ExperienceInput,
  type SkillInput,
  type EducationInput,
  type CertificationInput,
  type LanguageInput,
} from "@/components/onboarding/types"

type Props = {
  profile: SerializedProfile
  initialCompletion: number
}

type SectionKey =
  | "basics"
  | "summary"
  | "experiences"
  | "educations"
  | "skills"
  | "certifications"
  | "languages"
  | "preferences"

/** Convert a serialized profile (from server) into the editable WizardState shape. */
function profileToState(p: SerializedProfile): WizardState {
  const links = (p.links ?? {}) as { linkedin?: string; portfolio?: string }
  return {
    fullName: p.fullName ?? "",
    headline: p.headline ?? "",
    email: p.email ?? "",
    phone: p.phone ?? "",
    location: p.location ?? "",
    linkedin: links.linkedin ?? "",
    portfolio: links.portfolio ?? "",
    summary: p.summary ?? "",
    experiences: (p.experiences ?? []).map((e) => ({
      id: e.id,
      type: (e.type as ExpType) ?? "work",
      title: e.title,
      organization: e.organization,
      startDate: e.startDate ?? "",
      endDate: e.endDate === "Present" ? "" : (e.endDate ?? ""),
      current: e.current,
      description: e.description ?? "",
      achievements: Array.isArray(e.achievements) ? e.achievements.join("\n") : "",
      contextNotes: e.contextNotes ?? "",
    })),
    skills: (p.skills ?? []).map((s) => ({
      id: s.id,
      name: s.name,
      category: (s.category as SkillCategory) ?? "technical",
      proficiency: (s.proficiency as SkillProficiency) ?? "intermediate",
      context: s.context ?? "",
    })),
    educations: (p.educations ?? []).map((e) => ({
      id: e.id,
      institution: e.institution,
      degree: e.degree ?? "",
      field: e.field ?? "",
      startDate: e.startDate ?? "",
      endDate: e.endDate === "Present" ? "" : (e.endDate ?? ""),
      current: e.current,
      gpa: e.gpa ?? "",
    })),
    certifications: (p.certifications ?? []).map((c) => ({
      id: c.id,
      name: c.name,
      issuer: c.issuer ?? "",
      issueDate: c.issueDate ?? "",
    })),
    languages: (p.languages ?? []).map((l) => ({
      id: l.id,
      language: l.language,
      level: (l.level as LangLevel) ?? "intermediate",
    })),
    opportunityTypes: (p.opportunityTypes ?? []) as OppType[],
    targetRegion: (p.targetRegion as TargetRegion) ?? "domestic",
    urgency: (p.urgency as Urgency) ?? "exploring",
    preferredTone: (p.preferredTone as PreferredTone) ?? "warm",
  }
}

export function ProfileView({ profile, initialCompletion }: Props) {
  const t = useT()
  const router = useRouter()

  const [committed, setCommitted] = useState<WizardState>(() => profileToState(profile))
  const [editing, setEditing] = useState<WizardState>(committed)
  const [activeSection, setActiveSection] = useState<SectionKey | null>(null)
  const [saving, setSaving] = useState(false)
  const [completion, setCompletion] = useState(initialCompletion)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Always have the latest committed state available for save.
  const editingRef = useRef(editing)
  editingRef.current = editing

  const startEdit = (section: SectionKey) => {
    setEditing(committed) // begin from the latest committed snapshot
    setActiveSection(section)
  }
  const cancelEdit = () => {
    setActiveSection(null)
  }
  const save = useCallback(async () => {
    setSaving(true)
    try {
      const res = await apiClient("/api/profile", {
        method: "PUT",
        body: JSON.stringify(buildProfilePayload(editingRef.current)),
      })
      if (!res.ok) throw new Error("save failed")
      const data = await res.json()
      if (typeof data.profileCompletion === "number") setCompletion(data.profileCompletion)
      setCommitted(editingRef.current)
      setActiveSection(null)
      larasToast.success(t.profile.saved)
      router.refresh()
    } catch {
      larasToast.error(t.common.loading)
    } finally {
      setSaving(false)
    }
  }, [router, t.common.loading, t.profile.saved])

  // ---- per-section state updaters used while editing ----
  const setBasics = (patch: Partial<WizardState>) =>
    setEditing((s) => ({ ...s, ...patch }))

  const setExperiences = (next: ExperienceInput[]) =>
    setEditing((s) => ({ ...s, experiences: next }))
  const setSkills = (next: SkillInput[]) =>
    setEditing((s) => ({ ...s, skills: next }))
  const setEducations = (next: EducationInput[]) =>
    setEditing((s) => ({ ...s, educations: next }))
  const setCertifications = (next: CertificationInput[]) =>
    setEditing((s) => ({ ...s, certifications: next }))
  const setLanguages = (next: LanguageInput[]) =>
    setEditing((s) => ({ ...s, languages: next }))
  const setPreferences = (patch: Partial<WizardState>) =>
    setEditing((s) => ({ ...s, ...patch }))

  const deleteAccount = useCallback(async () => {
    setDeleting(true)
    try {
      const res = await apiClient("/api/auth/delete", { method: "POST" })
      if (!res.ok) throw new Error("delete failed")
      larasToast.success(t.profile.delete)
      router.push("/")
      router.refresh()
    } catch {
      larasToast.error(t.common.loading)
    } finally {
      setDeleting(false)
      setDeleteOpen(false)
    }
  }, [router, t.common.loading, t.profile.delete])

  const isEditing = (k: SectionKey) => activeSection === k

  return (
    <div className="space-y-8 animate-rise">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
          {t.profile.title}
        </h1>
        <p className="text-muted-foreground">{t.profile.subtitle}</p>
      </div>

      {/* Completion gauge */}
      <Card className="shadow-soft">
        <CardHeader className="flex flex-row items-start justify-between space-y-0">
          <div>
            <CardTitle className="text-base font-medium text-muted-foreground">
              {t.dashboard.completionTitle}
            </CardTitle>
            <CardDescription className="mt-1">{t.dashboard.completionDesc}</CardDescription>
          </div>
          <div className="font-serif text-4xl font-semibold text-primary">{completion}%</div>
        </CardHeader>
        <CardContent className="space-y-3">
          <Progress value={completion} className="h-2.5" />
        </CardContent>
      </Card>

      {/* Sections */}
      <div className="space-y-5">
        {/* BASICS */}
        <SectionCard
          title={t.profile.basics}
          onEdit={() => startEdit("basics")}
          isEditing={isEditing("basics")}
          onSave={save}
          onCancel={cancelEdit}
          saving={saving}
          empty={!hasBasics(committed)}
          emptyLabel={t.profile.empty}
        >
          {isEditing("basics") ? (
            <BasicsEditor state={editing} setBasics={setBasics} />
          ) : (
            <BasicsView state={committed} />
          )}
        </SectionCard>

        {/* SUMMARY */}
        <SectionCard
          title={t.profile.summary}
          onEdit={() => startEdit("summary")}
          isEditing={isEditing("summary")}
          onSave={save}
          onCancel={cancelEdit}
          saving={saving}
          empty={!committed.summary?.trim()}
          emptyLabel={t.profile.empty}
        >
          {isEditing("summary") ? (
            <Textarea
              value={editing.summary}
              onChange={(e) => setBasics({ summary: e.target.value })}
              rows={5}
              placeholder={t.onboarding.summaryHint}
            />
          ) : (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90 text-pretty">
              {committed.summary?.trim() || t.profile.empty}
            </p>
          )}
        </SectionCard>

        {/* EXPERIENCE */}
        <SectionCard
          title={t.profile.experience}
          onEdit={() => startEdit("experiences")}
          isEditing={isEditing("experiences")}
          onSave={save}
          onCancel={cancelEdit}
          saving={saving}
          empty={committed.experiences.length === 0}
          emptyLabel={t.profile.empty}
        >
          {isEditing("experiences") ? (
            <ExperiencesEditor state={editing} setExperiences={setExperiences} />
          ) : (
            <ExperiencesView state={committed} />
          )}
        </SectionCard>

        {/* EDUCATION */}
        <SectionCard
          title={t.profile.education}
          onEdit={() => startEdit("educations")}
          isEditing={isEditing("educations")}
          onSave={save}
          onCancel={cancelEdit}
          saving={saving}
          empty={committed.educations.length === 0}
          emptyLabel={t.profile.empty}
        >
          {isEditing("educations") ? (
            <EducationsEditor state={editing} setEducations={setEducations} />
          ) : (
            <EducationsView state={committed} />
          )}
        </SectionCard>

        {/* SKILLS */}
        <SectionCard
          title={t.profile.skills}
          onEdit={() => startEdit("skills")}
          isEditing={isEditing("skills")}
          onSave={save}
          onCancel={cancelEdit}
          saving={saving}
          empty={committed.skills.length === 0}
          emptyLabel={t.profile.empty}
        >
          {isEditing("skills") ? (
            <SkillsEditor state={editing} setSkills={setSkills} />
          ) : (
            <SkillsView state={committed} />
          )}
        </SectionCard>

        {/* CERTIFICATIONS */}
        <SectionCard
          title={t.profile.certifications}
          onEdit={() => startEdit("certifications")}
          isEditing={isEditing("certifications")}
          onSave={save}
          onCancel={cancelEdit}
          saving={saving}
          empty={committed.certifications.length === 0}
          emptyLabel={t.profile.empty}
        >
          {isEditing("certifications") ? (
            <CertificationsEditor state={editing} setCertifications={setCertifications} />
          ) : (
            <SimpleListView
              items={committed.certifications.map((c) => ({
                id: c.id,
                primary: c.name,
                secondary: [c.issuer, c.issueDate].filter(Boolean).join(" · "),
              }))}
              emptyLabel={t.profile.empty}
            />
          )}
        </SectionCard>

        {/* LANGUAGES */}
        <SectionCard
          title={t.profile.languages}
          onEdit={() => startEdit("languages")}
          isEditing={isEditing("languages")}
          onSave={save}
          onCancel={cancelEdit}
          saving={saving}
          empty={committed.languages.length === 0}
          emptyLabel={t.profile.empty}
        >
          {isEditing("languages") ? (
            <LanguagesEditor state={editing} setLanguages={setLanguages} />
          ) : (
            <SimpleListView
              items={committed.languages.map((l) => ({
                id: l.id,
                primary: l.language,
                secondary: l.level,
              }))}
              emptyLabel={t.profile.empty}
            />
          )}
        </SectionCard>

        {/* PREFERENCES */}
        <SectionCard
          title={t.profile.preferences}
          onEdit={() => startEdit("preferences")}
          isEditing={isEditing("preferences")}
          onSave={save}
          onCancel={cancelEdit}
          saving={saving}
          empty={false}
          emptyLabel={t.profile.empty}
        >
          {isEditing("preferences") ? (
            <PreferencesEditor state={editing} setPreferences={setPreferences} />
          ) : (
            <PreferencesView state={committed} />
          )}
        </SectionCard>
      </div>

      {/* Data portability & deletion */}
      <Separator />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="shadow-soft">
          <CardContent className="space-y-3 p-6">
            <div className="flex items-start gap-3">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Download className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-serif text-base font-semibold">{t.profile.export}</h3>
                <p className="mt-1 text-xs text-muted-foreground">{t.profile.exportDesc}</p>
              </div>
            </div>
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => window.open("/api/export", "_blank")}
            >
              <ExternalLink className="h-4 w-4" />
              {t.profile.export}
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-soft border-destructive/20">
          <CardContent className="space-y-3 p-6">
            <div className="flex items-start gap-3">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-serif text-base font-semibold text-destructive">
                  {t.profile.delete}
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">{t.profile.deleteConfirm}</p>
              </div>
            </div>
            <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
              <DialogTrigger asChild>
                <Button variant="destructive" className="w-full sm:w-auto">
                  <Trash2 className="h-4 w-4" />
                  {t.profile.delete}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t.profile.delete}</DialogTitle>
                  <DialogDescription>{t.profile.deleteConfirm}</DialogDescription>
                </DialogHeader>
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                  {t.profile.deleteConfirm}
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline" disabled={deleting}>
                      {t.profile.cancel}
                    </Button>
                  </DialogClose>
                  <Button
                    variant="destructive"
                    onClick={deleteAccount}
                    disabled={deleting}
                  >
                    {deleting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                    {t.profile.delete}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Section card wrapper
// ---------------------------------------------------------------------------
function SectionCard({
  title,
  empty,
  emptyLabel,
  isEditing,
  onEdit,
  onSave,
  onCancel,
  saving,
  children,
}: {
  title: string
  empty?: boolean
  emptyLabel: string
  isEditing: boolean
  onEdit: () => void
  onSave: () => void
  onCancel: () => void
  saving: boolean
  children: React.ReactNode
}) {
  const t = useT()
  return (
    <Card className="shadow-soft">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="font-serif text-lg font-semibold tracking-tight">
          {title}
        </CardTitle>
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={onCancel}
                disabled={saving}
              >
                <X className="h-3.5 w-3.5" />
                {t.profile.cancel}
              </Button>
              <Button size="sm" onClick={onSave} disabled={saving}>
                {saving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                {t.profile.save}
              </Button>
            </>
          ) : (
            <Button variant="outline" size="sm" onClick={onEdit}>
              <Pencil className="h-3.5 w-3.5" />
              {t.profile.edit}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {empty && !isEditing ? (
          <p className="text-sm italic text-muted-foreground">{emptyLabel}</p>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// View helpers
// ---------------------------------------------------------------------------
function hasBasics(s: WizardState): boolean {
  return Boolean(s.fullName || s.headline || s.email || s.phone || s.location || s.linkedin || s.portfolio)
}

function BasicsView({ state }: { state: WizardState }) {
  const t = useT()
  const rows: [string, string][] = [
    [t.onboarding.fullName, state.fullName],
    [t.onboarding.headline, state.headline],
    [t.onboarding.email, state.email],
    [t.onboarding.phone, state.phone],
    [t.onboarding.location, state.location],
    [t.onboarding.linkedin, state.linkedin],
    [t.onboarding.portfolio, state.portfolio],
  ].filter((r): r is [string, string] => Boolean(r[1]?.trim()))
  if (rows.length === 0) return <p className="text-sm italic text-muted-foreground">{t.profile.empty}</p>
  return (
    <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
      {rows.map(([k, v]) => (
        <div key={k} className="space-y-0.5">
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {k}
          </dt>
          <dd className="break-words text-sm font-medium text-foreground">
            {/^https?:\/\//.test(v) ? (
              <a
                href={v}
                target="_blank"
                rel="noreferrer noopener"
                className="text-primary underline-offset-4 hover:underline"
              >
                {v}
              </a>
            ) : (
              v
            )}
          </dd>
        </div>
      ))}
    </dl>
  )
}

function ExperiencesView({ state }: { state: WizardState }) {
  if (state.experiences.length === 0) return null
  return (
    <ul className="space-y-4">
      {state.experiences.map((e) => {
        const dateLabel = e.current
          ? `${e.startDate || "—"} — Present`
          : [e.startDate, e.endDate].filter(Boolean).join(" — ") || null
        return (
          <li key={e.id} className="space-y-1.5">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
              <p className="font-medium text-foreground">{e.title || "—"}</p>
              {dateLabel && (
                <span className="text-xs text-muted-foreground">{dateLabel}</span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {e.organization}
              {e.type && e.type !== "work" && ` · ${e.type}`}
            </p>
            {e.description && (
              <p className="text-sm text-foreground/90 text-pretty">{e.description}</p>
            )}
            {e.achievements.trim() && (
              <ul className="ml-4 list-disc space-y-0.5 text-sm text-foreground/80 marker:text-muted-foreground">
                {e.achievements
                  .split("\n")
                  .map((s) => s.trim())
                  .filter(Boolean)
                  .map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
              </ul>
            )}
            {e.contextNotes.trim() && (
              <p className="rounded-md bg-muted/40 px-3 py-1.5 text-xs italic text-muted-foreground">
                {e.contextNotes}
              </p>
            )}
          </li>
        )
      })}
    </ul>
  )
}

function EducationsView({ state }: { state: WizardState }) {
  if (state.educations.length === 0) return null
  return (
    <ul className="space-y-3">
      {state.educations.map((e) => {
        const dateLabel = e.current
          ? `${e.startDate || "—"} — Present`
          : [e.startDate, e.endDate].filter(Boolean).join(" — ") || null
        return (
          <li key={e.id} className="space-y-0.5">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
              <p className="font-medium text-foreground">{e.institution}</p>
              {dateLabel && (
                <span className="text-xs text-muted-foreground">{dateLabel}</span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {[e.degree, e.field].filter(Boolean).join(" · ")}
              {e.gpa && ` · GPA ${e.gpa}`}
            </p>
          </li>
        )
      })}
    </ul>
  )
}

function SkillsView({ state }: { state: WizardState }) {
  if (state.skills.length === 0) return null
  const byCat: Record<string, SkillInput[]> = {}
  for (const s of state.skills) {
    const k = s.category || "other"
    ;(byCat[k] ||= []).push(s)
  }
  const catLabel: Record<string, string> = {
    technical: "Technical",
    soft: "Soft",
    tool: "Tool",
    domain: "Domain",
    other: "Other",
  }
  return (
    <div className="space-y-4">
      {Object.entries(byCat).map(([cat, items]) => (
        <div key={cat} className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {catLabel[cat] ?? cat}
          </p>
          <div className="flex flex-wrap gap-2">
            {items.map((s) => (
              <Badge
                key={s.id}
                variant="secondary"
                className="gap-1 rounded-full bg-secondary/70 py-1 pl-3 pr-2"
              >
                <span className="font-medium">{s.name}</span>
                {s.proficiency && (
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    {s.proficiency}
                  </span>
                )}
              </Badge>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function SimpleListView({
  items,
  emptyLabel,
}: {
  items: { id: string; primary: string; secondary?: string | null }[]
  emptyLabel: string
}) {
  if (items.length === 0) return <p className="text-sm italic text-muted-foreground">{emptyLabel}</p>
  return (
    <ul className="divide-y divide-border">
      {items.map((it) => (
        <li key={it.id} className="flex flex-wrap items-baseline justify-between gap-x-3 py-2">
          <span className="text-sm font-medium text-foreground">{it.primary}</span>
          {it.secondary && (
            <span className="text-xs text-muted-foreground">{it.secondary}</span>
          )}
        </li>
      ))}
    </ul>
  )
}

function PreferencesView({ state }: { state: WizardState }) {
  const t = useT()
  const oppLabel: Record<OppType, string> = {
    work: t.onboarding.opWork,
    org: t.onboarding.opOrg,
    scholarship: t.onboarding.opScholarship,
    volunteer: t.onboarding.opVolunteer,
  }
  const regionLabel: Record<TargetRegion, string> = {
    domestic: t.onboarding.regionDomestic,
    international: t.onboarding.regionInternational,
  }
  const urgencyLabel: Record<Urgency, string> = {
    "deadline-soon": t.onboarding.urgencyDeadline,
    active: t.onboarding.urgencyActive,
    exploring: t.onboarding.urgencyExploring,
  }
  const toneLabel: Record<PreferredTone, string> = {
    formal: t.onboarding.toneFormal,
    direct: t.onboarding.toneDirect,
    warm: t.onboarding.toneWarm,
  }
  const rows: [string, string | React.ReactNode][] = [
    [
      t.onboarding.opportunityTypes,
      state.opportunityTypes.length ? (
        <div className="flex flex-wrap gap-1.5">
          {state.opportunityTypes.map((o) => (
            <Badge key={o} variant="outline" className="rounded-full">
              {oppLabel[o]}
            </Badge>
          ))}
        </div>
      ) : (
        "—"
      ),
    ],
    [t.onboarding.targetRegion, regionLabel[state.targetRegion] ?? "—"],
    [t.onboarding.urgency, urgencyLabel[state.urgency] ?? "—"],
    [t.onboarding.preferredTone, toneLabel[state.preferredTone] ?? "—"],
  ]
  return (
    <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
      {rows.map(([k, v]) => (
        <div key={k} className="space-y-0.5">
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {k}
          </dt>
          <dd className="text-sm font-medium text-foreground">{v}</dd>
        </div>
      ))}
    </dl>
  )
}

// ---------------------------------------------------------------------------
// Editors
// ---------------------------------------------------------------------------
function BasicsEditor({
  state,
  setBasics,
}: {
  state: WizardState
  setBasics: (patch: Partial<WizardState>) => void
}) {
  const t = useT()
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Labeled label={t.onboarding.fullName}>
          <Input value={state.fullName} onChange={(e) => setBasics({ fullName: e.target.value })} />
        </Labeled>
        <Labeled label={t.onboarding.headline}>
          <Input value={state.headline} onChange={(e) => setBasics({ headline: e.target.value })} />
        </Labeled>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Labeled label={t.onboarding.email}>
          <Input type="email" value={state.email} onChange={(e) => setBasics({ email: e.target.value })} />
        </Labeled>
        <Labeled label={t.onboarding.phone}>
          <Input value={state.phone} onChange={(e) => setBasics({ phone: e.target.value })} />
        </Labeled>
      </div>
      <Labeled label={t.onboarding.location}>
        <Input value={state.location} onChange={(e) => setBasics({ location: e.target.value })} />
      </Labeled>
      <div className="grid gap-4 sm:grid-cols-2">
        <Labeled label={t.onboarding.linkedin}>
          <Input value={state.linkedin} onChange={(e) => setBasics({ linkedin: e.target.value })} />
        </Labeled>
        <Labeled label={t.onboarding.portfolio}>
          <Input value={state.portfolio} onChange={(e) => setBasics({ portfolio: e.target.value })} />
        </Labeled>
      </div>
    </div>
  )
}

function ExperiencesEditor({
  state,
  setExperiences,
}: {
  state: WizardState
  setExperiences: (next: ExperienceInput[]) => void
}) {
  const t = useT()
  const setItem = (id: string, patch: Partial<ExperienceInput>) =>
    setExperiences(state.experiences.map((e) => (e.id === id ? { ...e, ...patch } : e)))
  const remove = (id: string) => setExperiences(state.experiences.filter((e) => e.id !== id))
  const add = () => setExperiences([...state.experiences, emptyExperience()])

  return (
    <div className="space-y-4">
      {state.experiences.map((e, i) => (
        <div key={e.id} className="rounded-xl border border-border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="font-serif text-sm font-semibold text-muted-foreground">#{i + 1}</span>
            <Button type="button" variant="ghost" size="sm" onClick={() => remove(e.id)} className="text-destructive">
              <X className="h-3.5 w-3.5" />
              {t.common.delete}
            </Button>
          </div>
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-[1fr_2fr]">
              <Labeled label={t.onboarding.expType}>
                <Select value={e.type} onValueChange={(v) => setItem(e.id, { type: v as ExpType })}>
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
              </Labeled>
              <Labeled label={t.onboarding.expTitle}>
                <Input value={e.title} onChange={(ev) => setItem(e.id, { title: ev.target.value })} />
              </Labeled>
            </div>
            <Labeled label={t.onboarding.expOrg}>
              <Input value={e.organization} onChange={(ev) => setItem(e.id, { organization: ev.target.value })} />
            </Labeled>
            <div className="grid gap-3 sm:grid-cols-2">
              <Labeled label={t.onboarding.expStart}>
                <Input value={e.startDate} onChange={(ev) => setItem(e.id, { startDate: ev.target.value })} placeholder="2023-01" />
              </Labeled>
              <Labeled label={t.onboarding.expEnd}>
                <Input
                  value={e.current ? "Present" : e.endDate}
                  onChange={(ev) => setItem(e.id, { endDate: ev.target.value })}
                  placeholder="2024-05 / Present"
                  disabled={e.current}
                />
              </Labeled>
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
            <Labeled label={t.onboarding.expDesc}>
              <Textarea value={e.description} onChange={(ev) => setItem(e.id, { description: ev.target.value })} rows={2} />
            </Labeled>
            <Labeled label={t.onboarding.expAchievements} hint={t.onboarding.expAchievementsHint}>
              <Textarea value={e.achievements} onChange={(ev) => setItem(e.id, { achievements: ev.target.value })} rows={3} />
            </Labeled>
            <Labeled label={t.onboarding.expContext} hint={t.onboarding.expContextHint}>
              <Textarea value={e.contextNotes} onChange={(ev) => setItem(e.id, { contextNotes: ev.target.value })} rows={3} />
            </Labeled>
          </div>
        </div>
      ))}
      <Button type="button" variant="outline" onClick={add} className="w-full border-dashed">
        <Plus className="h-4 w-4" />
        {t.onboarding.addExperience}
      </Button>
    </div>
  )
}

function EducationsEditor({
  state,
  setEducations,
}: {
  state: WizardState
  setEducations: (next: EducationInput[]) => void
}) {
  const t = useT()
  const setItem = (id: string, patch: Partial<EducationInput>) =>
    setEducations(state.educations.map((e) => (e.id === id ? { ...e, ...patch } : e)))
  const remove = (id: string) => setEducations(state.educations.filter((e) => e.id !== id))
  const add = () => setEducations([...state.educations, emptyEducation()])

  return (
    <div className="space-y-4">
      {state.educations.map((e, i) => (
        <div key={e.id} className="rounded-xl border border-border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="font-serif text-sm font-semibold text-muted-foreground">#{i + 1}</span>
            <Button type="button" variant="ghost" size="sm" onClick={() => remove(e.id)} className="text-destructive">
              <X className="h-3.5 w-3.5" />
              {t.common.delete}
            </Button>
          </div>
          <div className="space-y-3">
            <Labeled label={t.onboarding.eduInstitution}>
              <Input value={e.institution} onChange={(ev) => setItem(e.id, { institution: ev.target.value })} />
            </Labeled>
            <div className="grid gap-3 sm:grid-cols-2">
              <Labeled label={t.onboarding.eduDegree}>
                <Input value={e.degree} onChange={(ev) => setItem(e.id, { degree: ev.target.value })} />
              </Labeled>
              <Labeled label={t.onboarding.eduField}>
                <Input value={e.field} onChange={(ev) => setItem(e.id, { field: ev.target.value })} />
              </Labeled>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Labeled label={t.onboarding.eduStart}>
                <Input value={e.startDate} onChange={(ev) => setItem(e.id, { startDate: ev.target.value })} placeholder="2021-08" />
              </Labeled>
              <Labeled label={t.onboarding.eduEnd}>
                <Input
                  value={e.current ? "Present" : e.endDate}
                  onChange={(ev) => setItem(e.id, { endDate: ev.target.value })}
                  placeholder="2025-06 / Present"
                  disabled={e.current}
                />
              </Labeled>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={e.current}
                  onCheckedChange={(v) =>
                    setItem(e.id, { current: v === true, endDate: v === true ? "" : e.endDate })
                  }
                />
                {t.onboarding.eduCurrent}
              </label>
              <div className="w-full sm:w-32">
                <Input value={e.gpa} onChange={(ev) => setItem(e.id, { gpa: ev.target.value })} placeholder={t.onboarding.eduGpa} />
              </div>
            </div>
          </div>
        </div>
      ))}
      <Button type="button" variant="outline" onClick={add} className="w-full border-dashed">
        <Plus className="h-4 w-4" />
        {t.onboarding.addEducation}
      </Button>
    </div>
  )
}

function SkillsEditor({
  state,
  setSkills,
}: {
  state: WizardState
  setSkills: (next: SkillInput[]) => void
}) {
  const t = useT()
  const setItem = (id: string, patch: Partial<SkillInput>) =>
    setSkills(state.skills.map((s) => (s.id === id ? { ...s, ...patch } : s)))
  const remove = (id: string) => setSkills(state.skills.filter((s) => s.id !== id))
  const add = () => setSkills([...state.skills, emptySkill()])

  return (
    <div className="space-y-4">
      {state.skills.map((s, i) => (
        <div key={s.id} className="rounded-xl border border-border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="font-serif text-sm font-semibold text-muted-foreground">#{i + 1}</span>
            <Button type="button" variant="ghost" size="sm" onClick={() => remove(s.id)} className="text-destructive">
              <X className="h-3.5 w-3.5" />
              {t.common.delete}
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Labeled label={t.onboarding.skillName}>
              <Input value={s.name} onChange={(e) => setItem(s.id, { name: e.target.value })} />
            </Labeled>
            <Labeled label={t.onboarding.skillCategory}>
              <Select value={s.category} onValueChange={(v) => setItem(s.id, { category: v as SkillCategory })}>
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
            </Labeled>
            <Labeled label={t.onboarding.skillProficiency}>
              <Select value={s.proficiency} onValueChange={(v) => setItem(s.id, { proficiency: v as SkillProficiency })}>
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
            </Labeled>
          </div>
          <Labeled label={t.onboarding.skillContext} hint={t.onboarding.skillContextHint}>
            <Textarea value={s.context} onChange={(e) => setItem(s.id, { context: e.target.value })} rows={2} />
          </Labeled>
        </div>
      ))}
      <Button type="button" variant="outline" onClick={add} className="w-full border-dashed">
        <Plus className="h-4 w-4" />
        {t.onboarding.addSkill}
      </Button>
    </div>
  )
}

function CertificationsEditor({
  state,
  setCertifications,
}: {
  state: WizardState
  setCertifications: (next: CertificationInput[]) => void
}) {
  const t = useT()
  const setItem = (id: string, patch: Partial<CertificationInput>) =>
    setCertifications(state.certifications.map((c) => (c.id === id ? { ...c, ...patch } : c)))
  const remove = (id: string) => setCertifications(state.certifications.filter((c) => c.id !== id))
  const add = () => setCertifications([...state.certifications, emptyCertification()])

  return (
    <div className="space-y-3">
      {state.certifications.map((c, i) => (
        <div key={c.id} className="rounded-xl border border-border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="font-serif text-sm font-semibold text-muted-foreground">#{i + 1}</span>
            <Button type="button" variant="ghost" size="sm" onClick={() => remove(c.id)} className="text-destructive">
              <X className="h-3.5 w-3.5" />
              {t.common.delete}
            </Button>
          </div>
          <div className="space-y-3">
            <Labeled label={t.onboarding.certName}>
              <Input value={c.name} onChange={(e) => setItem(c.id, { name: e.target.value })} />
            </Labeled>
            <div className="grid gap-3 sm:grid-cols-2">
              <Labeled label={t.onboarding.certIssuer}>
                <Input value={c.issuer} onChange={(e) => setItem(c.id, { issuer: e.target.value })} />
              </Labeled>
              <Labeled label={t.onboarding.certDate}>
                <Input value={c.issueDate} onChange={(e) => setItem(c.id, { issueDate: e.target.value })} placeholder="2024-05" />
              </Labeled>
            </div>
          </div>
        </div>
      ))}
      <Button type="button" variant="outline" onClick={add} className="w-full border-dashed">
        <Plus className="h-4 w-4" />
        {t.onboarding.addCert}
      </Button>
    </div>
  )
}

function LanguagesEditor({
  state,
  setLanguages,
}: {
  state: WizardState
  setLanguages: (next: LanguageInput[]) => void
}) {
  const t = useT()
  const setItem = (id: string, patch: Partial<LanguageInput>) =>
    setLanguages(state.languages.map((l) => (l.id === id ? { ...l, ...patch } : l)))
  const remove = (id: string) => setLanguages(state.languages.filter((l) => l.id !== id))
  const add = () => setLanguages([...state.languages, emptyLanguage()])

  return (
    <div className="space-y-3">
      {state.languages.map((l, i) => (
        <div key={l.id} className="rounded-xl border border-border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="font-serif text-sm font-semibold text-muted-foreground">#{i + 1}</span>
            <Button type="button" variant="ghost" size="sm" onClick={() => remove(l.id)} className="text-destructive">
              <X className="h-3.5 w-3.5" />
              {t.common.delete}
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Labeled label={t.onboarding.langName}>
              <Input value={l.language} onChange={(e) => setItem(l.id, { language: e.target.value })} />
            </Labeled>
            <Labeled label={t.onboarding.langLevel}>
              <Select value={l.level} onValueChange={(v) => setItem(l.id, { level: v as LangLevel })}>
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
            </Labeled>
          </div>
        </div>
      ))}
      <Button type="button" variant="outline" onClick={add} className="w-full border-dashed">
        <Plus className="h-4 w-4" />
        {t.onboarding.addLanguage}
      </Button>
    </div>
  )
}

function PreferencesEditor({
  state,
  setPreferences,
}: {
  state: WizardState
  setPreferences: (patch: Partial<WizardState>) => void
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
    setPreferences({
      opportunityTypes: exists
        ? state.opportunityTypes.filter((x) => x !== v)
        : [...state.opportunityTypes, v],
    })
  }

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <Label className="text-sm font-medium">{t.onboarding.opportunityTypes}</Label>
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

      <section className="space-y-2">
        <Label className="text-sm font-medium">{t.onboarding.targetRegion}</Label>
        <RadioGroup
          value={state.targetRegion}
          onValueChange={(v) => setPreferences({ targetRegion: v as TargetRegion })}
          className="grid gap-2 sm:grid-cols-2"
        >
          <RadioCard value="domestic" label={t.onboarding.regionDomestic} />
          <RadioCard value="international" label={t.onboarding.regionInternational} />
        </RadioGroup>
      </section>

      <section className="space-y-2">
        <Label className="text-sm font-medium">{t.onboarding.urgency}</Label>
        <RadioGroup
          value={state.urgency}
          onValueChange={(v) => setPreferences({ urgency: v as Urgency })}
          className="grid gap-2 sm:grid-cols-3"
        >
          <RadioCard value="deadline-soon" label={t.onboarding.urgencyDeadline} />
          <RadioCard value="active" label={t.onboarding.urgencyActive} />
          <RadioCard value="exploring" label={t.onboarding.urgencyExploring} />
        </RadioGroup>
      </section>

      <section className="space-y-2">
        <Label className="text-sm font-medium">{t.onboarding.preferredTone}</Label>
        <RadioGroup
          value={state.preferredTone}
          onValueChange={(v) => setPreferences({ preferredTone: v as PreferredTone })}
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

function Labeled({
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
