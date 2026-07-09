import PptxGenJS from "pptxgenjs"
import type { SerializedProfile } from "@/lib/profile"

/**
 * Personal Deck renderer (Brief Section 6.4, 8) — generates a real .pptx
 * using PptxGenJS. 6 slides: Cover → About Me → Timeline → Skills →
 * Project Highlights → Contact.
 *
 * Themes are config-driven (Section 8.1) so adding a new theme doesn't
 * require rewriting the generator — just add a THEME entry.
 */

export type DeckTheme = {
  id: string
  name: string
  bg: string
  accent: string
  text: string
  muted: string
  font: string
  fontHead: string
}

export const THEMES: DeckTheme[] = [
  { id: "forest", name: "Forest", bg: "0E2A22", accent: "C2703D", text: "F5F0E8", muted: "9CAFA4", font: "Calibri", fontHead: "Georgia" },
  { id: "slate", name: "Slate", bg: "1E293B", accent: "60A5FA", text: "F1F5F9", muted: "94A3B8", font: "Calibri", fontHead: "Georgia" },
  { id: "warm", name: "Warm", bg: "3D2B1F", accent: "E0A458", text: "FBF4E6", muted: "B89B7A", font: "Calibri", fontHead: "Georgia" },
  { id: "ink", name: "Ink", bg: "0F0F0F", accent: "D4AF37", text: "FAFAFA", muted: "888888", font: "Calibri", fontHead: "Georgia" },
]

export async function buildDeck(
  profile: SerializedProfile,
  themeId: string
): Promise<Buffer> {
  const theme = THEMES.find((t) => t.id === themeId) || THEMES[0]
  const pptx = new PptxGenJS()
  pptx.defineLayout({ name: "WIDE", width: 13.333, height: 7.5 })
  pptx.layout = "WIDE"
  pptx.author = "Laras"
  pptx.title = `${profile.fullName || "Personal Deck"}`

  const BG = theme.bg
  const ACCENT = theme.accent
  const TEXT = theme.text
  const MUTED = theme.muted
  const FONT = theme.font
  const FONT_HEAD = theme.fontHead

  // ── 1. Cover ──
  const s1 = pptx.addSlide()
  s1.background = { color: BG }
  s1.addShape("rect", { x: 0, y: 0, w: 0.15, h: 7.5, fill: { color: ACCENT } })
  s1.addText(profile.fullName || "", { x: 0.8, y: 2.4, w: 11, h: 1.2, fontFace: FONT_HEAD, fontSize: 44, bold: true, color: TEXT })
  s1.addText(profile.headline || "", { x: 0.85, y: 3.5, w: 10, h: 0.6, fontFace: FONT, fontSize: 20, color: MUTED })
  s1.addText([profile.email, profile.phone, profile.location].filter(Boolean).join("  |  "), { x: 0.85, y: 6.4, w: 10, h: 0.4, fontFace: FONT, fontSize: 12, color: MUTED })

  // ── 2. About Me ──
  const s2 = pptx.addSlide()
  s2.background = { color: BG }
  addSectionHeader(s2, "About Me", theme)
  s2.addText(profile.summary || profile.headline || "", { x: 0.8, y: 2.0, w: 11.5, h: 3.5, fontFace: FONT, fontSize: 16, color: TEXT, lineSpacingMultiple: 1.4, valign: "top" })

  // ── 3. Timeline (career) ──
  const s3 = pptx.addSlide()
  s3.background = { color: BG }
  addSectionHeader(s3, "Timeline", theme)
  const exps = profile.experiences.slice(0, 5)
  exps.forEach((e, i) => {
    const y = 2.0 + i * 0.95
    // dot
    s3.addShape("ellipse", { x: 0.9, y: y + 0.1, w: 0.22, h: 0.22, fill: { color: ACCENT } })
    // line
    if (i < exps.length - 1) {
      s3.addShape("line", { x: 1.01, y: y + 0.32, w: 0, h: 0.7, line: { color: MUTED, width: 1 } })
    }
    s3.addText(e.title, { x: 1.4, y: y - 0.05, w: 5, h: 0.35, fontFace: FONT, fontSize: 14, bold: true, color: TEXT })
    s3.addText(e.organization, { x: 1.4, y: y + 0.25, w: 5, h: 0.3, fontFace: FONT, fontSize: 11, color: MUTED })
    const dates = [e.startDate, e.current ? "Present" : e.endDate].filter(Boolean).join(" – ")
    s3.addText(dates, { x: 6.6, y: y - 0.05, w: 5.5, h: 0.3, fontFace: FONT, fontSize: 11, color: MUTED, align: "right" })
  })

  // ── 4. Skills (visual chips) ──
  const s4 = pptx.addSlide()
  s4.background = { color: BG }
  addSectionHeader(s4, "Skills", theme)
  // group by category
  const byCat: Record<string, string[]> = {}
  profile.skills.forEach((s) => {
    const c = s.category || "General"
    if (!byCat[c]) byCat[c] = []
    byCat[c].push(s.name)
  })
  const cats = Object.entries(byCat)
  cats.forEach(([cat, items], idx) => {
    const y = 2.0 + idx * 1.1
    s4.addText(cat.toUpperCase(), { x: 0.8, y, w: 11, h: 0.3, fontFace: FONT, fontSize: 12, bold: true, color: ACCENT })
    // chips
    let x = 0.8
    items.slice(0, 8).forEach((item) => {
      const w = Math.max(1.2, item.length * 0.12 + 0.4)
      s4.addShape("roundRect", { x, y: y + 0.35, w, h: 0.35, rectRadius: 0.15, fill: { color: BG }, line: { color: ACCENT, width: 1 } })
      s4.addText(item, { x, y: y + 0.35, w, h: 0.35, fontFace: FONT, fontSize: 10, color: TEXT, align: "center", valign: "middle" })
      x += w + 0.15
    })
  })

  // ── 5. Project Highlights ──
  const s5 = pptx.addSlide()
  s5.background = { color: BG }
  addSectionHeader(s5, "Project Highlights", theme)
  const topExps = profile.experiences.slice(0, 3)
  topExps.forEach((e, i) => {
    const colW = 3.7
    const x = 0.8 + i * (colW + 0.3)
    // card bg
    s5.addShape("roundRect", { x, y: 2.0, w: colW, h: 4.2, rectRadius: 0.1, fill: { color: BG }, line: { color: MUTED, width: 0.75 } })
    s5.addText(e.title, { x: x + 0.25, y: 2.2, w: colW - 0.5, h: 0.5, fontFace: FONT_HEAD, fontSize: 16, bold: true, color: ACCENT })
    s5.addText(e.organization, { x: x + 0.25, y: 2.65, w: colW - 0.5, h: 0.3, fontFace: FONT, fontSize: 11, color: MUTED })
    const achievements = (e.achievements || []).slice(0, 3)
    const bullets = achievements.length ? achievements.map((a) => ({ text: a, options: { bullet: { code: "2022" } } })) : []
    if (bullets.length) {
      s5.addText(bullets, { x: x + 0.25, y: 3.1, w: colW - 0.5, h: 2.8, fontFace: FONT, fontSize: 11, color: TEXT, lineSpacingMultiple: 1.2, valign: "top" })
    } else if (e.contextNotes) {
      s5.addText(e.contextNotes.slice(0, 200), { x: x + 0.25, y: 3.1, w: colW - 0.5, h: 2.8, fontFace: FONT, fontSize: 11, color: MUTED, valign: "top" })
    }
  })
  if (topExps.length === 0) {
    s5.addText("Add experiences in your profile to see project highlights.", { x: 0.8, y: 3.5, w: 11, h: 0.5, fontFace: FONT, fontSize: 14, color: MUTED, align: "center" })
  }

  // ── 6. Contact ──
  const s6 = pptx.addSlide()
  s6.background = { color: BG }
  s6.addShape("rect", { x: 0, y: 0, w: 0.15, h: 7.5, fill: { color: ACCENT } })
  s6.addText("Let's connect", { x: 0.8, y: 2.2, w: 11, h: 1, fontFace: FONT_HEAD, fontSize: 40, bold: true, color: TEXT })
  const links = profile.links as any
  const contactLines: string[] = []
  if (profile.email) contactLines.push(`Email: ${profile.email}`)
  if (profile.phone) contactLines.push(`Phone: ${profile.phone}`)
  if (links?.linkedin) contactLines.push(`LinkedIn: ${links.linkedin}`)
  if (links?.portfolio) contactLines.push(`Portfolio: ${links.portfolio}`)
  s6.addText(contactLines.join("\n"), { x: 0.85, y: 3.4, w: 10, h: 2, fontFace: FONT, fontSize: 16, color: MUTED, lineSpacingMultiple: 1.6 })
  s6.addText(profile.fullName || "", { x: 0.85, y: 6.4, w: 10, h: 0.4, fontFace: FONT_HEAD, fontSize: 14, color: ACCENT })

  return (pptx.write({ outputType: "nodebuffer" }) as unknown as Buffer)
}

function addSectionHeader(slide: any, title: string, theme: DeckTheme) {
  slide.addText(title, { x: 0.8, y: 0.5, w: 11, h: 0.7, fontFace: theme.fontHead, fontSize: 28, bold: true, color: theme.text })
  slide.addShape("rect", { x: 0.85, y: 1.25, w: 0.6, h: 0.05, fill: { color: theme.accent } })
}
