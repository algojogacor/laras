import crypto from "crypto"
import { z } from "zod"
import { presentationArtifactSchema, type PresentationArtifact } from "@/lib/artifacts/schema"

const limited = z.string().max(15000)
const warningList = z.array(z.string().max(1000)).max(50).default([])
const cvSchema = z.object({ headline: limited, summary: limited, skillsByCategory: z.array(z.object({ category: z.string().max(200), items: z.array(z.string().max(200)).max(60) }).strict()).max(30), experiences: z.array(z.object({ experienceId: z.string().max(200), bullets: z.array(z.object({ text: limited, hasEvidence: z.boolean(), evidenceType: z.enum(["metric", "proper-noun", "scale", "none"]) }).strict()).max(30) }).strict()).max(100), warnings: warningList }).strict()
const coverLetterSchema = z.object({ recipientGreeting: z.string().max(500), paragraphs: z.array(limited).min(1).max(12), closing: z.string().max(1000), wordCount: z.number().int().nonnegative().max(20000), warnings: warningList, position: z.string().max(500).optional(), organization: z.string().max(500).optional() }).strict()
const bioSchema = z.object({ headline: z.string().max(1000), about: limited, personal: z.array(limited).min(1).max(12), warnings: warningList }).strict()
const essaySchema = z.object({ title: z.string().max(500), paragraphs: z.array(limited).min(1).max(30), wordCount: z.number().int().nonnegative().max(50000), warnings: warningList, probingQA: z.array(z.object({ id: z.string().max(100), question: z.string().max(2000), answer: limited }).strict()).max(20).optional() }).strict()

export function validateDocumentContent(type: string, content: unknown): unknown {
  if (type === "deck") return presentationArtifactSchema.parse(content)
  if (type === "cv-ats") return cvSchema.parse(content)
  if (type === "cover-letter") return coverLetterSchema.parse(content)
  if (type === "bio") return bioSchema.parse(content)
  if (type === "essay") return essaySchema.parse(content)
  return z.record(z.string(), z.unknown()).parse(content)
}

export type ArtifactPath = readonly (string | number)[]
export type ArtifactDiff = { path: (string | number)[]; before: string; after: string; sourceHash: string }
const blocked = new Set(["__proto__", "prototype", "constructor"])
const hash = (value: string) => crypto.createHash("sha256").update(value).digest("hex")

function assertPath(path: ArtifactPath) {
  if (!path.length || path.length > 8 || path.some((part) => typeof part === "string" && (blocked.has(part) || !/^[A-Za-z][A-Za-z0-9_-]*$/.test(part))) || path.some((part) => typeof part === "number" && (!Number.isInteger(part) || part < 0 || part > 999))) throw new Error("unsafe-path")
}

export function createArtifactDiff(path: ArtifactPath, before: string, after: string): ArtifactDiff {
  assertPath(path)
  if (before.length > 15000 || after.length > 15000) throw new Error("selection-too-large")
  return { path: [...path], before, after, sourceHash: hash(before) }
}

function readAtPath(value: unknown, path: ArtifactPath): unknown {
  let current: unknown = value
  for (const part of path) {
    if (current === null || typeof current !== "object") throw new Error("invalid-path")
    current = (current as Record<string | number, unknown>)[part]
  }
  return current
}

export function applyArtifactPatch<T>(source: T, diff: ArtifactDiff): T {
  assertPath(diff.path)
  const current = readAtPath(source, diff.path)
  if (typeof current !== "string" || current !== diff.before || hash(current) !== diff.sourceHash) throw new Error("stale-selection")
  const next = structuredClone(source)
  let parent: unknown = next
  for (const part of diff.path.slice(0, -1)) parent = (parent as Record<string | number, unknown>)[part]
  ;(parent as Record<string | number, unknown>)[diff.path.at(-1)!] = diff.after
  if (next && typeof next === "object" && (next as { kind?: string }).kind === "presentation") return presentationArtifactSchema.parse(next) as T
  return next
}

export function isPresentationArtifact(value: unknown): value is PresentationArtifact {
  return presentationArtifactSchema.safeParse(value).success
}
