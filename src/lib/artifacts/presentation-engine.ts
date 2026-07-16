import type { SerializedProfile } from "@/lib/profile"
import type { ArtifactFixture } from "@/lib/artifacts/fixtures"
import { presentationArtifactSchema, type ArtifactBlock, type PresentationArtifact } from "@/lib/artifacts/schema"

type Input = ArtifactFixture | { profile: SerializedProfile; locale?: "id" | "en"; audience?: string; objective?: string; themeFamily?: PresentationArtifact["theme"]["family"] }
const clean = (value: unknown, max = 700) => String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max)
const blockId = (slide: number, block: number) => `block-${slide + 1}-${block + 1}`

function dateLabel(value: string | null | undefined, locale: "id" | "en") {
  if (!value) return ""
  const match = value.match(/^(\d{4})-(\d{1,2})/)
  if (!match) return clean(value, 40)
  return new Intl.DateTimeFormat(locale === "id" ? "id-ID" : "en-US", { month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${match[1]}-${match[2].padStart(2, "0")}-01T00:00:00Z`))
}

export function buildPresentationArtifact(input: Input): PresentationArtifact {
  const fixture = "profile" in input ? input : { profile: input as never }
  const profile = fixture.profile
  const locale = fixture.locale ?? (profile.docLocale === "en" ? "en" : "id")
  const id = locale === "id"
  const slides: PresentationArtifact["slides"] = []
  const add = (slide: Omit<PresentationArtifact["slides"][number], "id" | "hidden">) => slides.push({ ...slide, id: `slide-${String(slides.length + 1).padStart(2, "0")}`, hidden: false })

  add({ type: "cover", title: clean(profile.fullName || (id ? "Portofolio Profesional" : "Professional Portfolio"), 120), subtitle: clean(profile.headline, 220) || undefined, blocks: [{ id: blockId(0, 0), type: "text", text: clean(fixture.objective || (id ? "Pengalaman, kemampuan, dan bukti kontribusi" : "Experience, capabilities, and evidence of contribution")), emphasis: "lead", fontSizePt: 22 }], notes: id ? "Buka dengan posisi profesional dan tujuan presentasi." : "Open with professional positioning and the presentation objective.", layoutPreference: "statement", visualPriority: "content" })

  if (clean(profile.summary)) add({ type: "executive-summary", title: id ? "Nilai yang saya bawa" : "The value I bring", blocks: [{ id: blockId(slides.length, 0), type: "text", text: clean(profile.summary, 1200), emphasis: "lead", fontSizePt: 22 }, ...(profile.skills.length ? [{ id: blockId(slides.length, 1), type: "bullet-list" as const, items: profile.skills.slice(0, 4).map((skill) => clean(skill.name, 100)), fontSizePt: 18 }] : [])], notes: "", layoutPreference: "statement", visualPriority: "evidence" })

  if (profile.experiences.length) {
    const items = profile.experiences.slice(0, 6).map((experience) => ({ period: [dateLabel(experience.startDate, locale), experience.current ? (id ? "Sekarang" : "Present") : dateLabel(experience.endDate, locale)].filter(Boolean).join(" - "), title: clean(experience.title, 160), subtitle: clean(experience.organization, 180), detail: clean(experience.contextNotes || experience.description, 500) || undefined }))
    add({ type: "timeline", title: id ? "Perjalanan yang membentuk fokus saya" : "The journey that shaped my focus", blocks: [{ id: blockId(slides.length, 0), type: "timeline", items, fontSizePt: 17 }], notes: "", layoutPreference: "timeline", visualPriority: "content" })
  }

  if (profile.skills.length) {
    const groups = new Map<string, string[]>()
    for (const skill of profile.skills) { const label = clean(skill.category || (id ? "Keahlian" : "Capabilities"), 80); groups.set(label, [...(groups.get(label) || []), clean(skill.name, 90)].slice(0, 8)) }
    add({ type: "skills-matrix", title: id ? "Kemampuan yang mendukung eksekusi" : "Capabilities that support delivery", blocks: [{ id: blockId(slides.length, 0), type: "skills-matrix", groups: [...groups].slice(0, 6).map(([label, items]) => ({ label, items })), fontSizePt: 18 }], notes: "", layoutPreference: "matrix", visualPriority: "content" })
  }

  for (const experience of profile.experiences.slice(0, 3)) {
    const achievements = Array.isArray(experience.achievements) ? experience.achievements.map((item) => clean(item, 600)).filter(Boolean) : []
    const context = clean(experience.contextNotes || experience.description, 700)
    if (!context && !achievements.length) continue
    const contribution = achievements.length ? achievements.slice(0, 3) : [clean(experience.description || experience.title, 600)]
    add({ type: "case-study", title: clean(experience.title, 160), subtitle: clean(experience.organization, 160), blocks: [{ id: blockId(slides.length, 0), type: "case-study", context: context || (id ? "Konteks berasal dari pengalaman terverifikasi di profil." : "Context is based on the verified profile experience."), role: clean(`${experience.title}${experience.organization ? ` - ${experience.organization}` : ""}`, 280), contribution, outcome: [], tools: profile.skills.slice(0, 5).map((skill) => clean(skill.name, 80)), fontSizePt: 17 }], notes: id ? "Jelaskan konteks, kontribusi, dan hasil tanpa menambah fakta baru." : "Explain context, contribution, and result without adding new facts.", layoutPreference: "case-study", visualPriority: "evidence" })
  }

  if (profile.educations.length > 1) add({ type: "education", title: id ? "Fondasi pembelajaran" : "Learning foundation", blocks: [{ id: blockId(slides.length, 0), type: "bullet-list", items: profile.educations.slice(0, 4).map((education) => clean([education.degree, education.field, education.institution].filter(Boolean).join(" - "), 500)), fontSizePt: 19 }], notes: "", layoutPreference: "split", visualPriority: "content" })

  const links = profile.links as Record<string, unknown>
  const contacts: ArtifactBlock[] = []
  if (profile.email) contacts.push({ id: blockId(slides.length, contacts.length), type: "link", label: clean(profile.email, 120), url: `mailto:${clean(profile.email, 180)}`, fontSizePt: 18 })
  for (const key of ["linkedin", "portfolio", "website", "github"]) { const url = clean(links?.[key], 500); if (url.startsWith("https://")) contacts.push({ id: blockId(slides.length, contacts.length), type: "link", label: key[0].toUpperCase() + key.slice(1), url, fontSizePt: 18 }) }
  if (!contacts.length) contacts.push({ id: blockId(slides.length, 0), type: "text", text: id ? "Detail kontak tersedia melalui profil Laras." : "Contact details are available through the Laras profile.", emphasis: "body", fontSizePt: 18 })
  add({ type: "closing", title: id ? "Mari melanjutkan percakapan" : "Let’s continue the conversation", subtitle: clean(profile.headline, 220) || undefined, blocks: contacts, notes: "", layoutPreference: "contact", visualPriority: "content" })

  return presentationArtifactSchema.parse({ schemaVersion: 1, kind: "presentation", title: clean(profile.fullName || "Portfolio", 180), subtitle: clean(profile.headline, 260) || undefined, audience: clean(fixture.audience || (id ? "Perekrut dan kolaborator" : "Recruiters and collaborators"), 180), objective: clean(fixture.objective || (id ? "Menyajikan pengalaman dan bukti kontribusi" : "Present experience and evidence of contribution"), 480), locale, theme: { family: fixture.themeFamily || "professional-minimal", variant: "light", density: "comfortable", alignment: "start" }, slides, sourceEvidence: [{ label: id ? "Profil pengguna" : "User profile", kind: "profile", confirmed: true }, ...profile.experiences.slice(0, 8).map((experience) => ({ label: clean(`${experience.title} - ${experience.organization}`, 180), kind: "experience" as const, confirmed: true }))] })
}

export function inspectPresentationQuality(artifact: PresentationArtifact) {
  const errors: string[] = []
  let minimumBodyFontPt = 100
  for (const slide of artifact.slides.filter((item) => !item.hidden)) {
    if (!slide.blocks.length) errors.push(`${slide.id}:empty-slide`)
    if (!slide.title.trim()) errors.push(`${slide.id}:missing-title`)
    for (const block of slide.blocks) minimumBodyFontPt = Math.min(minimumBodyFontPt, block.fontSizePt)
    if (JSON.stringify(slide).includes("Tambahkan hasil atau dampak proyek")) errors.push(`${slide.id}:placeholder`)
  }
  const duplicateIds = artifact.slides.map((slide) => slide.id).filter((id, index, all) => all.indexOf(id) !== index)
  if (duplicateIds.length) errors.push("duplicate-slide-id")
  return { errors, minimumBodyFontPt: minimumBodyFontPt === 100 ? 0 : minimumBodyFontPt, slideCount: artifact.slides.filter((slide) => !slide.hidden).length }
}
