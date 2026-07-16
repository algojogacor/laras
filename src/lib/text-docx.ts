import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
} from "docx"
import type { SerializedProfile } from "@/lib/profile"

const FONT = "Arial"
const SIZE_BODY = 22 // 11pt

/** Build a simple letter/bio DOCX from plain text paragraphs. */
export function buildTextDocx(
  profile: SerializedProfile,
  opts: { title: string; paragraphs: string[]; signOff?: string }
): Document {
  const children: Paragraph[] = []

  // Sender block at top
  children.push(new Paragraph({
    children: [new TextRun({ text: profile.fullName || "", font: FONT, size: SIZE_BODY, bold: true })],
    spacing: { after: 40 },
  }))
  const contactBits = [profile.email, profile.phone, profile.location].filter(Boolean)
  if (contactBits.length) {
    children.push(new Paragraph({
      children: [new TextRun({ text: contactBits.join("  |  "), font: FONT, size: 20 })],
      spacing: { after: 240 },
    }))
  }

  for (const p of opts.paragraphs) {
    children.push(new Paragraph({
      children: [new TextRun({ text: p, font: FONT, size: SIZE_BODY })],
      spacing: { after: 160 },
      keepLines: true,
    }))
  }

  if (opts.signOff) {
    children.push(new Paragraph({
      children: [new TextRun({ text: opts.signOff, font: FONT, size: SIZE_BODY })],
      spacing: { before: 120, after: 40 },
    }))
    children.push(new Paragraph({
      children: [new TextRun({ text: profile.fullName || "", font: FONT, size: SIZE_BODY, bold: true })],
    }))
  }

  return new Document({
    creator: "Laras",
    title: opts.title,
    styles: { default: { document: { run: { font: FONT, size: SIZE_BODY } } } },
    sections: [{
      properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, right: 1134, bottom: 1134, left: 1134 } } },
      children,
    }],
  })
}

export async function packDocx(doc: Document): Promise<Buffer> {
  return Packer.toBuffer(doc) as unknown as Buffer
}
