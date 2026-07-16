import PptxGenJS from "pptxgenjs"
import type { SerializedProfile } from "@/lib/profile"
import { buildPresentationArtifact, inspectPresentationQuality } from "@/lib/artifacts/presentation-engine"
import { exportablePresentation, type ArtifactBlock, type PresentationArtifact } from "@/lib/artifacts/schema"
import { ARTIFACT_TEMPLATES, getArtifactTemplate } from "@/lib/artifacts/templates"

export type DeckTheme = { id: string; name: string; bg: string; accent: string; text: string; muted: string; font: string; fontHead: string }
export const THEMES: DeckTheme[] = ARTIFACT_TEMPLATES.map((template) => ({ id: template.id, name: template.name.en, bg: template.light.background, accent: template.light.accent, text: template.light.ink, muted: template.light.muted, font: template.fonts.body, fontHead: template.fonts.heading }))

const W = 13.333
const H = 7.5
type Slide = ReturnType<PptxGenJS["addSlide"]>
type ResolvedTemplate = ReturnType<typeof getArtifactTemplate>

function addHeader(slide: Slide, title: string, subtitle: string | undefined, template: ResolvedTemplate, page: number) {
  slide.addText(title, { x: template.grid.marginX, y: 0.48, w: 10.8, h: 0.5, fontFace: template.fonts.heading, fontSize: title.length > 56 ? 26 : 30, bold: true, color: template.colors.ink, margin: 0, breakLine: false, fit: "shrink" })
  if (subtitle) slide.addText(subtitle, { x: template.grid.marginX, y: 1.02, w: 10.8, h: 0.32, fontFace: template.fonts.body, fontSize: 16, color: template.colors.muted, margin: 0, fit: "shrink" })
  slide.addShape("line", { x: template.grid.marginX, y: 1.45, w: W - template.grid.marginX * 2, h: 0, line: { color: template.colors.line, width: 1 } })
  slide.addText(String(page).padStart(2, "0"), { x: 11.9, y: 0.52, w: 0.65, h: 0.28, fontFace: template.fonts.body, fontSize: 11, color: template.colors.muted, align: "right", margin: 0 })
}

function addLead(slide: Slide, block: Extract<ArtifactBlock, { type: "text" }>, template: ResolvedTemplate, supporting?: Extract<ArtifactBlock, { type: "bullet-list" }>, y = 2.05) {
  const size = block.text.length > 440 ? 18 : block.text.length > 220 ? 21 : 25
  slide.addText(block.text, { x: template.grid.marginX, y, w: supporting ? 7.6 : 9.6, h: 3.4, fontFace: template.fonts.heading, fontSize: Math.max(18, size), color: template.colors.ink, margin: 0.04, breakLine: false, valign: "middle", fit: "shrink", lineSpacingMultiple: 1.08 })
  if (supporting) {
    slide.addShape("roundRect", { x: 9.05, y: y + 0.15, w: 3.35, h: 3.0, rectRadius: template.radius, fill: { color: template.colors.surface }, line: { color: template.colors.line, width: 1 } })
    slide.addText(supporting.items.map((text) => ({ text, options: { bullet: { indent: 18 }, breakLine: true } })), { x: 9.35, y: y + 0.5, w: 2.75, h: 2.25, fontFace: template.fonts.body, fontSize: 17, color: template.colors.ink, margin: 0.04, fit: "shrink", paraSpaceAfter: 10 })
  }
}

function renderTimeline(slide: Slide, block: Extract<ArtifactBlock, { type: "timeline" }>, template: ResolvedTemplate) {
  const items = block.items.slice(0, 6)
  const startY = items.length <= 3 ? 2.35 : 1.82
  const step = items.length <= 3 ? 1.2 : Math.min(0.84, 4.9 / Math.max(items.length, 1))
  slide.addShape("line", { x: 1.05, y: startY + 0.2, w: 0, h: Math.max(0.2, step * (items.length - 1)), line: { color: template.colors.line, width: 2 } })
  items.forEach((item, index) => {
    const y = startY + index * step
    slide.addShape("ellipse", { x: 0.92, y: y + 0.08, w: 0.26, h: 0.26, fill: { color: template.colors.accent }, line: { color: template.colors.background, width: 1.5 } })
    slide.addText(item.period, { x: 1.38, y, w: 1.45, h: 0.3, fontFace: template.fonts.body, fontSize: 13, bold: true, color: template.colors.accent, margin: 0 })
    slide.addText(item.title, { x: 2.9, y: y - 0.03, w: 3.8, h: 0.34, fontFace: template.fonts.heading, fontSize: 18, bold: true, color: template.colors.ink, margin: 0, fit: "shrink" })
    slide.addText(item.subtitle, { x: 6.82, y: y - 0.01, w: 2.35, h: 0.3, fontFace: template.fonts.body, fontSize: 15, color: template.colors.muted, margin: 0, fit: "shrink" })
    if (item.detail) slide.addText(item.detail, { x: 9.25, y: y - 0.02, w: 3.1, h: Math.max(0.45, step - 0.1), fontFace: template.fonts.body, fontSize: 15, color: template.colors.ink, margin: 0, fit: "shrink", valign: "top" })
  })
}

function renderSkills(slide: Slide, block: Extract<ArtifactBlock, { type: "skills-matrix" }>, template: ResolvedTemplate) {
  const groups = block.groups.slice(0, 6)
  const cols = groups.length <= 3 ? 1 : 2
  const rows = Math.ceil(groups.length / cols)
  const cardW = cols === 1 ? 11.75 : 5.72
  const cardH = Math.min(1.42, 4.85 / Math.max(rows, 1))
  groups.forEach((group, index) => {
    const col = index % cols, row = Math.floor(index / cols)
    const x = template.grid.marginX + col * (cardW + template.grid.gutter), y = 1.82 + row * (cardH + 0.22)
    slide.addShape("roundRect", { x, y, w: cardW, h: cardH, rectRadius: template.radius, fill: { color: template.colors.surface }, line: { color: template.colors.line, width: 1 } })
    slide.addText(group.label, { x: x + 0.25, y: y + 0.18, w: 1.75, h: 0.32, fontFace: template.fonts.heading, fontSize: 17, bold: true, color: template.colors.accent, margin: 0, fit: "shrink" })
    slide.addText(group.items.join("  •  "), { x: x + 2.05, y: y + 0.18, w: cardW - 2.3, h: cardH - 0.34, fontFace: template.fonts.body, fontSize: 16, color: template.colors.ink, margin: 0, fit: "shrink", valign: "middle" })
  })
}

function renderCaseStudy(slide: Slide, block: Extract<ArtifactBlock, { type: "case-study" }>, template: ResolvedTemplate) {
  slide.addShape("roundRect", { x: template.grid.marginX, y: 1.82, w: 4.0, h: 4.95, rectRadius: template.radius, fill: { color: template.colors.surface }, line: { color: template.colors.line, width: 1 } })
  slide.addText("CONTEXT", { x: 1.02, y: 2.12, w: 1.1, h: 0.28, fontFace: template.fonts.body, fontSize: 12, bold: true, charSpacing: 1.2, color: template.colors.accent, margin: 0 })
  slide.addText(block.context, { x: 1.02, y: 2.52, w: 3.45, h: 1.4, fontFace: template.fonts.body, fontSize: 17, color: template.colors.ink, margin: 0, fit: "shrink", valign: "top" })
  slide.addText("ROLE", { x: 1.02, y: 4.28, w: 0.8, h: 0.28, fontFace: template.fonts.body, fontSize: 12, bold: true, charSpacing: 1.2, color: template.colors.accent, margin: 0 })
  slide.addText(block.role, { x: 1.02, y: 4.67, w: 3.45, h: 0.9, fontFace: template.fonts.heading, fontSize: 18, bold: true, color: template.colors.ink, margin: 0, fit: "shrink" })
  if (block.tools.length) slide.addText(block.tools.join("  •  "), { x: 1.02, y: 6.12, w: 3.45, h: 0.36, fontFace: template.fonts.body, fontSize: 13, color: template.colors.muted, margin: 0, fit: "shrink" })
  slide.addText("CONTRIBUTION", { x: 5.25, y: 2.05, w: 2.0, h: 0.3, fontFace: template.fonts.body, fontSize: 12, bold: true, charSpacing: 1.2, color: template.colors.accent, margin: 0 })
  const contributions = block.contribution.map((text) => ({ text, options: { bullet: { indent: 18 }, breakLine: true } }))
  slide.addText(contributions, { x: 5.22, y: 2.52, w: 6.9, h: 2.2, fontFace: template.fonts.body, fontSize: 17, color: template.colors.ink, margin: 0.04, breakLine: false, fit: "shrink", paraSpaceAfter: 10 })
  if (block.outcome.length) {
    slide.addText("OUTCOME", { x: 5.25, y: 5.08, w: 1.4, h: 0.3, fontFace: template.fonts.body, fontSize: 12, bold: true, charSpacing: 1.2, color: template.colors.accent, margin: 0 })
    slide.addText(block.outcome.map((text) => ({ text, options: { bullet: { indent: 18 }, breakLine: true } })), { x: 5.22, y: 5.48, w: 6.9, h: 1.1, fontFace: template.fonts.body, fontSize: 16, color: template.colors.ink, margin: 0.04, fit: "shrink" })
  }
}

function renderBlocks(slide: Slide, blocks: ArtifactBlock[], template: ResolvedTemplate) {
  const first = blocks[0]
  if (first?.type === "text") return addLead(slide, first, template, blocks.find((block): block is Extract<ArtifactBlock, { type: "bullet-list" }> => block.type === "bullet-list"))
  if (first?.type === "timeline") return renderTimeline(slide, first, template)
  if (first?.type === "skills-matrix") return renderSkills(slide, first, template)
  if (first?.type === "case-study") return renderCaseStudy(slide, first, template)
  if (first?.type === "bullet-list") return slide.addText(first.items.map((text) => ({ text, options: { bullet: { indent: 20 }, breakLine: true } })), { x: template.grid.marginX, y: 1.95, w: 10.9, h: 4.8, fontFace: template.fonts.body, fontSize: 20, color: template.colors.ink, margin: 0.05, fit: "shrink", paraSpaceAfter: 14 })
  const links = blocks.filter((block): block is Extract<ArtifactBlock, { type: "link" }> => block.type === "link")
  if (links.length) links.forEach((link, index) => slide.addText([{ text: link.label, options: { hyperlink: { url: link.url }, color: template.colors.ink, underline: { color: template.colors.accent } } }], { x: template.grid.marginX, y: 2.1 + index * 0.72, w: 8.7, h: 0.38, fontFace: template.fonts.body, fontSize: 20, margin: 0 }))
}

export async function buildPresentationDeck(source: PresentationArtifact): Promise<Buffer> {
  const artifact = exportablePresentation(source)
  const report = inspectPresentationQuality(artifact)
  if (report.errors.length) throw new Error(`Artifact quality failed: ${report.errors.join(", ")}`)
  const template = getArtifactTemplate(artifact.theme)
  const pptx = new PptxGenJS()
  pptx.defineLayout({ name: "LARAS_WIDE", width: W, height: H }); pptx.layout = "LARAS_WIDE"
  pptx.author = "Laras"; pptx.company = "Laras"; pptx.subject = artifact.objective; pptx.title = artifact.title; pptx.theme = { headFontFace: template.fonts.heading, bodyFontFace: template.fonts.body }
  pptx.defineSlideMaster({ title: "LARAS_ARTIFACT", background: { color: template.colors.background }, objects: [{ line: { x: template.grid.marginX, y: 7.02, w: W - template.grid.marginX * 2, h: 0, line: { color: template.colors.line, width: 0.75 } } }, { text: { text: artifact.title, options: { x: template.grid.marginX, y: 7.08, w: 6.5, h: 0.2, fontFace: template.fonts.body, fontSize: 9, color: template.colors.muted, margin: 0 } } }], slideNumber: { x: 12.0, y: 7.06, w: 0.5, h: 0.2, fontFace: template.fonts.body, fontSize: 9, color: template.colors.muted, align: "right" } })
  artifact.slides.forEach((content, index) => {
    const slide = pptx.addSlide("LARAS_ARTIFACT"); slide.background = { color: template.colors.background }
    if (content.type === "cover") {
      slide.addShape("rect", { x: 0, y: 0, w: 0.22, h: H, fill: { color: template.colors.accent }, line: { transparency: 100 } })
      slide.addText(content.title, { x: 0.9, y: 1.65, w: 10.8, h: 1.35, fontFace: template.fonts.heading, fontSize: content.title.length > 34 ? 36 : 42, bold: true, color: template.colors.ink, margin: 0, fit: "shrink", breakLine: false })
      if (content.subtitle) slide.addText(content.subtitle, { x: 0.93, y: 3.15, w: 9.8, h: 0.72, fontFace: template.fonts.body, fontSize: 22, color: template.colors.muted, margin: 0, fit: "shrink" })
      const lead = content.blocks.find((block): block is Extract<ArtifactBlock, { type: "text" }> => block.type === "text")
      if (lead) slide.addText(lead.text, { x: 0.93, y: 5.25, w: 8.5, h: 0.7, fontFace: template.fonts.body, fontSize: 18, color: template.colors.accent, margin: 0, fit: "shrink" })
    } else { addHeader(slide, content.title, content.subtitle, template, index + 1); renderBlocks(slide, content.blocks, template) }
    if (content.notes) slide.addNotes(content.notes)
  })
  return await pptx.write({ outputType: "nodebuffer", compression: true }) as Buffer
}

export async function buildDeck(profile: SerializedProfile, themeId: string): Promise<Buffer> {
  const family = ARTIFACT_TEMPLATES.some((template) => template.id === themeId) ? themeId as PresentationArtifact["theme"]["family"] : "professional-minimal"
  return buildPresentationDeck(buildPresentationArtifact({ profile, themeFamily: family }))
}
