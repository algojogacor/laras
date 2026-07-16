"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { ArrowDown, ArrowLeft, ArrowUp, Check, Copy, Download, Eye, EyeOff, History, Loader2, Plus, Redo2, Save, Sparkles, Trash2, Undo2 } from "lucide-react"
import { apiClient } from "@/lib/api-client"
import { useT } from "@/components/providers/locale-provider"
import { ARTIFACT_TEMPLATES } from "@/lib/artifacts/templates"
import type { ArtifactBlock, PresentationArtifact } from "@/lib/artifacts/schema"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

type Json = Record<string, unknown>
type Field = { path: (string | number)[]; label: string; value: string; multiline?: boolean }
type Version = { id: string; versionNumber: number; revisionInstruction: string | null; parentVersionId: string | null; createdAt: string; content?: unknown }
type Proposal = { id: string; before: string; after: string; warnings: string[]; baseVersion: number }
type FieldLabels = {
  subtitle: string; content: string; timelineTitle: string; organization: string; context: string; skillGroup: string; skill: string
  role: string; contribution: string; outcome: string; listItem: string; linkLabel: string; headline: string; summary: string
  achievement: string; greeting: string; closing: string; paragraph: string; about: string; personalBio: string; title: string
}

function valueAt(source: unknown, path: (string | number)[]) { let current = source; for (const part of path) current = (current as Record<string | number, unknown>)?.[part]; return current }
function replaceAt<T>(source: T, path: (string | number)[], value: string): T { const next = structuredClone(source); let current: unknown = next; for (const part of path.slice(0, -1)) current = (current as Record<string | number, unknown>)[part]; (current as Record<string | number, unknown>)[path.at(-1)!] = value; return next }

function fieldsFor(type: string, content: Json, labels: FieldLabels): Field[] {
  const fields: Field[] = []
  const push = (path: (string | number)[], label: string, multiline = true) => { const value = valueAt(content, path); if (typeof value === "string") fields.push({ path, label, value, multiline }) }
  if (type === "deck" && Array.isArray(content.slides)) {
    ;(content.slides as PresentationArtifact["slides"]).forEach((slide, slideIndex) => {
      push(["slides", slideIndex, "title"], `${slideIndex + 1}. ${slide.title}`, false)
      if (slide.subtitle) push(["slides", slideIndex, "subtitle"], labels.subtitle, false)
      slide.blocks.forEach((block, blockIndex) => {
        const base = ["slides", slideIndex, "blocks", blockIndex]
        if (block.type === "text") push([...base, "text"], labels.content)
        if (block.type === "timeline") block.items.forEach((item, itemIndex) => { push([...base, "items", itemIndex, "title"], labels.timelineTitle, false); push([...base, "items", itemIndex, "subtitle"], labels.organization, false); if (item.detail) push([...base, "items", itemIndex, "detail"], labels.context) })
        if (block.type === "skills-matrix") block.groups.forEach((group, groupIndex) => { push([...base, "groups", groupIndex, "label"], labels.skillGroup, false); group.items.forEach((_, itemIndex) => push([...base, "groups", groupIndex, "items", itemIndex], labels.skill, false)) })
        if (block.type === "case-study") { push([...base, "context"], labels.context); push([...base, "role"], labels.role); block.contribution.forEach((_, itemIndex) => push([...base, "contribution", itemIndex], labels.contribution)); block.outcome.forEach((_, itemIndex) => push([...base, "outcome", itemIndex], labels.outcome)) }
        if (block.type === "bullet-list") block.items.forEach((_, itemIndex) => push([...base, "items", itemIndex], labels.listItem))
        if (block.type === "link") push([...base, "label"], labels.linkLabel, false)
      })
    })
  } else if (type === "cv-ats") {
    push(["headline"], labels.headline, false); push(["summary"], labels.summary)
    ;((content.experiences as Array<{ bullets?: Array<{ text: string }> }>) || []).forEach((experience, i) => experience.bullets?.forEach((_, j) => push(["experiences", i, "bullets", j, "text"], labels.achievement)))
  } else if (type === "cover-letter") { push(["recipientGreeting"], labels.greeting, false); ((content.paragraphs as string[]) || []).forEach((_, i) => push(["paragraphs", i], `${labels.paragraph} ${i + 1}`)); push(["closing"], labels.closing)
  } else if (type === "bio") { push(["headline"], labels.headline, false); push(["about"], labels.about); ((content.personal as string[]) || []).forEach((_, i) => push(["personal", i], `${labels.personalBio} ${i + 1}`))
  } else if (type === "essay") { push(["title"], labels.title, false); ((content.paragraphs as string[]) || []).forEach((_, i) => push(["paragraphs", i], `${labels.paragraph} ${i + 1}`)) }
  return fields
}

function DeckPreview({ artifact, selectedSlide, labels }: { artifact: PresentationArtifact; selectedSlide: number; labels: FieldLabels }) {
  const slide = artifact.slides[selectedSlide] || artifact.slides[0]
  const template = ARTIFACT_TEMPLATES.find((item) => item.id === artifact.theme.family) || ARTIFACT_TEMPLATES[0]
  const colors = artifact.theme.variant === "dark" ? template.dark : template.light
  if (!slide) return null
  const block = slide.blocks[0]
  return <div className="aspect-video w-full overflow-hidden rounded-xl border shadow-soft" style={{ background: `#${colors.background}`, color: `#${colors.ink}` }}>
    <div className="flex h-full flex-col p-[5%]">
      <div className="border-b pb-3" style={{ borderColor: `#${colors.line}` }}><p className="text-balance font-serif text-xl font-semibold sm:text-2xl">{slide.title}</p>{slide.subtitle && <p className="mt-1 text-sm" style={{ color: `#${colors.muted}` }}>{slide.subtitle}</p>}</div>
      <div className="min-h-0 flex-1 overflow-hidden py-4 text-sm leading-relaxed sm:text-base">
        {block?.type === "text" && <p className="max-w-[78%] text-pretty text-lg sm:text-xl">{block.text}</p>}
        {block?.type === "timeline" && <div className="grid gap-2">{block.items.map((item, index) => <div key={index} className="grid grid-cols-[5rem_1fr] gap-3"><span className="font-semibold" style={{ color: `#${colors.accent}` }}>{item.period}</span><span><b>{item.title}</b><span className="block text-xs" style={{ color: `#${colors.muted}` }}>{item.subtitle}</span></span></div>)}</div>}
        {block?.type === "skills-matrix" && <div className="grid grid-cols-2 gap-2">{block.groups.map((group) => <div key={group.label} className="rounded-lg border p-3" style={{ background: `#${colors.surface}`, borderColor: `#${colors.line}` }}><b style={{ color: `#${colors.accent}` }}>{group.label}</b><p className="mt-1 text-xs">{group.items.join(" • ")}</p></div>)}</div>}
        {block?.type === "case-study" && <div className="grid grid-cols-[0.85fr_1.4fr] gap-4"><div className="rounded-lg border p-3" style={{ background: `#${colors.surface}`, borderColor: `#${colors.line}` }}><b style={{ color: `#${colors.accent}` }}>{labels.context}</b><p className="mt-1 text-xs">{block.context}</p></div><div><b style={{ color: `#${colors.accent}` }}>{labels.contribution}</b><ul className="mt-1 list-disc space-y-1 ps-5 text-xs">{block.contribution.map((item) => <li key={item}>{item}</li>)}</ul></div></div>}
        {block?.type === "bullet-list" && <ul className="list-disc space-y-2 ps-6">{block.items.map((item) => <li key={item}>{item}</li>)}</ul>}
        {slide.blocks.filter((item): item is Extract<ArtifactBlock, { type: "link" }> => item.type === "link").map((item) => <p key={item.id} className="mb-2 underline" style={{ textDecorationColor: `#${colors.accent}` }}>{item.label}</p>)}
      </div>
    </div>
  </div>
}

export function ArtifactStudio({ initialDocument, initialVersions }: { initialDocument: { id: string; type: string; title: string; content: Json; config: Json; version: number; updatedAt: string }; initialVersions: Version[] }) {
  const t = useT().documents.studio
  const [content, setContent] = useState(initialDocument.content), [title, setTitle] = useState(initialDocument.title), [config, setConfig] = useState(initialDocument.config)
  const [version, setVersion] = useState(initialDocument.version), [updatedAt, setUpdatedAt] = useState(initialDocument.updatedAt), [status, setStatus] = useState<"saved" | "saving" | "unsaved" | "conflict">("saved")
  const [past, setPast] = useState<Json[]>([]), [future, setFuture] = useState<Json[]>([]), [selectedSlide, setSelectedSlide] = useState(0), [selected, setSelected] = useState<Field | null>(null)
  const [versions, setVersions] = useState<Version[]>(initialVersions), [proposal, setProposal] = useState<Proposal | null>(null), [aiAction, setAiAction] = useState("improve-writing"), [instruction, setInstruction] = useState(""), [aiBusy, setAiBusy] = useState(false), [compare, setCompare] = useState<Version | null>(null)
  const contentRef = useRef(content)
  const aiAbort = useRef<AbortController | null>(null)
  const draftKey = `laras-artifact-draft:${initialDocument.id}`
  useEffect(() => { contentRef.current = content }, [content])
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const draft = JSON.parse(localStorage.getItem(draftKey) || "null")
        if (draft?.updatedAt === initialDocument.updatedAt && draft.content) { setContent(draft.content); setTitle(draft.title || initialDocument.title); setConfig(draft.config || initialDocument.config); setStatus("unsaved") }
      } catch { localStorage.removeItem(draftKey) }
    }, 0)
    return () => { window.clearTimeout(timer); aiAbort.current?.abort() }
  }, [draftKey, initialDocument.config, initialDocument.title, initialDocument.updatedAt])
  const isDeck = initialDocument.type === "deck" && content.kind === "presentation"
  const fields = useMemo(() => fieldsFor(initialDocument.type, content, t.fields), [initialDocument.type, content, t.fields])

  const mutate = useCallback((next: Json) => { setPast((items) => [...items.slice(-29), contentRef.current]); setFuture([]); setContent(next); setStatus("unsaved") }, [])
  const reload = useCallback(async () => { const response = await apiClient(`/api/artifacts/${initialDocument.id}`); if (!response.ok) return; const body = await response.json(); setContent(body.document.content); setConfig(body.document.config); setTitle(body.document.title); setVersion(body.document.version); setUpdatedAt(body.document.updatedAt); setStatus("saved") }, [initialDocument.id])
  const loadVersions = useCallback(async () => { const response = await apiClient(`/api/documents/${initialDocument.id}/versions?content=true`); if (response.ok) setVersions((await response.json()).versions) }, [initialDocument.id])
  useEffect(() => { if (status !== "unsaved") return; const snapshot = JSON.stringify(content); localStorage.setItem(draftKey, JSON.stringify({ updatedAt, title, content: JSON.parse(snapshot), config })); const timer = window.setTimeout(async () => { setStatus("saving"); const response = await apiClient(`/api/artifacts/${initialDocument.id}`, { method: "PATCH", body: JSON.stringify({ expectedUpdatedAt: updatedAt, title, content: JSON.parse(snapshot), config }) }); if (response.status === 409) return setStatus("conflict"); if (!response.ok) return setStatus("unsaved"); const body = await response.json(); setUpdatedAt(body.updatedAt); const fullySaved = JSON.stringify(contentRef.current) === snapshot; if (fullySaved) localStorage.removeItem(draftKey); setStatus(fullySaved ? "saved" : "unsaved") }, 900); return () => window.clearTimeout(timer) }, [config, content, draftKey, initialDocument.id, status, title, updatedAt])

  function undo() { setPast((items) => { const previous = items.at(-1); if (!previous) return items; setFuture((next) => [contentRef.current, ...next].slice(0, 30)); setContent(previous); setStatus("unsaved"); return items.slice(0, -1) }) }
  function redo() { setFuture((items) => { const next = items[0]; if (!next) return items; setPast((previous) => [...previous, contentRef.current].slice(-30)); setContent(next); setStatus("unsaved"); return items.slice(1) }) }
  function editField(field: Field, value: string) { mutate(replaceAt(contentRef.current, field.path, value)); setSelected({ ...field, value }) }
  function moveSlide(index: number, delta: number) { if (!isDeck) return; const artifact = structuredClone(content) as unknown as PresentationArtifact; const target = index + delta; if (target < 0 || target >= artifact.slides.length) return; [artifact.slides[index], artifact.slides[target]] = [artifact.slides[target], artifact.slides[index]]; mutate(artifact as unknown as Json); setSelectedSlide(target) }
  function updateSlide(index: number, action: "duplicate" | "delete" | "hide") { if (!isDeck) return; const artifact = structuredClone(content) as unknown as PresentationArtifact; if (action === "delete" && artifact.slides.length > 1) artifact.slides.splice(index, 1); if (action === "hide") artifact.slides[index].hidden = !artifact.slides[index].hidden; if (action === "duplicate") { const copy = structuredClone(artifact.slides[index]); copy.id = `slide-${crypto.randomUUID()}`; copy.blocks = copy.blocks.map((block) => ({ ...block, id: `block-${crypto.randomUUID()}` })); artifact.slides.splice(index + 1, 0, copy) } mutate(artifact as unknown as Json) }
  function addSlide() { if (!isDeck) return; const artifact = structuredClone(content) as unknown as PresentationArtifact; artifact.slides.push({ id: `slide-${crypto.randomUUID()}`, type: "executive-summary", title: artifact.locale === "id" ? "Slide baru" : "New slide", blocks: [{ id: `block-${crypto.randomUUID()}`, type: "text", text: artifact.locale === "id" ? "Tulis isi slide sebelum menampilkannya." : "Write the slide content before making it visible.", emphasis: "body", fontSizePt: 18 }], notes: "", layoutPreference: "statement", visualPriority: "content", hidden: true }); mutate(artifact as unknown as Json); setSelectedSlide(artifact.slides.length - 1) }
  async function saveVersion() { const response = await apiClient(`/api/artifacts/${initialDocument.id}/versions`, { method: "POST", body: JSON.stringify({ expectedVersion: version, label: "Manual checkpoint" }) }); if (response.ok) { const body = await response.json(); setVersion(body.version.versionNumber); await loadVersions() } }
  async function proposeAi() { if (!selected) return; aiAbort.current?.abort(); aiAbort.current = new AbortController(); setAiBusy(true); setProposal(null); try { const response = await apiClient(`/api/artifacts/${initialDocument.id}/ai/propose`, { method: "POST", signal: aiAbort.current.signal, body: JSON.stringify({ path: selected.path, selectedText: selected.value, action: aiAction, instruction: instruction || undefined }) }); if (response.ok) setProposal((await response.json()).proposal) } catch (error) { if (!(error instanceof DOMException && error.name === "AbortError")) setProposal(null) } finally { setAiBusy(false) } }
  async function decide(decision: "accept" | "reject") { if (!proposal) return; const response = await apiClient(`/api/artifacts/${initialDocument.id}/ai/proposals/${proposal.id}`, { method: "PATCH", body: JSON.stringify({ decision, expectedVersion: version }) }); if (response.ok && decision === "accept") { const body = await response.json(); setContent(body.content); setVersion(body.versionNumber); await reload(); await loadVersions() } setProposal(null) }
  async function restoreVersion(item: Version) { const response = await apiClient(`/api/artifacts/${initialDocument.id}/versions/${item.id}/restore`, { method: "POST", body: JSON.stringify({ expectedVersion: version }) }); if (response.ok) { const body = await response.json(); setContent(body.content); setVersion(body.versionNumber); await reload(); await loadVersions() } }
  async function download() { const map: Record<string, string> = { deck: `/api/documents/deck/export?documentId=${initialDocument.id}&version=${version}`, "cv-ats": `/api/documents/cv-ats/${initialDocument.id}/export`, "cover-letter": `/api/documents/cover-letter/${initialDocument.id}/export`, bio: `/api/documents/bio/${initialDocument.id}/export`, essay: `/api/documents/essay/${initialDocument.id}/export` }; const response = isDeck ? await apiClient(map.deck, { method: "POST" }) : await fetch(map[initialDocument.type]); if (!response.ok) return; const blob = await response.blob(), url = URL.createObjectURL(blob), link = document.createElement("a"); link.href = url; link.download = response.headers.get("Content-Disposition")?.match(/filename="([^"]+)"/)?.[1] || `${title}.${isDeck ? "pptx" : "docx"}`; link.click(); URL.revokeObjectURL(url) }

  const outline = <div className="space-y-2">{isDeck ? (content as unknown as PresentationArtifact).slides.map((slide, index) => <div key={slide.id} className={cn("rounded-lg border p-2", selectedSlide === index && "border-primary bg-primary/5", slide.hidden && "opacity-60")}><button className="w-full text-start text-sm font-medium" onClick={() => setSelectedSlide(index)}>{index + 1}. {slide.title}</button><div className="mt-2 flex flex-wrap gap-1"><Button size="icon" variant="ghost" className="h-10 w-10" aria-label={t.moveUp} onClick={() => moveSlide(index, -1)}><ArrowUp className="h-4 w-4" /></Button><Button size="icon" variant="ghost" className="h-10 w-10" aria-label={t.moveDown} onClick={() => moveSlide(index, 1)}><ArrowDown className="h-4 w-4" /></Button><Button size="icon" variant="ghost" className="h-10 w-10" aria-label={t.duplicate} onClick={() => updateSlide(index, "duplicate")}><Copy className="h-4 w-4" /></Button><Button size="icon" variant="ghost" className="h-10 w-10" aria-label={slide.hidden ? t.restore : t.hide} onClick={() => updateSlide(index, "hide")}>{slide.hidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}</Button><Button size="icon" variant="ghost" className="h-10 w-10 text-destructive" aria-label={t.remove} onClick={() => updateSlide(index, "delete")}><Trash2 className="h-4 w-4" /></Button></div></div>) : fields.map((field) => <button key={field.path.join(".")} className="block w-full rounded-lg border p-3 text-start text-sm hover:bg-muted" onClick={() => setSelected(field)}>{field.label}</button>)}{isDeck && <Button variant="outline" className="w-full" onClick={addSlide}><Plus className="mr-2 h-4 w-4" />{t.addSlide}</Button>}</div>
  const editor = <div className="space-y-4">{fields.filter((field) => !isDeck || field.path[1] === selectedSlide).map((field) => <div key={field.path.join(".")} className={cn("rounded-xl border p-3", selected?.path.join(".") === field.path.join(".") && "border-primary")}><label className="mb-2 block text-sm font-medium">{field.label}</label>{field.multiline ? <Textarea value={field.value} rows={4} className="text-base sm:text-sm" onFocus={() => setSelected(field)} onChange={(event) => editField(field, event.target.value)} /> : <Input value={field.value} className="text-base sm:text-sm" onFocus={() => setSelected(field)} onChange={(event) => editField(field, event.target.value)} />}<Button variant="ghost" size="sm" className="mt-2" onClick={() => setSelected(field)}><Sparkles className="mr-2 h-4 w-4" />{t.improve}</Button></div>)}</div>
  const preview = isDeck ? <DeckPreview artifact={content as unknown as PresentationArtifact} selectedSlide={selectedSlide} labels={t.fields} /> : <div className="mx-auto min-h-[60vh] max-w-[52rem] rounded-xl border bg-white p-8 text-slate-900 shadow-soft sm:p-12"><h1 className="text-balance text-3xl font-semibold">{title}</h1><div className="mt-8 space-y-5">{fields.map((field) => <section key={field.path.join(".")}><h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{field.label}</h2><p className="mt-1 whitespace-pre-wrap text-base leading-relaxed">{field.value}</p></section>)}</div></div>
  const settings = isDeck ? <div className="space-y-4"><div><p className="mb-2 text-sm font-medium">{t.template}</p><div className="grid gap-2">{ARTIFACT_TEMPLATES.map((item) => <button key={item.id} className={cn("rounded-lg border p-3 text-start", (content as unknown as PresentationArtifact).theme.family === item.id && "border-primary bg-primary/5")} onClick={() => { const next = structuredClone(content) as unknown as PresentationArtifact; next.theme.family = item.id; mutate(next as unknown as Json) }}><b>{item.name[(content as unknown as PresentationArtifact).locale]}</b><span className="mt-1 block text-xs text-muted-foreground">{item.description[(content as unknown as PresentationArtifact).locale]}</span></button>)}</div></div><div className="flex gap-2"><Button variant={(content as unknown as PresentationArtifact).theme.variant === "light" ? "default" : "outline"} onClick={() => { const next = structuredClone(content) as unknown as PresentationArtifact; next.theme.variant = "light"; mutate(next as unknown as Json) }}>{t.light}</Button><Button variant={(content as unknown as PresentationArtifact).theme.variant === "dark" ? "default" : "outline"} onClick={() => { const next = structuredClone(content) as unknown as PresentationArtifact; next.theme.variant = "dark"; mutate(next as unknown as Json) }}>{t.dark}</Button></div></div> : <p className="text-sm text-muted-foreground">{t.mobileHint}</p>

  return <div className="space-y-5">
    <header className="sticky top-0 z-20 -mx-4 flex flex-wrap items-center gap-2 border-b bg-background/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-xl sm:border">
      <Button asChild size="icon" variant="ghost" className="h-11 w-11"><Link href="/documents" aria-label={t.back}><ArrowLeft className="h-4 w-4" /></Link></Button><Input value={title} onChange={(event) => { setTitle(event.target.value); setStatus("unsaved") }} className="min-w-0 flex-1 text-base font-semibold" />
      <span className="min-w-24 text-center text-xs" aria-live="polite">{status === "saving" ? t.saving : status === "saved" ? t.saved : status === "conflict" ? t.conflict : t.unsaved}</span>
      <Button size="icon" variant="ghost" className="h-11 w-11" onClick={undo} disabled={!past.length} aria-label={t.undo}><Undo2 className="h-4 w-4" /></Button><Button size="icon" variant="ghost" className="h-11 w-11" onClick={redo} disabled={!future.length} aria-label={t.redo}><Redo2 className="h-4 w-4" /></Button><Button variant="outline" onClick={saveVersion}><Save className="mr-2 h-4 w-4" />{t.saveVersion}</Button><Button onClick={download}><Download className="mr-2 h-4 w-4" />{isDeck ? t.downloadPptx : t.export}</Button>
    </header>
    {status === "conflict" && <Card className="border-destructive"><CardContent className="flex items-center justify-between gap-3 p-4"><p className="text-sm">{t.conflict}</p><Button onClick={reload}>{t.restore}</Button></CardContent></Card>}
    <div className="hidden grid-cols-[16rem_minmax(0,1fr)_18rem] gap-4 lg:grid"><aside>{outline}</aside><main className="space-y-5">{preview}{editor}</main><aside className="space-y-4">{settings}<Card><CardHeader><CardTitle className="text-base">{t.history}</CardTitle></CardHeader><CardContent className="space-y-2">{versions.map((item) => <div key={item.id} className="rounded-lg border p-2 text-sm"><b>v{item.versionNumber}</b><p className="text-xs text-muted-foreground">{item.revisionInstruction || t.initial}</p><div className="mt-2 flex gap-1"><Button size="sm" variant="ghost" onClick={() => setCompare(item)}>{t.compare}</Button><Button size="sm" variant="ghost" onClick={() => restoreVersion(item)}>{t.restore}</Button></div></div>)}</CardContent></Card></aside></div>
    <Tabs defaultValue="edit" className="lg:hidden"><TabsList className="grid w-full grid-cols-4"><TabsTrigger value="outline">{t.outline}</TabsTrigger><TabsTrigger value="edit">{t.edit}</TabsTrigger><TabsTrigger value="preview">{t.preview}</TabsTrigger><TabsTrigger value="settings">{t.settings}</TabsTrigger></TabsList><TabsContent value="outline">{outline}</TabsContent><TabsContent value="edit">{editor}</TabsContent><TabsContent value="preview">{preview}</TabsContent><TabsContent value="settings">{settings}</TabsContent></Tabs>
    {selected && <Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Sparkles className="h-4 w-4" />{t.improve}</CardTitle></CardHeader><CardContent className="space-y-3"><div className="flex flex-wrap gap-2">{Object.entries(t.actions).map(([action, label]) => <Button key={action} size="sm" variant={aiAction === action ? "default" : "outline"} onClick={() => setAiAction(action)}>{label}</Button>)}</div><Textarea value={instruction} onChange={(event) => setInstruction(event.target.value)} placeholder={t.instruction} className="text-base sm:text-sm" /><p className="text-xs text-muted-foreground">{t.noOverwrite}</p><Button onClick={proposeAi} disabled={aiBusy}>{aiBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}{aiBusy ? t.aiWorking : t.improve}</Button>{proposal && <div className="grid gap-3 md:grid-cols-2"><div className="rounded-lg border p-3"><b className="text-sm">{t.before}</b><p className="mt-2 whitespace-pre-wrap text-sm line-through decoration-destructive">{proposal.before}</p></div><div className="rounded-lg border border-primary p-3"><b className="text-sm">{t.after}</b><p className="mt-2 whitespace-pre-wrap text-sm">{proposal.after}</p></div><div className="flex gap-2 md:col-span-2"><Button onClick={() => decide("accept")}><Check className="mr-2 h-4 w-4" />{t.accept}</Button><Button variant="outline" onClick={() => decide("reject")}>{t.reject}</Button></div></div>}</CardContent></Card>}
    {compare && <Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><History className="h-4 w-4" />v{compare.versionNumber} / {t.current}</CardTitle></CardHeader><CardContent><pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-lg bg-muted p-3 text-xs">{JSON.stringify(compare.content, null, 2)}</pre><Button className="mt-3" variant="outline" onClick={() => setCompare(null)}>{t.reject}</Button></CardContent></Card>}
  </div>
}
