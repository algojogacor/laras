"use client"

import { useState, useEffect } from "react"
import {
  Plus, Trash2, Loader2, Sparkles, X, ExternalLink, Calendar, MapPin,
  ChevronLeft, ChevronRight, Briefcase, GraduationCap, HandHeart, Users, AlertTriangle, FileText, Link2, Unlink,
} from "lucide-react"
import { toast } from "sonner"
import { useT } from "@/components/providers/locale-provider"
import { apiClient } from "@/lib/api-client"
import type { Locale } from "@/lib/i18n/dictionary"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

type Application = {
  id: string; type: string; position: string; organization: string | null; status: string
  deadline: string | null; location: string | null; url: string | null; summary: string | null
  notes: string | null; jobDescription: string | null
  createdAt: string; updatedAt: string
  linkedDocIds: string[]
}

type DocRef = { id: string; type: string; title: string }

const COLUMNS = ["saved", "applied", "interview", "offer", "rejected", "accepted"] as const
const COLUMN_ORDER = [...COLUMNS] as string[]

const TYPE_ICON: Record<string, typeof Briefcase> = {
  work: Briefcase, org: Users, scholarship: GraduationCap, volunteer: HandHeart,
}

function daysUntil(deadline: string | null, t: any): { text: string; tone: "overdue" | "soon" | "normal" | "none" } {
  if (!deadline) return { text: t.applications.noDeadline, tone: "none" }
  const d = new Date(deadline)
  if (isNaN(d.getTime())) return { text: deadline, tone: "none" }
  const now = new Date()
  const diff = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  if (diff < 0) return { text: t.applications.overdue, tone: "overdue" }
  if (diff <= 3) return { text: `${diff} ${t.applications.daysLeft} · ${t.applications.soon}`, tone: "soon" }
  return { text: `${diff} ${t.applications.daysLeft}`, tone: "normal" }
}

export function ApplicationsBoard({ initialApplications, documents, locale }: { initialApplications: Application[]; documents: DocRef[]; locale: Locale }) {
  const t = useT()
  const [apps, setApps] = useState<Application[]>(initialApplications)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Application | null>(null)

  // refresh from server on mount (in case of stale props)
  useEffect(() => {
    apiClient("/api/applications").then((r) => r.json()).then((d) => {
      if (d.applications) setApps(d.applications.map((a: any) => ({ ...a, linkedDocIds: a.linkedDocIds || [] })))
    }).catch(() => {})
  }, [])

  function grouped(status: string) {
    return apps.filter((a) => a.status === status)
  }

  async function moveStatus(id: string, direction: -1 | 1) {
    const app = apps.find((a) => a.id === id)
    if (!app) return
    const idx = COLUMN_ORDER.indexOf(app.status)
    const next = COLUMN_ORDER[Math.max(0, Math.min(COLUMN_ORDER.length - 1, idx + direction))]
    if (next === app.status) return
    // optimistic
    setApps((prev) => prev.map((a) => (a.id === id ? { ...a, status: next } : a)))
    try {
      await apiClient(`/api/applications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      })
    } catch {
      toast.error(t.auth.errGeneric)
      setApps((prev) => prev.map((a) => (a.id === id ? { ...a, status: app.status } : a)))
    }
  }

  async function deleteApp(id: string) {
    setApps((prev) => prev.filter((a) => a.id !== id))
    try {
      await apiClient(`/api/applications/${id}`, { method: "DELETE" })
      toast.success(t.applications.saved)
    } catch {
      toast.error(t.auth.errGeneric)
    }
  }

  function openNew() { setEditing(null); setDialogOpen(true) }
  function openEdit(app: Application) { setEditing(app); setDialogOpen(true) }

  function onSaved(app: Application) {
    setApps((prev) => {
      const exists = prev.some((a) => a.id === app.id)
      return exists ? prev.map((a) => (a.id === app.id ? app : a)) : [...prev, app]
    })
    setDialogOpen(false)
  }

  return (
    <div className="space-y-6 animate-rise">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-serif text-3xl font-semibold tracking-tight">{t.applications.title}</h1>
          <p className="mt-1.5 text-muted-foreground">{t.applications.subtitle}</p>
        </div>
        <Button onClick={openNew} size="sm" className="shadow-soft">
          <Plus className="mr-1.5 h-4 w-4" />{t.applications.new}
        </Button>
      </div>

      {apps.length === 0 ? (
        <Card className="shadow-soft">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <Briefcase className="h-6 w-6 text-primary" />
            </div>
            <p className="mt-4 max-w-sm text-sm text-muted-foreground">{t.applications.empty}</p>
            <Button onClick={openNew} className="mt-5 shadow-soft">
              <Plus className="mr-1.5 h-4 w-4" />{t.applications.new}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          {COLUMNS.map((col) => {
            const items = grouped(col)
            return (
              <div key={col} className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <span className={cn("h-2 w-2 rounded-full",
                      col === "saved" && "bg-slate-400",
                      col === "applied" && "bg-blue-400",
                      col === "interview" && "bg-amber-400",
                      col === "offer" && "bg-emerald-400",
                      col === "rejected" && "bg-red-400",
                      col === "accepted" && "bg-primary",
                    )} />
                    <h2 className="text-sm font-semibold">{t.applications.columns[col]}</h2>
                  </div>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{items.length}</span>
                </div>
                <div className="space-y-2">
                  {items.map((app) => {
                    const Icon = TYPE_ICON[app.type] || Briefcase
                    const dl = daysUntil(app.deadline, t)
                    return (
                      <Card key={app.id} className="group shadow-soft transition-all hover:shadow-lift cursor-pointer" onClick={() => openEdit(app)}>
                        <CardContent className="p-3.5">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                              <Icon className="h-3.5 w-3.5" />
                              <span className="text-[10px] uppercase tracking-wide">{t.applications.type}: {app.type}</span>
                            </div>
                            <div className="flex opacity-0 transition-opacity group-hover:opacity-100" onClick={(e) => e.stopPropagation()}>
                              <button onClick={() => moveStatus(app.id, -1)} disabled={COLUMN_ORDER.indexOf(app.status) === 0} className="rounded p-0.5 text-muted-foreground hover:bg-secondary disabled:opacity-30" aria-label={t.applications.moveLeft}>
                                <ChevronLeft className="h-3.5 w-3.5" />
                              </button>
                              <button onClick={() => moveStatus(app.id, 1)} disabled={COLUMN_ORDER.indexOf(app.status) === COLUMN_ORDER.length - 1} className="rounded p-0.5 text-muted-foreground hover:bg-secondary disabled:opacity-30" aria-label={t.applications.moveRight}>
                                <ChevronRight className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                          <p className="mt-1.5 font-serif text-sm font-semibold leading-snug">{app.position}</p>
                          {app.organization && <p className="text-xs text-muted-foreground">{app.organization}</p>}
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px]">
                            {app.location && <span className="flex items-center gap-0.5 text-muted-foreground"><MapPin className="h-3 w-3" />{app.location}</span>}
                            {app.deadline && (
                              <span className={cn("flex items-center gap-0.5 rounded px-1.5 py-0.5 font-medium",
                                dl.tone === "overdue" && "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400",
                                dl.tone === "soon" && "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
                                dl.tone === "normal" && "bg-muted text-muted-foreground",
                                dl.tone === "none" && "text-muted-foreground",
                              )}>
                                <Calendar className="h-3 w-3" />{dl.text}
                              </span>
                            )}
                          </div>
                          {app.summary && (
                            <p className="mt-2 line-clamp-2 text-[11px] italic text-muted-foreground/80">{app.summary.slice(0, 100)}…</p>
                          )}
                          {(app.linkedDocIds || []).length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {(app.linkedDocIds || []).slice(0, 3).map((did) => {
                                const doc = documents.find((d) => d.id === did)
                                if (!doc) return null
                                return (
                                  <span key={did} className="flex items-center gap-0.5 rounded bg-primary/10 px-1.5 py-0.5 text-[9px] font-medium text-primary">
                                    <FileText className="h-2.5 w-2.5" />
                                    {t.documents.types[doc.type as keyof typeof t.documents.types] || doc.type}
                                  </span>
                                )
                              })}
                              {(app.linkedDocIds || []).length > 3 && (
                                <span className="text-[9px] text-muted-foreground">+{(app.linkedDocIds || []).length - 3}</span>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )
                  })}
                  {items.length === 0 && (
                    <div className="rounded-lg border border-dashed border-border py-6 text-center text-xs text-muted-foreground">—</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <ApplicationDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        onSaved={onSaved}
        locale={locale}
        documents={documents}
        onLinkChange={(appId, docId, linked) => {
          setApps((prev) => prev.map((a) => a.id === appId ? {
            ...a,
            linkedDocIds: linked ? [...a.linkedDocIds, docId] : a.linkedDocIds.filter((id) => id !== docId),
          } : a))
          if (editing && editing.id === appId) {
            setEditing({
              ...editing,
              linkedDocIds: linked ? [...editing.linkedDocIds, docId] : editing.linkedDocIds.filter((id) => id !== docId),
            })
          }
        }}
      />
    </div>
  )
}

/* ---------- Add/Edit dialog with AI summarize ---------- */
function ApplicationDialog({
  open, onOpenChange, editing, onSaved, locale, documents, onLinkChange,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  editing: Application | null
  onSaved: (a: Application) => void
  locale: Locale
  documents: DocRef[]
  onLinkChange: (appId: string, docId: string, linked: boolean) => void
}) {
  const t = useT()
  const [form, setForm] = useState({
    type: "work", position: "", organization: "", status: "saved",
    deadline: "", location: "", url: "", notes: "", jobDescription: "",
  })
  const [summary, setSummary] = useState<any>(null)
  const [summarizing, setSummarizing] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      if (editing) {
        setForm({
          type: editing.type, position: editing.position, organization: editing.organization || "",
          status: editing.status, deadline: editing.deadline || "", location: editing.location || "",
          url: editing.url || "", notes: editing.notes || "", jobDescription: editing.jobDescription || "",
        })
        setSummary(editing.summary ? (typeof editing.summary === "string" ? JSON.parse(editing.summary) : editing.summary) : null)
      } else {
        setForm({ type: "work", position: "", organization: "", status: "saved", deadline: "", location: "", url: "", notes: "", jobDescription: "" })
        setSummary(null)
      }
    }
  }, [open, editing])

  async function summarize() {
    if (form.jobDescription.length < 20) { toast.error(t.applications.jobDescriptionHint); return }
    setSummarizing(true)
    try {
      const res = await apiClient("/api/applications/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobDescription: form.jobDescription, locale }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(t.auth.errGeneric); return }
      setSummary(data.summary)
      toast.success(t.applications.summary)
    } catch { toast.error(t.auth.errGeneric) }
    finally { setSummarizing(false) }
  }

  async function save() {
    if (!form.position.trim()) { toast.error(t.auth.errGeneric); return }
    setSaving(true)
    try {
      const payload = {
        ...form,
        deadline: form.deadline || null,
        summary: summary ? JSON.stringify(summary) : null,
      }
      const res = editing
        ? await apiClient(`/api/applications/${editing.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
        : await apiClient("/api/applications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      const data = await res.json()
      if (!res.ok) { toast.error(t.auth.errGeneric); return }
      toast.success(t.applications.saved)
      onSaved({ ...editing, ...data.application, id: data.application.id } as Application)
    } catch { toast.error(t.auth.errGeneric) }
    finally { setSaving(false) }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">{editing ? t.applications.position : t.applications.new}</DialogTitle>
          <DialogDescription>{t.applications.subtitle}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">{t.applications.type}</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="work">{t.onboarding.opWork}</SelectItem>
                  <SelectItem value="org">{t.onboarding.opOrg}</SelectItem>
                  <SelectItem value="scholarship">{t.onboarding.opScholarship}</SelectItem>
                  <SelectItem value="volunteer">{t.onboarding.opVolunteer}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t.applications.status}</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {COLUMNS.map((c) => <SelectItem key={c} value={c}>{t.applications.columns[c]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">{t.applications.position} *</Label>
            <Input value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} className="h-9" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">{t.applications.organization}</Label>
              <Input value={form.organization} onChange={(e) => setForm({ ...form, organization: e.target.value })} className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t.applications.location}</Label>
              <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="h-9" />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">{t.applications.deadline}</Label>
              <Input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t.applications.url}</Label>
              <Input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} className="h-9" placeholder="https://..." />
            </div>
          </div>

          {/* AI summarize */}
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
            <div className="mb-1.5 flex items-center justify-between">
              <Label className="text-xs font-medium">{t.applications.jobDescription}</Label>
              <Button onClick={summarize} disabled={summarizing || form.jobDescription.length < 20} variant="outline" size="sm" className="h-7 text-xs">
                {summarizing ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Sparkles className="mr-1 h-3 w-3" />}
                {summarizing ? t.applications.summarizing : t.applications.summarize}
              </Button>
            </div>
            <Textarea rows={3} value={form.jobDescription} onChange={(e) => setForm({ ...form, jobDescription: e.target.value })} placeholder={t.applications.jobDescriptionHint} className="text-xs" />
          </div>

          {summary && (
            <div className="rounded-lg border border-border bg-card p-3 space-y-2">
              <p className="text-xs font-medium">{t.applications.summary}</p>
              {summary.highlights && <p className="text-xs text-muted-foreground">{summary.highlights}</p>}
              {summary.requirements?.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold uppercase text-muted-foreground">Requirements</p>
                  <ul className="mt-1 space-y-0.5">{summary.requirements.slice(0, 5).map((r: string, i: number) => <li key={i} className="text-xs text-muted-foreground">• {r}</li>)}</ul>
                </div>
              )}
              {summary.deadline && <p className="text-xs"><span className="font-medium">{t.applications.deadline}:</span> {summary.deadline}</p>}
            </div>
          )}

          {/* Linked documents */}
          {editing && documents.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1"><Link2 className="h-3 w-3" />{t.applications.linkedDocs}</Label>
              <div className="max-h-32 space-y-1 overflow-y-auto scrollbar-laras rounded-lg border border-border p-2">
                {documents.map((doc) => {
                  const linked = (editing.linkedDocIds || []).includes(doc.id)
                  return (
                    <div key={doc.id} className="flex items-center justify-between rounded px-1.5 py-1 hover:bg-secondary">
                      <div className="flex min-w-0 items-center gap-1.5">
                        <FileText className="h-3 w-3 shrink-0 text-muted-foreground" />
                        <span className="truncate text-xs">{doc.title}</span>
                        <span className="shrink-0 text-[9px] text-muted-foreground">({t.documents.types[doc.type as keyof typeof t.documents.types] || doc.type})</span>
                      </div>
                      <button
                        onClick={async () => {
                          try {
                            if (linked) {
                              await apiClient(`/api/applications/${editing.id}/documents?documentId=${doc.id}`, { method: "DELETE" })
                              onLinkChange(editing.id, doc.id, false)
                            } else {
                              await apiClient(`/api/applications/${editing.id}/documents`, {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ documentId: doc.id }),
                              })
                              onLinkChange(editing.id, doc.id, true)
                            }
                            toast.success(t.applications.saved)
                          } catch { toast.error(t.auth.errGeneric) }
                        }}
                        className={cn("ml-1.5 shrink-0 rounded p-0.5 transition-colors", linked ? "text-primary hover:bg-destructive/10 hover:text-destructive" : "text-muted-foreground hover:text-primary")}
                        aria-label={linked ? "Unlink" : "Link"}
                      >
                        {linked ? <Unlink className="h-3 w-3" /> : <Link2 className="h-3 w-3" />}
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs">{t.applications.notes}</Label>
            <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
        </div>

        <DialogFooter className="gap-2">
          {editing && (
            <Button variant="outline" size="sm" className="mr-auto border-destructive/40 text-destructive hover:bg-destructive/10" onClick={async () => { await apiClient(`/api/applications/${editing.id}`, { method: "DELETE" }); onOpenChange(false); window.location.reload() }}>
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />{t.common.delete}
            </Button>
          )}
          <DialogClose asChild><Button variant="outline" size="sm">{t.common.cancel}</Button></DialogClose>
          <Button onClick={save} disabled={saving} size="sm" className="shadow-soft">
            {saving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            {t.applications.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
