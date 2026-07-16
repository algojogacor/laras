import { z } from "zod"

const safeUrlSchema = z.string().max(500).refine((value) => {
  try {
    const protocol = new URL(value).protocol
    return protocol === "https:" || protocol === "mailto:"
  } catch { return false }
}, "Only HTTPS and mailto URLs are allowed")

const baseBlock = { id: z.string().min(1).max(80), fontSizePt: z.number().int().min(16).max(40).default(18) }
const textBlock = z.object({ ...baseBlock, type: z.literal("text"), text: z.string().trim().min(1).max(4000), emphasis: z.enum(["body", "lead", "caption"]).default("body") }).strict()
const bulletListBlock = z.object({ ...baseBlock, type: z.literal("bullet-list"), items: z.array(z.string().trim().min(1).max(700)).min(1).max(8) }).strict()
const timelineBlock = z.object({ ...baseBlock, type: z.literal("timeline"), items: z.array(z.object({ period: z.string().max(80), title: z.string().min(1).max(180), subtitle: z.string().max(240), detail: z.string().max(700).optional() }).strict()).min(1).max(6) }).strict()
const skillMatrixBlock = z.object({ ...baseBlock, type: z.literal("skills-matrix"), groups: z.array(z.object({ label: z.string().min(1).max(100), items: z.array(z.string().min(1).max(100)).min(1).max(8) }).strict()).min(1).max(6) }).strict()
const caseStudyBlock = z.object({ ...baseBlock, type: z.literal("case-study"), context: z.string().max(700), role: z.string().max(300), contribution: z.array(z.string().min(1).max(600)).min(1).max(5), outcome: z.array(z.string().min(1).max(600)).max(4), tools: z.array(z.string().min(1).max(100)).max(8) }).strict()
const metricsBlock = z.object({ ...baseBlock, type: z.literal("metrics"), items: z.array(z.object({ value: z.string().min(1).max(30), label: z.string().min(1).max(120) }).strict()).min(1).max(4) }).strict()
const linkBlock = z.object({ ...baseBlock, type: z.literal("link"), label: z.string().min(1).max(120), url: safeUrlSchema }).strict()
const quoteBlock = z.object({ ...baseBlock, type: z.literal("quote"), quote: z.string().min(1).max(700), attribution: z.string().max(160).optional() }).strict()

export const artifactBlockSchema = z.discriminatedUnion("type", [textBlock, bulletListBlock, timelineBlock, skillMatrixBlock, caseStudyBlock, metricsBlock, linkBlock, quoteBlock])
export type ArtifactBlock = z.infer<typeof artifactBlockSchema>

export const presentationArtifactSchema = z.object({
  schemaVersion: z.literal(1),
  kind: z.literal("presentation"),
  title: z.string().trim().min(1).max(200),
  subtitle: z.string().max(300).optional(),
  audience: z.string().trim().min(1).max(200),
  objective: z.string().trim().min(1).max(500),
  locale: z.enum(["id", "en"]),
  theme: z.object({ family: z.enum(["professional-minimal", "editorial-portfolio", "formal-institutional", "modern-technical"]), variant: z.enum(["light", "dark"]), density: z.enum(["compact", "comfortable", "spacious"]), alignment: z.enum(["start", "center"]), accent: z.string().regex(/^[0-9A-F]{6}$/i).optional() }).strict(),
  slides: z.array(z.object({
    id: z.string().min(1).max(80),
    type: z.enum(["cover", "profile-introduction", "executive-summary", "agenda", "timeline", "experience", "education", "skills-matrix", "project-highlight", "case-study", "problem-solution", "process", "comparison", "metrics", "achievements", "portfolio-gallery", "quote", "closing", "contact"]),
    title: z.string().trim().min(1).max(180), subtitle: z.string().max(260).optional(),
    blocks: z.array(artifactBlockSchema).min(1).max(10), notes: z.string().max(5000).default(""),
    layoutPreference: z.enum(["statement", "split", "timeline", "matrix", "case-study", "metrics", "contact"]),
    visualPriority: z.enum(["content", "evidence", "image"]), hidden: z.boolean().default(false),
  }).strict()).min(1).max(40),
  sourceEvidence: z.array(z.object({ label: z.string().min(1).max(180), kind: z.enum(["profile", "experience", "education", "skill", "evidence"]), confirmed: z.boolean() }).strict()).max(100),
}).strict()

export type PresentationArtifact = z.infer<typeof presentationArtifactSchema>

export function parsePresentationArtifact(value: unknown): PresentationArtifact {
  return presentationArtifactSchema.parse(value)
}

export function exportablePresentation(artifact: PresentationArtifact): PresentationArtifact {
  return presentationArtifactSchema.parse({ ...artifact, slides: artifact.slides.filter((slide) => !slide.hidden) })
}
