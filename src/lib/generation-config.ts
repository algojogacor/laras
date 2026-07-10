/**
 * GenerationConfig — centralized type for ALL artifact generation (Brief Task 1).
 *
 * Every generate flow (CV ATS, Cover Letter, Bio, Essay, Deck, English practice,
 * Interview answers, Application summary) must accept and persist a GenerationConfig.
 * The config genuinely affects the LLM prompt, renderer, export, and validation.
 */

export type OutputFormat = "docx" | "pdf" | "pptx" | "txt" | "visual"
export type DocLocale = "id" | "en"
export type TargetRegion = "indonesia" | "global" | "us" | "uk" | "custom"
export type Tone = "formal" | "warm" | "confident" | "concise" | "persuasive" | "academic" | "professional"
export type Density = "compact" | "normal" | "detailed" | "very-detailed"
export type EvidenceRequirement = "strict-numbers" | "balanced" | "narrative-ok"
export type CreativityLevel = "low" | "medium" | "high"
export type AntiHallucinationStrictness = "strict" | "normal" | "lenient"

export type GenerationConfig = {
  // ── Output format & language ──
  outputFormat: OutputFormat
  docLocale: DocLocale
  targetRegion: TargetRegion
  customRegion?: string

  // ── Style ──
  tone: Tone
  density: Density

  // ── Length controls ──
  wordCount?: number
  pageCount?: number
  slideCount?: number
  paragraphCount?: number
  bulletCount?: number

  // ── Template / theme ──
  template?: string // e.g. "modern-minimal", "corporate", "forest"
  fontFamily?: string

  // ── Page / layout ──
  pageSize?: "A4" | "Letter" | "16:9" | "4:3"
  margin?: "narrow" | "normal" | "wide"

  // ── Sections ──
  sectionInclude?: Record<string, boolean> // e.g. { certifications: true, languages: false }
  sectionOrder?: string[] // e.g. ["summary", "experience", "education", "skills"]
  itemsPerSection?: Record<string, number> // e.g. { experience: 3, skills: 10 }

  // ── AI behavior ──
  creativity: CreativityLevel
  antiHallucination: AntiHallucinationStrictness
  evidenceRequirement: EvidenceRequirement

  // ── Context ──
  targetJobOrg?: string // target job/org/scholarship context
  additionalInstruction?: string // free-text from user

  // ── Export ──
  exportFilename?: string
  saveAsNewVersion: boolean // true = new version, false = overwrite

  // ── Essay-specific (Section 5.4) ──
  wordLimit?: number | null
}

/** Smart defaults based on target opportunity type (Brief: "smart defaults berdasarkan target opportunity"). */
export function smartDefaults(opts: {
  opportunityType?: string
  targetRegion?: string
  preferredTone?: string
}): Partial<GenerationConfig> {
  const defaults: Partial<GenerationConfig> = {
    outputFormat: "docx",
    docLocale: "id",
    targetRegion: "indonesia",
    tone: "professional",
    density: "normal",
    creativity: "medium",
    antiHallucination: "strict",
    evidenceRequirement: "balanced",
    saveAsNewVersion: true,
    sectionInclude: {},
    sectionOrder: ["summary", "skills", "experience", "education", "certifications"],
    itemsPerSection: { experience: 5, skills: 10 },
    pageSize: "A4",
    margin: "normal",
  }

  // Adjust based on opportunity type
  if (opts.opportunityType === "scholarship") {
    defaults.tone = "academic"
    defaults.evidenceRequirement = "strict-numbers"
  } else if (opts.opportunityType === "work") {
    defaults.tone = "professional"
    defaults.evidenceRequirement = "balanced"
  } else if (opts.opportunityType === "org") {
    defaults.tone = "warm"
  }

  // Adjust based on region
  if (opts.targetRegion === "us" || opts.targetRegion === "uk" || opts.targetRegion === "global") {
    defaults.docLocale = "en"
    defaults.targetRegion = (opts.targetRegion as TargetRegion) || "global"
  }

  // Adjust based on preferred tone from profile
  if (opts.preferredTone === "formal") defaults.tone = "formal"
  else if (opts.preferredTone === "direct") defaults.tone = "confident"
  else if (opts.preferredTone === "warm") defaults.tone = "warm"

  return defaults
}

/** Validate config + return warnings for unrealistic requests (Brief: "tampilkan warning yang ramah"). */
export function validateConfig(config: GenerationConfig): string[] {
  const warnings: string[] = []

  if (config.pageCount && config.pageCount > 2 && config.outputFormat === "docx") {
    warnings.push(
      config.docLocale === "id"
        ? `CV ATS ${config.pageCount} halaman berisiko tidak efektif untuk early-career. Pertimbangkan 1-2 halaman.`
        : `A ${config.pageCount}-page ATS CV is risky for early-career. Consider 1-2 pages.`
    )
  }

  if (config.wordCount && config.wordCount > 1000 && config.outputFormat === "docx") {
    warnings.push(
      config.docLocale === "id"
        ? `Cover letter ${config.wordCount} kata mungkin terlalu panjang (standar 250-350 kata).`
        : `A ${config.wordCount}-word cover letter may be too long (standard is 250-350 words).`
    )
  }

  if (config.slideCount && config.slideCount > 15) {
    warnings.push(
      config.docLocale === "id"
        ? `${config.slideCount} slide mungkin terlalu banyak untuk personal deck (standar 6-10).`
        : `${config.slideCount} slides may be too many for a personal deck (standard is 6-10).`
    )
  }

  if (config.creativity === "high" && config.antiHallucination === "strict") {
    warnings.push(
      config.docLocale === "id"
        ? "Kreativitas tinggi + anti-hallucination ketat bisa konflik. Output mungkin lebih konservatif."
        : "High creativity + strict anti-hallucination may conflict. Output will be more conservative."
    )
  }

  return warnings
}

/** Serialize config for DB storage (JSON string). */
export function serializeConfig(config: GenerationConfig): string {
  return JSON.stringify(config)
}

/** Deserialize config from DB. */
export function deserializeConfig(json: string | null | undefined): GenerationConfig | null {
  if (!json) return null
  try {
    return JSON.parse(json) as GenerationConfig
  } catch {
    return null
  }
}
