"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Plus, MessageSquareText, Loader2, Trash2, ArrowRight, Briefcase, Clock } from "lucide-react"
import { toast } from "sonner"
import { useT } from "@/components/providers/locale-provider"
import type { Locale } from "@/lib/i18n/dictionary"
import { apiClient } from "@/lib/api-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
} from "@/components/ui/dialog"

type Set = {
  id: string; title: string; role: string | null; context: string | null
  questionCount: number; createdAt: string; updatedAt: string
}

export function InterviewList({ initialSets, locale }: { initialSets: Set[]; locale: Locale }) {
  const t = useT()
  const router = useRouter()
  const [sets, setSets] = useState<Set[]>(initialSets)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ title: "", role: "", context: "" })

  async function create() {
    if (!form.role.trim()) { toast.error(t.auth.errGeneric); return }
    setCreating(true)
    try {
      const res = await apiClient("/api/interview-sets", {
        method: "POST",
        body: JSON.stringify({ ...form, locale }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(t.auth.errGeneric); return }
      toast.success(t.interview.title)
      setDialogOpen(false)
      setForm({ title: "", role: "", context: "" })
      router.push(`/interview/${data.set.id}`)
      router.refresh()
    } catch { toast.error(t.auth.errGeneric) }
    finally { setCreating(false) }
  }

  async function deleteSet(id: string) {
    setSets((prev) => prev.filter((s) => s.id !== id))
    try { await apiClient(`/api/interview-sets/${id}`, { method: "DELETE" }); toast.success(t.common.delete) } catch {}
  }

  return (
    <div className="space-y-6 animate-rise">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-serif text-3xl font-semibold tracking-tight">{t.interview.title}</h1>
          <p className="mt-1.5 max-w-2xl text-muted-foreground text-pretty">{t.interview.subtitle}</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} size="sm" className="shadow-soft">
          <Plus className="mr-1.5 h-4 w-4" />{t.interview.new}
        </Button>
      </div>

      {sets.length === 0 ? (
        <Card className="shadow-soft">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <MessageSquareText className="h-6 w-6 text-primary" />
            </div>
            <p className="mt-4 max-w-sm text-sm text-muted-foreground">{t.interview.empty}</p>
            <Button onClick={() => setDialogOpen(true)} className="mt-5 shadow-soft">
              <Plus className="mr-1.5 h-4 w-4" />{t.interview.new}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sets.map((s) => (
            <Card key={s.id} className="group shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lift">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Briefcase className="h-5 w-5" />
                  </div>
                  <button onClick={() => deleteSet(s.id)} className="rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100" aria-label="Delete">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <h3 className="mt-3 font-serif text-base font-semibold leading-snug">{s.title}</h3>
                {s.role && <p className="mt-1 text-xs text-muted-foreground">{s.role}</p>}
                <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{s.questionCount} {t.interview.questions.toLowerCase()}</span>
                  <span>·</span>
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{new Date(s.updatedAt).toLocaleDateString()}</span>
                </div>
                <Button asChild variant="ghost" size="sm" className="mt-3 -ml-2 text-primary hover:bg-primary/5">
                  <Link href={`/interview/${s.id}`}>
                    {t.interview.questions}
                    <ArrowRight className="ml-1.5 h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">{t.interview.new}</DialogTitle>
            <DialogDescription>{t.interview.subtitle}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-sm">{t.interview.role} *</Label>
              <Input value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value, title: form.title || e.target.value })} placeholder={t.interview.roleHint} className="h-10" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">{t.interview.context}</Label>
              <Textarea rows={5} value={form.context} onChange={(e) => setForm({ ...form, context: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline" size="sm">{t.common.cancel}</Button></DialogClose>
            <Button onClick={create} disabled={creating} size="sm" className="shadow-soft">
              {creating ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />{t.interview.generating}</> : t.interview.generate}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
