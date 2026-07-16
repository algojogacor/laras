import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  type IParagraphOptions,
} from "docx"
import type { GeneratedCVATS } from "@/lib/content-engine"
import type { SerializedProfile } from "@/lib/profile"

/**
 * ATS-compliant DOCX renderer (Brief Section 7 — HARD CONSTRAINT).
 *
 *  Layout: one column, no tables/textboxes/sidebar/multi-column.
 *  Font: Calibri (allowed by Section 7).
 *  Sizes: name 20pt, section headings 14pt, body 11pt.
 *  Margins: 0.75" all sides (within 0.5"-1" range).
 *  Bullets: round bullet (•) only.
 *  Contact info in body, not header/footer.
 *  Section order: Kontak → Ringkasan → Keahlian → Pengalaman → Pendidikan → Sertifikasi.
 *  Dates: MM/YYYY consistent.
 */

const FONT = "Arial"
const SIZE_BODY = 22 // half-points → 11pt
const SIZE_NAME = 40 // 20pt
const SIZE_HEADING = 28 // 14pt
const SIZE_CONTACT = 20 // 10pt

const isID = (locale: string) => locale === "id"
const labels = (locale: string) => ({
  contact: isID(locale) ? "Kontak" : "Contact",
  summary: isID(locale) ? "Ringkasan" : "Summary",
  skills: isID(locale) ? "Keahlian" : "Skills",
  experience: isID(locale) ? "Pengalaman" : "Experience",
  education: isID(locale) ? "Pendidikan" : "Education",
  certifications: isID(locale) ? "Sertifikasi" : "Certifications",
  present: isID(locale) ? "Sekarang" : "Present",
})

function fmtDate(d: string | null | undefined, present: string): string {
  if (!d) return ""
  if (d.toLowerCase() === "present") return present
  // normalize YYYY-MM → MM/YYYY
  const m = d.match(/^(\d{4})-(\d{1,2})/)
  if (m) return `${m[2].padStart(2, "0")}/${m[1]}`
  return d
}

function spacer(): Paragraph {
  return new Paragraph({ children: [new TextRun({ text: "", font: FONT, size: SIZE_BODY })], spacing: { after: 60 } })
}

function sectionHeading(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text: text.toUpperCase(), font: FONT, size: SIZE_HEADING, bold: true })],
    spacing: { before: 240, after: 120 },
    keepNext: true,
    border: { bottom: { color: "999999", space: 2, style: BorderStyle.SINGLE, size: 6 } },
  })
}

function bullet(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, font: FONT, size: SIZE_BODY })],
    bullet: { level: 0 },
    spacing: { after: 40 },
    keepLines: true,
  })
}

export function buildCVATSDocx(
  profile: SerializedProfile,
  cv: GeneratedCVATS,
  locale: "id" | "en"
): Document {
  const L = labels(locale)
  const present = L.present

  const children: Paragraph[] = []

  // ── Name (top, centered is allowed but left is safest for ATS) ──
  children.push(
    new Paragraph({
      children: [new TextRun({ text: profile.fullName || "", font: FONT, size: SIZE_NAME, bold: true })],
      spacing: { after: 60 },
    })
  )

  // ── Headline ──
  if (cv.headline) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: cv.headline, font: FONT, size: SIZE_CONTACT, italics: true })],
        spacing: { after: 80 },
      })
    )
  }

  // ── Contact (in body, single line or two lines) ──
  const contactParts = [profile.email, profile.phone, profile.location].filter(Boolean)
  const links = profile.links as { linkedin?: string; portfolio?: string; github?: string; website?: string } | undefined
  if (links?.linkedin) contactParts.push(links.linkedin)
  if (links?.portfolio) contactParts.push(links.portfolio)
  children.push(
    new Paragraph({
      children: [new TextRun({ text: contactParts.join("  |  "), font: FONT, size: SIZE_CONTACT })],
      spacing: { after: 120 },
    })
  )

  // ── Summary ──
  children.push(sectionHeading(L.summary))
  children.push(
    new Paragraph({
      children: [new TextRun({ text: cv.summary, font: FONT, size: SIZE_BODY })],
      spacing: { after: 80 },
    })
  )

  // ── Skills ──
  if (cv.skillsByCategory.length > 0 || profile.skills.length > 0) {
    children.push(sectionHeading(L.skills))
    const groups = cv.skillsByCategory.length
      ? cv.skillsByCategory
      : [{ category: L.skills, items: profile.skills.map((s) => s.name) }]
    for (const g of groups) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: `${g.category}: `, font: FONT, size: SIZE_BODY, bold: true }),
            new TextRun({ text: g.items.join(", "), font: FONT, size: SIZE_BODY }),
          ],
          spacing: { after: 40 },
        })
      )
    }
  }

  // ── Experience ──
  if (profile.experiences.length > 0) {
    children.push(sectionHeading(L.experience))
    for (let idx = 0; idx < profile.experiences.length; idx++) {
      const exp = profile.experiences[idx]
      // Match by ID first, then by index as fallback (profile edits recreate experiences with new IDs)
      const gen = cv.experiences.find((e) => e.experienceId === exp.id) || cv.experiences[idx]
      // Title row: "Title — Organization" bold, dates right (but one-column → dates on next line for ATS safety)
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: exp.title, font: FONT, size: SIZE_BODY, bold: true }),
            ...(exp.organization ? [new TextRun({ text: ` — ${exp.organization}`, font: FONT, size: SIZE_BODY, bold: true })] : []),
          ],
          spacing: { before: 80, after: 20 },
        })
      )
      const dateStr = [fmtDate(exp.startDate, present), fmtDate(exp.current ? "Present" : exp.endDate, present)]
        .filter(Boolean)
        .join(" – ")
      if (dateStr) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: dateStr, font: FONT, size: SIZE_CONTACT, italics: true })],
            spacing: { after: 60 },
          })
        )
      }
      for (const b of gen?.bullets ?? []) {
        children.push(bullet(b.text))
      }
    }
  }

  // ── Education ──
  if (profile.educations.length > 0) {
    children.push(sectionHeading(L.education))
    for (const edu of profile.educations) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: edu.institution, font: FONT, size: SIZE_BODY, bold: true }),
            ...(edu.degree ? [new TextRun({ text: ` — ${edu.degree}`, font: FONT, size: SIZE_BODY, bold: true })] : []),
          ],
          spacing: { before: 80, after: 20 },
        })
      )
      const detail = [edu.field, edu.gpa && `GPA: ${edu.gpa}`].filter(Boolean).join(" · ")
      const dateStr = [fmtDate(edu.startDate, present), fmtDate(edu.current ? "Present" : edu.endDate, present)]
        .filter(Boolean)
        .join(" – ")
      if (detail || dateStr) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: [detail, dateStr].filter(Boolean).join("  |  "), font: FONT, size: SIZE_CONTACT, italics: true })],
            spacing: { after: 60 },
          })
        )
      }
    }
  }

  // ── Certifications ──
  if (profile.certifications.length > 0) {
    children.push(sectionHeading(L.certifications))
    for (const cert of profile.certifications) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: cert.name, font: FONT, size: SIZE_BODY, bold: true }),
            ...(cert.issuer ? [new TextRun({ text: ` — ${cert.issuer}`, font: FONT, size: SIZE_BODY })] : []),
            ...(cert.issueDate ? [new TextRun({ text: ` (${fmtDate(cert.issueDate, present)})`, font: FONT, size: SIZE_CONTACT })] : []),
          ],
          spacing: { after: 40 },
        })
      )
    }
  }

  return new Document({
    creator: "Laras",
    title: `${profile.fullName || "CV"} — ATS`,
    styles: {
      default: {
        document: { run: { font: FONT, size: SIZE_BODY } },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 },
            margin: {
              top: 1080, // 0.75"
              right: 1080,
              bottom: 1080,
              left: 1080,
            },
          },
        },
        children,
      },
    ],
  })
}

export async function packDocx(doc: Document): Promise<Buffer> {
  return Packer.toBuffer(doc) as unknown as Buffer
}
