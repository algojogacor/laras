"use client"

import { useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Loader2 } from "lucide-react"
import { apiClient } from "@/lib/api-client"
import { larasToast } from "@/lib/laras-toast"
import type { Locale } from "@/lib/i18n/dictionary"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

const types = ["job", "internship", "scholarship", "fellowship", "competition", "volunteer", "event", "other"]

export function OpportunityCreateForm({ locale }: { locale: Locale }) {
  const id = locale === "id"
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ type: "job", title: "", organization: "", deadline: "", location: "", url: "", description: "", requirements: "", notes: "" })
  const update = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }))

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!form.title.trim()) return larasToast.error(id ? "Judul kesempatan wajib diisi." : "Opportunity title is required.")
    setLoading(true)
    try {
      const response = await apiClient("/api/opportunities", { method: "POST", body: JSON.stringify(form) })
      if (!response.ok) throw new Error("create-failed")
      larasToast.success(id ? "Kesempatan tersimpan." : "Opportunity saved.")
      router.push("/opportunities")
      router.refresh()
    } catch {
      larasToast.error(id ? "Kesempatan belum tersimpan. Coba lagi." : "The opportunity was not saved. Try again.")
    } finally { setLoading(false) }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 animate-rise">
      <Link href="/opportunities" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />{id ? "Kembali ke kesempatan" : "Back to opportunities"}</Link>
      <div><h1 className="font-serif text-3xl font-semibold tracking-tight">{id ? "Simpan kesempatan" : "Save an opportunity"}</h1><p className="mt-1 text-muted-foreground">{id ? "Catat kesempatan yang ingin kamu pertimbangkan." : "Keep the details you need for your next decision."}</p></div>
      <form onSubmit={submit} className="space-y-5 rounded-xl border border-border bg-card p-5 shadow-soft sm:p-6">
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2"><Label htmlFor="title">{id ? "Judul" : "Title"}</Label><Input id="title" value={form.title} onChange={(e) => update("title", e.target.value)} maxLength={200} required /></div>
          <div className="space-y-2"><Label htmlFor="type">{id ? "Jenis" : "Type"}</Label><select id="type" value={form.type} onChange={(e) => update("type", e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">{types.map((type) => <option key={type} value={type}>{type}</option>)}</select></div>
          <div className="space-y-2"><Label htmlFor="organization">{id ? "Organisasi" : "Organization"}</Label><Input id="organization" value={form.organization} onChange={(e) => update("organization", e.target.value)} /></div>
          <div className="space-y-2"><Label htmlFor="deadline">{id ? "Batas waktu" : "Deadline"}</Label><Input id="deadline" type="date" value={form.deadline} onChange={(e) => update("deadline", e.target.value)} /></div>
          <div className="space-y-2"><Label htmlFor="location">{id ? "Lokasi" : "Location"}</Label><Input id="location" value={form.location} onChange={(e) => update("location", e.target.value)} /></div>
          <div className="space-y-2 sm:col-span-2"><Label htmlFor="url">URL</Label><Input id="url" type="url" value={form.url} onChange={(e) => update("url", e.target.value)} placeholder="https://" /></div>
          <div className="space-y-2 sm:col-span-2"><Label htmlFor="description">{id ? "Deskripsi" : "Description"}</Label><Textarea id="description" value={form.description} onChange={(e) => update("description", e.target.value)} rows={5} /></div>
          <div className="space-y-2 sm:col-span-2"><Label htmlFor="requirements">{id ? "Persyaratan" : "Requirements"}</Label><Textarea id="requirements" value={form.requirements} onChange={(e) => update("requirements", e.target.value)} rows={5} /></div>
          <div className="space-y-2 sm:col-span-2"><Label htmlFor="notes">{id ? "Catatan pribadi" : "Private notes"}</Label><Textarea id="notes" value={form.notes} onChange={(e) => update("notes", e.target.value)} rows={3} /></div>
        </div>
        <Button type="submit" disabled={loading}>{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{id ? "Simpan kesempatan" : "Save opportunity"}</Button>
      </form>
    </div>
  )
}
