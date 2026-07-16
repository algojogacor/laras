"use client"

import { useState, type FormEvent } from "react"
import { apiClient } from "@/lib/api-client"
import { larasToast } from "@/lib/laras-toast"
import { useT } from "@/components/providers/locale-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

const categories = ["bug", "confusing", "visual", "performance", "missing", "suggestion"] as const

export function BetaFeedbackForm() {
  const t = useT()
  const id = t.common?.loading === "Memuat..."
  const [category, setCategory] = useState<(typeof categories)[number]>("bug")
  const [page, setPage] = useState("")
  const [description, setDescription] = useState("")
  const [expectedBehavior, setExpectedBehavior] = useState("")
  const [consentToContact, setConsent] = useState(false)
  const [sending, setSending] = useState(false)
  async function submit(event: FormEvent) {
    event.preventDefault(); setSending(true)
    try {
      const response = await apiClient("/api/feedback", { method: "POST", body: JSON.stringify({ category, page, description, expectedBehavior, consentToContact, appVersion: "0.2.0", technicalContext: `locale=${id ? "id" : "en"}` }) })
      if (!response.ok) throw new Error()
      larasToast.success(id ? "Umpan balik terkirim." : "Feedback sent."); setDescription(""); setExpectedBehavior("")
    } catch { larasToast.error(id ? "Umpan balik belum terkirim. Coba lagi." : "Feedback was not sent. Try again.") } finally { setSending(false) }
  }
  return <Card><CardHeader><CardTitle>{id ? "Kirim umpan balik" : "Send beta feedback"}</CardTitle></CardHeader><CardContent><form onSubmit={submit} className="space-y-4">
    <div className="space-y-2"><Label htmlFor="feedback-category">{id ? "Kategori" : "Category"}</Label><select id="feedback-category" value={category} onChange={(e) => setCategory(e.target.value as typeof category)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select></div>
    <div className="space-y-2"><Label htmlFor="feedback-page">{id ? "Halaman atau fitur" : "Page or feature"}</Label><Input id="feedback-page" value={page} onChange={(e) => setPage(e.target.value)} required maxLength={160} /></div>
    <div className="space-y-2"><Label htmlFor="feedback-description">{id ? "Apa yang terjadi?" : "What happened?"}</Label><Textarea id="feedback-description" value={description} onChange={(e) => setDescription(e.target.value)} minLength={10} maxLength={5000} required rows={5} /></div>
    <div className="space-y-2"><Label htmlFor="feedback-expected">{id ? "Perilaku yang diharapkan (opsional)" : "Expected behavior (optional)"}</Label><Textarea id="feedback-expected" value={expectedBehavior} onChange={(e) => setExpectedBehavior(e.target.value)} maxLength={2000} rows={3} /></div>
    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={consentToContact} onChange={(e) => setConsent(e.target.checked)} />{id ? "Saya bersedia dihubungi untuk klarifikasi." : "You may contact me for clarification."}</label>
    <Button type="submit" disabled={sending}>{id ? "Kirim umpan balik" : "Send feedback"}</Button>
  </form></CardContent></Card>
}
