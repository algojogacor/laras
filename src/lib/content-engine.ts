import ZAI from "z-ai-web-dev-sdk"
import type { SerializedProfile } from "@/lib/profile"

/**
 * Content Engine — Laras
 * (Brief Section 3.1, 5)
 *
 * All text generation about the user MUST go through here. This engine enforces:
 *  - Verify-before-generate (Section 5.2): never invent details not in the profile.
 *  - Anti-generic writing (Section 5.3): no buzzwords without evidence, Aksi+Konteks+Hasil,
 *    varied sentence structure, no forced "rule of three".
 *  - Locale-aware (Section 9): ID or EN document language.
 *
 * The LLM is asked to return STRICT JSON so we can render structured documents and
 * run the concreteness self-check (Section 5.5) deterministically.
 */

let _zai: Awaited<ReturnType<typeof ZAI.create>> | null = null
async function getZai() {
  if (!_zai) _zai = await ZAI.create()
  return _zai
}

export type GeneratedBullet = {
  text: string
  hasEvidence: boolean // contains a number / metric / concrete proper noun
  evidenceType: "metric" | "proper-noun" | "scale" | "none"
}

export type GeneratedExperience = {
  experienceId: string
  bullets: GeneratedBullet[]
}

export type GeneratedCVATS = {
  headline: string
  summary: string
  skillsByCategory: { category: string; items: string[] }[]
  experiences: GeneratedExperience[]
  warnings: string[] // anti-generic warnings surfaced to the user
}

/** Buzzword list (Section 5.3) — flagged if used without adjacent evidence. */
const BUZZWORDS_ID = [
  "berorientasi hasil", "pekerja keras", "bersemangat tinggi", "berdedikasi",
  "dinamis", "berpengalaman", "proaktif", "mampu bekerja sama",
  "detail-oriented", "team player",
]
const BUZZWORDS_EN = [
  "results-driven", "detail-oriented", "proven track record", "dynamic",
  "passionate about", "hardworking", "seasoned professional", "go-getter",
  "team player", "self-starter", "think outside the box", "synergy",
]

function detectEvidence(text: string): GeneratedBullet["evidenceType"] {
  const t = text.toLowerCase()
  // metric: a number followed by % or a unit, or a standalone number > 1
  if (/\b\d[\d,.]*\s*(%|persen|percent|x|jam|hours|menit|jt|rb|k|orang|tim|bulan|tahun|year|month|q[1-4])/i.test(text)) return "metric"
  if (/\b\d+\s*(peluncuran|proyek|produk|klien|acara|events|mahasiswa|siswa|user|pengguna)/i.test(text)) return "scale"
  // proper noun: capitalized multi-word that isn't a sentence start (project/product/client names)
  if (/[A-Z][a-z]+ [A-Z][a-z]+/.test(text) && /project|proyek|klien|client|platform|app|aplikasi/i.test(t)) return "proper-noun"
  return "none"
}

function hasBuzzword(text: string, locale: "id" | "en"): boolean {
  const list = locale === "id" ? BUZZWORDS_ID : BUZZWORDS_EN
  const t = text.toLowerCase()
  return list.some((b) => t.includes(b))
}

/** Run the concreteness self-check on generated content (Section 5.5). */
export function concretenessCheck(cv: GeneratedCVATS, locale: "id" | "en") {
  let totalBullets = 0
  let withEvidence = 0
  let buzzwordNoEvidence = 0
  const flagged: string[] = []

  for (const exp of cv.experiences) {
    for (const b of exp.bullets) {
      totalBullets++
      if (b.hasEvidence) withEvidence++
      else if (hasBuzzword(b.text, locale)) {
        buzzwordNoEvidence++
        flagged.push(b.text)
      }
    }
  }
  const summaryHasEvidence = detectEvidence(cv.summary) !== "none"
  const score = totalBullets === 0 ? 0 : Math.round((withEvidence / totalBullets) * 100)
  return {
    score,
    totalBullets,
    withEvidence,
    buzzwordNoEvidence,
    flagged,
    summaryHasEvidence,
    verdict:
      score >= 70 ? "good" : score >= 40 ? "fair" : "weak",
  } as const
}

/** Build the LLM prompt enforcing all anti-generic rules. Returns strict JSON. */
function buildCVPrompt(profile: SerializedProfile, opts: { locale: "id" | "en"; tone: string; region: string }) {
  const lang = opts.locale
  const isID = lang === "id"

  const sys = isID
    ? `Kamu adalah penulis CV profesional yang menulis HANYA berdasarkan data yang diberikan user. Aturan MUTLAK:
1. JANGAN PERNAH mengarang detail yang tidak ada di data user (nama proyek, angka, klien, tanggal). Jika data kurang untuk suatu klaim, tulis bullet yang lebih umum tanpa angka, atau lewati.
2. Setiap bullet pengalaman harus pakai pola Aksi + Konteks + Hasil terukur kalau ada angkanya. Kalau tidak ada angka, tetap konkret (sebut nama proyek/organisasi/skala tim dari data).
3. DILARANG memakai buzzword tanpa bukti: "results-driven", "detail-oriented", "proven track record", "berorientasi hasil", "pekerja keras", "bersemangat tinggi", dll. Buzzword boleh HANYA jika kalimat yang sama memuat angka/bukti konkret.
4. Variasikan panjang dan struktur kalimat. Jangan pakai "rule of three" di setiap bullet.
5. Tulis dalam Bahasa Indonesia profesional, ${opts.tone === "formal" ? "formal" : opts.tone === "direct" ? "langsung dan berbasis pencapaian" : "hangat dan personal"}.
6. Gunakan nama section standar: "Pengalaman", "Pendidikan", "Keahlian".`
    : `You are a professional CV writer who writes ONLY from the data the user provided. STRICT rules:
1. NEVER invent details not present in the user's data (project names, numbers, clients, dates). If data is insufficient for a claim, write a more general bullet without numbers, or skip it.
2. Each experience bullet should follow Action + Context + Measurable Result when numbers exist. If no numbers, stay concrete (name the project/organization/team scale from the data).
3. FORBIDDEN to use buzzwords without evidence: "results-driven", "detail-oriented", "proven track record", "passionate about", "hardworking", etc. Buzzwords are allowed ONLY if the same sentence contains a concrete number/evidence.
4. Vary sentence length and structure. Do not force a "rule of three" in every bullet.
5. Write in professional English, ${opts.tone === "formal" ? "formal" : opts.tone === "direct" ? "direct and achievement-based" : "warm and personal"}.
6. Use standard section names: "Experience", "Education", "Skills".`

  const experiencesBlock = profile.experiences.length
    ? profile.experiences
        .map(
          (e, i) => `EXPERIENCE ${i + 1}:
- id: ${e.id}
- title: ${e.title}
- organization: ${e.organization}
- type: ${e.type}
- dates: ${e.startDate} → ${e.current ? "Present" : e.endDate}
- description: ${e.description || "(none)"}
- achievements (raw, user-written): ${(e.achievements || []).join(" | ") || "(none)"}
- CONTEXT NOTES (the user's real details — use these): ${e.contextNotes || "(none)"}`
        )
        .join("\n\n")
    : "(no experiences provided)"

  const skillsBlock = profile.skills.length
    ? profile.skills
        .map((s) => `- ${s.name} [${s.category || "general"}] — context: ${s.context || "(none)"}`)
        .join("\n")
    : "(no skills provided)"

  const eduBlock = profile.educations.length
    ? profile.educations
        .map((e) => `- ${e.institution}, ${e.degree || ""} ${e.field || ""} (${e.startDate}–${e.current ? "Present" : e.endDate})`)
        .join("\n")
    : "(no education provided)"

  const user = `Generate an ATS-ready CV from this profile. Output STRICT JSON only (no markdown, no commentary).

Profile:
- Name: ${profile.fullName || "(name missing)"}
- Headline: ${profile.headline || "(headline missing)"}
- Email: ${profile.email || ""}
- Phone: ${profile.phone || ""}
- Location: ${profile.location || ""}
- Summary (raw): ${profile.summary || "(no summary)"}
- Target region: ${opts.region}

${experiencesBlock}

SKILLS:
${skillsBlock}

EDUCATION:
${eduBlock}

Return JSON with EXACTLY this shape:
{
  "headline": "<a single-line professional headline, max 12 words, derived from the profile>",
  "summary": "<2-3 sentences professional summary, grounded in the profile, no buzzwords without evidence>",
  "skillsByCategory": [{"category": "<group name>", "items": ["skill1","skill2"]}],
  "experiences": [
    {"experienceId": "<id from above>", "bullets": [{"text": "<bullet, starts with action verb, concrete>", "hasEvidence": true}]}
  ],
  "warnings": ["<any anti-generic warnings, e.g. 'Experience X has no measurable achievements — ask the user'>"]
}

Set hasEvidence=true ONLY if the bullet contains a number, metric, percentage, or a specific proper noun (project/client/product name) from the profile data. Put 2-4 bullets per experience. If an experience has no context_notes and no achievements, write 1 honest general bullet and add a warning.`

  return { sys, user }
}

/** Robustly extract JSON from an LLM response that may wrap it in markdown fences. */
function extractJSON(raw: string): unknown {
  let s = raw.trim()
  // strip ```json ... ``` fences
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fence) s = fence[1].trim()
  // find first { and last }
  const first = s.indexOf("{")
  const last = s.lastIndexOf("}")
  if (first !== -1 && last !== -1) s = s.slice(first, last + 1)
  return JSON.parse(s)
}

/** Generate a CV ATS from the profile using the LLM, with anti-generic enforcement. */
export async function generateCVATS(
  profile: SerializedProfile,
  opts: { locale: "id" | "en"; tone: string; region: string }
): Promise<GeneratedCVATS> {
  const { sys, user } = buildCVPrompt(profile, opts)
  const zai = await getZai()
  const completion = await zai.chat.completions.create({
    messages: [
      { role: "assistant", content: sys },
      { role: "user", content: user },
    ],
    thinking: { type: "disabled" },
  })
  const raw = completion.choices[0]?.message?.content ?? ""
  let parsed: GeneratedCVATS
  try {
    parsed = extractJSON(raw) as GeneratedCVATS
  } catch {
    // Fallback: minimal structure so the UI doesn't crash
    parsed = {
      headline: profile.headline || "",
      summary: profile.summary || "",
      skillsByCategory: profile.skills.length
        ? [{ category: "Skills", items: profile.skills.map((s) => s.name) }]
        : [],
      experiences: profile.experiences.map((e) => ({
        experienceId: e.id,
        bullets: (e.achievements?.length
          ? e.achievements
          : [e.description || e.title]
        ).map((text) => ({
          text: text || e.title,
          hasEvidence: detectEvidence(text || "") !== "none",
          evidenceType: detectEvidence(text || ""),
        })),
      })),
      warnings: ["LLM returned non-JSON; showing raw profile data. Try regenerating."],
    }
  }

  // Post-process: recompute hasEvidence deterministically (don't trust LLM's self-report)
  for (const exp of parsed.experiences ?? []) {
    for (const b of exp.bullets ?? []) {
      const et = detectEvidence(b.text)
      b.evidenceType = et
      b.hasEvidence = et !== "none"
    }
  }
  // Ensure warnings array exists
  if (!Array.isArray(parsed.warnings)) parsed.warnings = []

  // Add proactive warnings for experiences lacking context
  for (const e of profile.experiences) {
    const hasContext = (e.contextNotes || "").trim().length > 0
    const hasAchievements = (e.achievements || []).some((a) => a.trim().length > 0)
    if (!hasContext && !hasAchievements) {
      const w = isID(opts.locale)
        ? `Pengalaman "${e.title}" di ${e.organization} belum ada catatan konteks atau pencapaian terukur. Tambahkan detail konkret (nama proyek, angka) di profil untuk hasil CV yang lebih tajam.`
        : `Experience "${e.title}" at ${e.organization} has no context notes or measurable achievements. Add concrete details (project names, numbers) in your profile for a sharper CV.`
      parsed.warnings.push(w)
    }
  }

  return parsed
}

function isID(locale: string) {
  return locale === "id"
}

/* ===========================================================================
   Cover Letter (Brief Section 6.3)
   250-350 words, 3-4 paragraphs, from context_notes + specific experience.
   =========================================================================== */
export type GeneratedCoverLetter = {
  recipientGreeting: string
  paragraphs: string[]
  closing: string
  wordCount: number
  warnings: string[]
}

function buildCoverLetterPrompt(
  profile: SerializedProfile,
  opts: { locale: "id" | "en"; tone: string; region: string; position?: string; organization?: string }
) {
  const isIDLocale = opts.locale === "id"
  const sys = isIDLocale
    ? `Kamu penulis cover letter profesional. Aturan MUTLAK:
1. Tulis HANYA dari data pengalaman asli user. JANGAN mengarang pencapaian/angka/nama proyek yang tidak ada di data.
2. 250-350 kata, 3-4 paragraf.
3. Paragraf 1: pembuka yang menyebut posisi & organisasi tujuan, lalu satu kalimat mengapa kamu cocok (dari headline/profil).
4. Paragraf 2-3: bukti konkret dari 1-2 pengalaman ASLI user — sebut nama proyek/organisasi/angka dari context_notes. Pola Aksi+Konteks+Hasil.
5. Paragraf terakhir: penutup yang menghubungkan ke tujuan organisasi, bukan generik "Saya menantikan kabar Anda".
6. DILARANG buzzword tanpa bukti (results-driven, berorientasi hasil, dll).
7. Bahasa Indonesia, ${opts.tone === "formal" ? "formal" : opts.tone === "direct" ? "langsung" : "hangat & personal"}.`
    : `You are a professional cover letter writer. STRICT rules:
1. Write ONLY from the user's real experience data. NEVER invent achievements/numbers/project names not in the data.
2. 250-350 words, 3-4 paragraphs.
3. Paragraph 1: opening mentioning the position & target organization, then one sentence on why you fit (from headline/profile).
4. Paragraphs 2-3: concrete evidence from 1-2 REAL experiences — name projects/organizations/numbers from context_notes. Action+Context+Result pattern.
5. Last paragraph: closing connecting to the organization's goals, not generic "I look forward to hearing from you".
6. FORBIDDEN buzzwords without evidence (results-driven, detail-oriented, etc).
7. Professional English, ${opts.tone === "formal" ? "formal" : opts.tone === "direct" ? "direct" : "warm & personal"}.`

  const experiencesBlock = profile.experiences.length
    ? profile.experiences.map((e) => `- ${e.title} @ ${e.organization}: ${e.description || ""} | achievements: ${(e.achievements || []).join("; ")} | context: ${e.contextNotes || "(none)"}`).join("\n")
    : "(no experiences)"

  const user = `Generate a cover letter. Output STRICT JSON only.

Profile:
- Name: ${profile.fullName || "(name)"}
- Headline: ${profile.headline || ""}
- Email: ${profile.email || ""}
- Phone: ${profile.phone || ""}
- Summary: ${profile.summary || ""}

Target:
- Position: ${opts.position || "(general application)"}
- Organization: ${opts.organization || "(not specified)"}

Experiences:
${experiencesBlock}

Skills: ${profile.skills.map((s) => s.name).join(", ")}

Return JSON:
{
  "recipientGreeting": "<greeting line, e.g. 'Yth. Tim Rekrutmen,[org]' or 'Dear Hiring Team,[org]'>",
  "paragraphs": ["<p1>", "<p2>", "<p3>"],
  "closing": "<closing line + sign-off>",
  "wordCount": <actual total word count of all paragraphs>,
  "warnings": ["<any anti-generic warning>"]
}`

  return { sys, user }
}

export async function generateCoverLetter(
  profile: SerializedProfile,
  opts: { locale: "id" | "en"; tone: string; region: string; position?: string; organization?: string }
): Promise<GeneratedCoverLetter> {
  const { sys, user } = buildCoverLetterPrompt(profile, opts)
  const zai = await getZai()
  const completion = await zai.chat.completions.create({
    messages: [
      { role: "assistant", content: sys },
      { role: "user", content: user },
    ],
    thinking: { type: "disabled" },
  })
  const raw = completion.choices[0]?.message?.content ?? ""
  let parsed: GeneratedCoverLetter
  try {
    parsed = extractJSON(raw) as GeneratedCoverLetter
  } catch {
    parsed = {
      recipientGreeting: opts.locale === "id" ? "Yth. Tim Rekrutmen," : "Dear Hiring Team,",
      paragraphs: [profile.summary || profile.headline || ""],
      closing: opts.locale === "id" ? "Hormat saya," : "Sincerely,",
      wordCount: 0,
      warnings: ["LLM returned non-JSON; showing fallback. Try regenerating."],
    }
  }
  if (!Array.isArray(parsed.paragraphs)) parsed.paragraphs = []
  if (!Array.isArray(parsed.warnings)) parsed.warnings = []
  // recompute word count
  parsed.wordCount = parsed.paragraphs.join(" ").split(/\s+/).filter(Boolean).length
  return parsed
}

/* ===========================================================================
   Bio (Brief Section 6.5)
   Three versions: 1 sentence (headline), 1 paragraph (about), 3 paragraphs (personal page).
   =========================================================================== */
export type GeneratedBio = {
  headline: string // 1 sentence
  about: string // 1 paragraph
  personal: string[] // 3 paragraphs
  warnings: string[]
}

function buildBioPrompt(profile: SerializedProfile, opts: { locale: "id" | "en"; tone: string }) {
  const isIDLocale = opts.locale === "id"
  const sys = isIDLocale
    ? `Kamu penulis bio profesional. Aturan MUTLAK:
1. Tulis HANYA dari data asli user. Jangan mengarang.
2. DILARANG buzzword tanpa bukti.
3. Bahasa Indonesia, ${opts.tone === "formal" ? "formal" : opts.tone === "direct" ? "langsung" : "hangat & personal"}.
4. Hasilkan 3 versi: 1 kalimat (headline), 1 paragraf (about, 2-3 kalimat), 3 paragraf (untuk halaman personal — narasi lebih dalam dari pengalaman asli).`
    : `You are a professional bio writer. STRICT rules:
1. Write ONLY from the user's real data. Never invent.
2. FORBIDDEN buzzwords without evidence.
3. Professional English, ${opts.tone === "formal" ? "formal" : opts.tone === "direct" ? "direct" : "warm & personal"}.
4. Produce 3 versions: 1 sentence (headline), 1 paragraph (about, 2-3 sentences), 3 paragraphs (for a personal page — deeper narrative from real experience).`

  const experiencesBlock = profile.experiences.length
    ? profile.experiences.map((e) => `- ${e.title} @ ${e.organization}: ${e.contextNotes || e.description || ""}`).join("\n")
    : "(no experiences)"

  const user = `Generate a bio. Output STRICT JSON only.

Profile:
- Name: ${profile.fullName || "(name)"}
- Headline: ${profile.headline || ""}
- Summary: ${profile.summary || ""}
Experiences:
${experiencesBlock}
Skills: ${profile.skills.map((s) => s.name).join(", ")}

Return JSON:
{
  "headline": "<one sentence, max 20 words>",
  "about": "<one paragraph, 2-3 sentences>",
  "personal": ["<p1>", "<p2>", "<p3>"],
  "warnings": ["<any anti-generic warning>"]
}`

  return { sys, user }
}

export async function generateBio(
  profile: SerializedProfile,
  opts: { locale: "id" | "en"; tone: string }
): Promise<GeneratedBio> {
  const { sys, user } = buildBioPrompt(profile, opts)
  const zai = await getZai()
  const completion = await zai.chat.completions.create({
    messages: [
      { role: "assistant", content: sys },
      { role: "user", content: user },
    ],
    thinking: { type: "disabled" },
  })
  const raw = completion.choices[0]?.message?.content ?? ""
  let parsed: GeneratedBio
  try {
    parsed = extractJSON(raw) as GeneratedBio
  } catch {
    parsed = {
      headline: profile.headline || "",
      about: profile.summary || "",
      personal: [profile.summary || ""],
      warnings: ["LLM returned non-JSON; showing fallback. Try regenerating."],
    }
  }
  if (!Array.isArray(parsed.personal)) parsed.personal = []
  if (!Array.isArray(parsed.warnings)) parsed.warnings = []
  return parsed
}

/** Concreteness check for cover letter / bio (simpler: check for evidence in paragraphs). */
export function textConcretenessCheck(text: string, locale: "id" | "en"): { hasEvidence: boolean; buzzwords: string[] } {
  const hasEvidence = detectEvidence(text) !== "none"
  const list = locale === "id" ? BUZZWORDS_ID : BUZZWORDS_EN
  const t = text.toLowerCase()
  const buzzwords = list.filter((b) => t.includes(b))
  return { hasEvidence, buzzwords }
}
