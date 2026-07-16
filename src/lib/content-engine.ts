import { createCompletion, extractJSON, LARAS_AI_MODEL } from "@/lib/ai/deepseek"
import type { SerializedProfile } from "@/lib/profile"
import { parseStructured } from "@/lib/ai/structured-output"
import { z } from "zod"

const bulletSchema = z.object({ text: z.string().trim().min(1).max(2000), hasEvidence: z.boolean(), evidenceType: z.enum(["metric", "proper-noun", "scale", "none"]) }).strict()
const cvSchema = z.object({
  headline: z.string().max(500), summary: z.string().max(10000),
  skillsByCategory: z.array(z.object({ category: z.string().min(1).max(200), items: z.array(z.string().min(1).max(200)).max(50) }).strict()).max(30),
  experiences: z.array(z.object({ experienceId: z.string().min(1).max(200), bullets: z.array(bulletSchema).max(30) }).strict()).max(100),
  warnings: z.array(z.string().max(1000)).max(50),
}).strict()
const coverLetterSchema = z.object({ recipientGreeting: z.string().max(500), paragraphs: z.array(z.string().min(1).max(10000)).min(1).max(10), closing: z.string().max(500), wordCount: z.number().int().nonnegative().max(10000), warnings: z.array(z.string().max(1000)).max(50) }).strict()
const bioSchema = z.object({ headline: z.string().max(1000), about: z.string().max(10000), personal: z.array(z.string().max(10000)).min(1).max(10), warnings: z.array(z.string().max(1000)).max(50) }).strict()
const essaySchema = z.object({ title: z.string().max(500), paragraphs: z.array(z.string().min(1).max(15000)).min(1).max(20), wordCount: z.number().int().nonnegative().max(30000), warnings: z.array(z.string().max(1000)).max(50) }).strict()

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
 *
 * Powered by DeepSeek V4 Pro via the centralized provider at @/lib/ai/deepseek.
 */

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

/** Generate a CV ATS from the profile using the LLM, with anti-generic enforcement. */
export async function generateCVATS(
  profile: SerializedProfile,
  opts: { locale: "id" | "en"; tone: string; region: string }
): Promise<GeneratedCVATS> {
  const { sys, user } = buildCVPrompt(profile, opts)
  const completion = await createCompletion({
    messages: [
      { role: "assistant", content: sys },
      { role: "user", content: user },
    ],
  })
  const raw = completion.choices[0]?.message?.content ?? ""
  const parsed = parseStructured(raw, cvSchema, "cv-ats") as GeneratedCVATS

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
  const completion = await createCompletion({
    messages: [
      { role: "assistant", content: sys },
      { role: "user", content: user },
    ],
  })
  const raw = completion.choices[0]?.message?.content ?? ""
  const parsed = parseStructured(raw, coverLetterSchema, "cover-letter") as GeneratedCoverLetter
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
  const completion = await createCompletion({
    messages: [
      { role: "assistant", content: sys },
      { role: "user", content: user },
    ],
  })
  const raw = completion.choices[0]?.message?.content ?? ""
  const parsed = parseStructured(raw, bioSchema, "bio") as GeneratedBio
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

/* ===========================================================================
   Opportunity Essays (Brief Section 2.5, 5.4, 6.6)
   STRICTEST verification: probing Q&A BEFORE any draft is written.
   =========================================================================== */
export type EssayProbingQuestion = { id: string; question: string; hint: string }

export async function generateEssayProbing(opts: {
  locale: "id" | "en"
  essayType: string // scholarship | org | volunteer | personal-statement | motivation-letter
  prompt: string
  targetOrg: string
}): Promise<EssayProbingQuestion[]> {
  const isIDLocale = opts.locale === "id"
  const sys = isIDLocale
    ? `Kamu konsultan esai seleksi. Tugasmu: susun 3-5 pertanyaan probing yang SPESIFIK ke jenis esai & tujuan user, untuk menggali detail autentik SEBELUM esai ditulis. Aturan:
1. Pertanyaan harus memancing jawaban konkret (motivasi spesifik, tantangan nyata, kontribusi konkret) — bukan ya/tidak.
2. Jangan minta data yang sudah ada di profil standar (nama, pendidikan). Gali yang HANYA user tahu.
3. Sesuaikan ke jenis esai: beasiswa=kebutuhan finansian+rencana studi; organisasi=kontribusi+nilai selaras; volunteer=motivasi pelayanan; personal statement=narasi tumbuh; motivation letter=kenapa program ini.
Output JSON array saja: [{"id":"q1","question":"...","hint":"petunjuk singkat jawaban seperti apa"}]`
    : `You are a selection essay consultant. Your task: compose 3-5 probing questions SPECIFIC to the essay type & user's goal, to dig authentic details BEFORE the essay is written. Rules:
1. Questions must prompt concrete answers (specific motivation, real challenges, concrete contribution) — not yes/no.
2. Don't ask for data already in a standard profile (name, education). Dig what ONLY the user knows.
3. Tailor to essay type: scholarship=financial need+study plan; org=contribution+aligned values; volunteer=service motivation; personal statement=growth narrative; motivation letter=why this program.
Output JSON array only: [{"id":"q1","question":"...","hint":"short hint what kind of answer"}]`

  const user = `Essay type: ${opts.essayType}\nPrompt/requirements: ${opts.prompt || "(none)"}\nTarget organization: ${opts.targetOrg || "(not specified)"}`

  const completion = await createCompletion({
    messages: [
      { role: "assistant", content: sys },
      { role: "user", content: user },
    ],
  })
  const raw = completion.choices[0]?.message?.content ?? ""
  try {
    const parsed = extractJSON(raw)
    const arr = Array.isArray(parsed) ? parsed : (parsed as any).questions ?? []
    return arr.slice(0, 5).map((q: any, i: number) => ({
      id: q.id || `q${i + 1}`,
      question: q.question || q.q || "",
      hint: q.hint || "",
    })).filter((q: EssayProbingQuestion) => q.question)
  } catch {
    // fallback generic probing questions
    const fb = isIDLocale
      ? [
        { id: "q1", question: "Apa momen spesifik yang membuatmu tertarik dengan kesempatan ini?", hint: "Sebut kejadian/peristiwa konkret, bukan alasan umum." },
        { id: "q2", question: "Tantangan nyata apa yang pernah kamu hadapi dan bagaimana kamu menyelesaikannya?", hint: "Nama proyek/situasi + langkah + hasil." },
        { id: "q3", question: "Kontribusi konkret apa yang bisa kamu berikan?", hint: "Skill/pengalaman spesifik yang relevan." },
      ]
      : [
        { id: "q1", question: "What specific moment made you interested in this opportunity?", hint: "Name a concrete event, not a general reason." },
        { id: "q2", question: "What real challenge have you faced and how did you resolve it?", hint: "Project/situation name + steps + result." },
        { id: "q3", question: "What concrete contribution can you make?", hint: "Specific relevant skill/experience." },
      ]
    return fb
  }
}

export type GeneratedEssay = {
  title: string
  paragraphs: string[]
  wordCount: number
  warnings: string[]
  probingQA: { id: string; question: string; answer: string }[]
}

export async function generateEssay(
  profile: SerializedProfile,
  opts: {
    locale: "id" | "en"
    tone: string
    essayType: string
    prompt: string
    targetOrg: string
    wordLimit: number | null
    probingQA: { id: string; question: string; answer: string }[]
  }
): Promise<GeneratedEssay> {
  const isIDLocale = opts.locale === "id"
  const wordLimitText = opts.wordLimit ? `PANJANG WAJIB: ${opts.wordLimit} kata (hormati dengan presisi, bukan mendekati).` : "Panjang: 400-600 kata."
  const sys = isIDLocale
    ? `Kamu penulis esai seleksi. Aturan MUTLAK (TARUHAN TINGGI — esai beasiswa/organisasi):
1. Tulis HANYA dari data profil + jawaban probing user. JANGAN PERNAH mengarang detail personal (kondisi ekonomi, nama kejadian, angka) yang tidak ada di jawaban user.
2. Pembuka HARUS personal (kejadian/momen spesifik dari jawaban probing), BUKAN "Saya menulis untuk menyatakan minat saya...".
3. 1-2 bukti konkret dari pengalaman ASLI user (dari profil atau jawaban probing) — sebut nama proyek/angka.
4. Penutup hubungkan ke tujuan/organisasi spesifik.
5. ${wordLimitText}
6. DILARANG buzzword tanpa bukti. Variasikan struktur kalimat.`
    : `You are a selection essay writer. STRICT rules (HIGH STAKES — scholarship/org essays):
1. Write ONLY from profile data + user's probing answers. NEVER invent personal details (financial situation, event names, numbers) not in the user's answers.
2. Opening MUST be personal (specific event/moment from probing answers), NOT "I am writing to express my interest...".
3. 1-2 concrete evidence from the user's REAL experience (profile or probing answers) — name projects/numbers.
4. Closing connects to the specific goal/organization.
5. ${wordLimitText}
6. FORBIDDEN buzzwords without evidence. Vary sentence structure.`

  const qaBlock = opts.probingQA.filter((q) => q.answer.trim()).map((q) => `Q: ${q.question}\nA: ${q.answer}`).join("\n\n") || "(no probing answers)"
  const expBlock = profile.experiences.length
    ? profile.experiences.map((e) => `- ${e.title} @ ${e.organization}: ${e.contextNotes || e.description || ""}`).join("\n")
    : "(no experiences)"

  const user = `Generate a selection essay. Output STRICT JSON only.

Profile:
- Name: ${profile.fullName || "(name)"}
- Headline: ${profile.headline || ""}
- Summary: ${profile.summary || ""}

Essay:
- Type: ${opts.essayType}
- Prompt/requirements: ${opts.prompt || "(none)"}
- Target organization: ${opts.targetOrg || "(not specified)"}

Probing Q&A (use these authentic details — they are the user's real voice):
${qaBlock}

User's experiences:
${expBlock}

Return JSON:
{
  "title": "<essay title, max 8 words>",
  "paragraphs": ["<p1 opening personal>", "<p2 evidence>", "<p3 evidence/closing>", "<p4 closing>"],
  "wordCount": <actual total word count>,
  "warnings": ["<any anti-generic warning>"]
}`

  const completion = await createCompletion({
    messages: [
      { role: "assistant", content: sys },
      { role: "user", content: user },
    ],
  })
  const raw = completion.choices[0]?.message?.content ?? ""
  const parsed = parseStructured(raw, essaySchema, "essay") as GeneratedEssay
  if (!Array.isArray(parsed.paragraphs)) parsed.paragraphs = []
  if (!Array.isArray(parsed.warnings)) parsed.warnings = []
  parsed.wordCount = parsed.paragraphs.join(" ").split(/\s+/).filter(Boolean).length
  parsed.probingQA = opts.probingQA
  return parsed
}

/* ===========================================================================
   Interview Prep (Brief Section 2.3, 11)
   Question generation from role + answer feedback.
   =========================================================================== */
export type GeneratedInterviewQuestion = {
  id: string
  question: string
  category: string // behavioral | technical | motivational | situational
}

export async function generateInterviewQuestions(opts: {
  locale: "id" | "en"
  role: string
  context: string // pasted job desc or org info
  count?: number
}): Promise<GeneratedInterviewQuestion[]> {
  const count = opts.count ?? 6
  const isIDLocale = opts.locale === "id"
  const sys = isIDLocale
    ? `Kamu pewawancara berpengalaman. Susun ${count} pertanyaan wawancara yang realistis berdasarkan role & konteks. Variasikan kategori: behavioral (pengalaman masa lalu), technical (skill spesifik), motivational (kenapa role/org ini), situational (skenario hipotetis). Output JSON array: [{"id":"q1","question":"...","category":"behavioral"}]`
    : `You are an experienced interviewer. Compose ${count} realistic interview questions based on the role & context. Vary categories: behavioral (past experience), technical (specific skill), motivational (why this role/org), situational (hypothetical scenario). Output JSON array: [{"id":"q1","question":"...","category":"behavioral"}]`

  const completion = await createCompletion({
    messages: [
      { role: "assistant", content: sys },
      { role: "user", content: `Role: ${opts.role || "(general)"}\nContext: ${opts.context || "(none)"}` },
    ],
  })
  const raw = completion.choices[0]?.message?.content ?? ""
  try {
    const parsed = extractJSON(raw)
    const arr = Array.isArray(parsed) ? parsed : (parsed as any).questions ?? (parsed as any).data ?? []
    return arr.slice(0, count).map((q: any, i: number) => ({
      id: q.id || `q${i + 1}`,
      question: q.question || q.q || "",
      category: q.category || "behavioral",
    })).filter((q: GeneratedInterviewQuestion) => q.question)
  } catch {
    return []
  }
}

export type AnswerFeedback = {
  structureScore: number // 0-100 (STAR pattern: situation-action-result)
  specificityScore: number // 0-100 (concrete evidence vs vague)
  lengthScore: number // 0-100 (not too short, not rambling)
  overall: number
  feedback: string[]
  suggestedAnswer: string
}

export async function generateAnswerFeedback(opts: {
  locale: "id" | "en"
  question: string
  userAnswer: string
  profile: SerializedProfile
}): Promise<AnswerFeedback> {
  const isIDLocale = opts.locale === "id"
  const sys = isIDLocale
    ? `Kamu coach wawancara. Nilai jawaban user untuk pertanyaan wawancara. Penilaian:
1. structureScore: seberapa baik mengikuti pola Situasi-Aksi-Hasil (0-100).
2. specificityScore: seberapa konkret (ada nama proyek/angka) vs generik (0-100).
3. lengthScore: panjang tepat (100-300 kata) vs terlalu pendek/panjang (0-100).
4. overall: rata-rata tertimbang.
5. feedback: 2-3 saran perbaikan spesifik (array).
6. suggestedAnswer: contoh jawaban yang lebih baik, dibangun dari pengalaman ASLI user di profil — JANGAN mengarang.
Output JSON: {"structureScore":N,"specificityScore":N,"lengthScore":N,"overall":N,"feedback":["..."],"suggestedAnswer":"..."}`
    : `You are an interview coach. Score the user's answer to an interview question. Scoring:
1. structureScore: how well it follows Situation-Action-Result pattern (0-100).
2. specificityScore: how concrete (project names/numbers) vs vague (0-100).
3. lengthScore: appropriate length (100-300 words) vs too short/long (0-100).
4. overall: weighted average.
5. feedback: 2-3 specific improvement suggestions (array).
6. suggestedAnswer: a better example answer, built from the user's REAL experience in profile — DON'T invent.
Output JSON: {"structureScore":N,"specificityScore":N,"lengthScore":N,"overall":N,"feedback":["..."],"suggestedAnswer":"..."}`

  const expBlock = opts.profile.experiences.length
    ? opts.profile.experiences.map((e) => `- ${e.title} @ ${e.organization}: ${e.contextNotes || e.description || ""}`).join("\n")
    : "(no experiences)"

  const completion = await createCompletion({
    messages: [
      { role: "assistant", content: sys },
      { role: "user", content: `Question: ${opts.question}\n\nUser's answer: ${opts.userAnswer}\n\nUser's real experiences (use for suggestedAnswer):\n${expBlock}` },
    ],
  })
  const raw = completion.choices[0]?.message?.content ?? ""
  try {
    const parsed = extractJSON(raw) as AnswerFeedback
    return {
      structureScore: Math.round(parsed.structureScore || 0),
      specificityScore: Math.round(parsed.specificityScore || 0),
      lengthScore: Math.round(parsed.lengthScore || 0),
      overall: Math.round(parsed.overall || 0),
      feedback: Array.isArray(parsed.feedback) ? parsed.feedback : [],
      suggestedAnswer: parsed.suggestedAnswer || "",
    }
  } catch {
    return {
      structureScore: 0, specificityScore: 0, lengthScore: 0, overall: 0,
      feedback: ["Could not analyze answer. Try again."],
      suggestedAnswer: "",
    }
  }
}

/* ===========================================================================
   English Readiness (Brief Section 10.1, 10.2)
   Reading + Structure — generated on-the-go (text only, no audio, serverless-safe).
   Passages/questions are always new (anti-hafalan), varied difficulty.
   =========================================================================== */
export type ReadingQuestion = {
  id: string
  question: string
  options: string[]
  answer: number // index of correct option
  explanation: string
}
export type GeneratedReading = {
  title: string
  passage: string
  questions: ReadingQuestion[]
  difficulty: "easy" | "medium" | "hard"
  topic: string
}

const READING_TOPICS = [
  "technology", "environment", "culture", "education", "health", "business",
  "science", "history", "psychology", "society", "art", "travel",
]

export async function generateReading(opts: {
  locale: "id" | "en" // always generates English passages (TOEFL-style) but UI locale for meta
  difficulty: "easy" | "medium" | "hard"
  topic?: string
}): Promise<GeneratedReading> {
  const topic = opts.topic || READING_TOPICS[Math.floor(Math.random() * READING_TOPICS.length)]
  const diffWordCount = opts.difficulty === "easy" ? "200-280" : opts.difficulty === "medium" ? "280-380" : "380-500"
  const sys = `You are an English exam writer creating TOEFL/IELTS-style reading comprehension passages and questions. Rules:
1. Write an ORIGINAL academic-style passage (not copied) about the given topic. Length: ${diffWordCount} words. Difficulty: ${opts.difficulty}.
2. Generate 5 multiple-choice questions testing comprehension (main idea, detail, inference, vocabulary-in-context, author purpose).
3. Each question has 4 options (A-D). Mark the correct answer index (0-3).
4. Provide a short explanation for each answer.
5. Vary the passage and questions every time — never reuse.
Output STRICT JSON only: {"title":"<short title>","passage":"<full passage>","difficulty":"${opts.difficulty}","topic":"${topic}","questions":[{"id":"q1","question":"...","options":["A","B","C","D"],"answer":0,"explanation":"..."}]}`

  const completion = await createCompletion({
    messages: [
      { role: "assistant", content: sys },
      { role: "user", content: `Topic: ${topic}. Difficulty: ${opts.difficulty}. Generate a fresh passage + 5 questions.` },
    ],
  })
  const raw = completion.choices[0]?.message?.content ?? ""
  try {
    const parsed = extractJSON(raw) as GeneratedReading
    return {
      title: parsed.title || topic,
      passage: parsed.passage || "",
      difficulty: parsed.difficulty || opts.difficulty,
      topic: parsed.topic || topic,
      questions: (parsed.questions || []).slice(0, 5).map((q, i) => ({
        id: q.id || `q${i + 1}`,
        question: q.question || "",
        options: Array.isArray(q.options) ? q.options.slice(0, 4) : [],
        answer: typeof q.answer === "number" ? q.answer : 0,
        explanation: q.explanation || "",
      })).filter((q) => q.question && q.options.length === 4),
    }
  } catch {
    return {
      title: topic, passage: "", difficulty: opts.difficulty, topic, questions: [],
    }
  }
}

export type StructureQuestion = {
  id: string
  question: string
  options: string[]
  answer: number
  explanation: string
  type: "error-identification" | "sentence-completion"
}
export type GeneratedStructure = {
  questions: StructureQuestion[]
  difficulty: "easy" | "medium" | "hard"
}

export async function generateStructure(opts: {
  difficulty: "easy" | "medium" | "hard"
  count?: number
}): Promise<GeneratedStructure> {
  const count = opts.count ?? 8
  const sys = `You are an English grammar exam writer creating TOEFL-style "Structure and Written Expression" questions. Rules:
1. Generate ${count} questions. Mix two types:
   - "sentence-completion": a sentence with a blank, 4 options to fill it.
   - "error-identification": a sentence with 4 underlined parts (A-D), pick the one with the grammatical error.
2. Difficulty: ${opts.difficulty}. Test: subject-verb agreement, tense, parallel structure, word form, articles, prepositions, relative clauses, conditionals.
3. Each question has 4 options. Mark correct answer index (0-3). Provide a short grammar explanation.
4. Vary questions every time.
Output STRICT JSON only: {"difficulty":"${opts.difficulty}","questions":[{"id":"q1","question":"...","options":["A","B","C","D"],"answer":0,"explanation":"...","type":"sentence-completion"}]}`

  const completion = await createCompletion({
    messages: [
      { role: "assistant", content: sys },
      { role: "user", content: `Generate ${count} ${opts.difficulty} structure questions.` },
    ],
  })
  const raw = completion.choices[0]?.message?.content ?? ""
  try {
    const parsed = extractJSON(raw) as GeneratedStructure
    return {
      difficulty: parsed.difficulty || opts.difficulty,
      questions: (parsed.questions || []).slice(0, count).map((q, i) => ({
        id: q.id || `q${i + 1}`,
        question: q.question || "",
        options: Array.isArray(q.options) ? q.options.slice(0, 4) : [],
        answer: typeof q.answer === "number" ? q.answer : 0,
        explanation: q.explanation || "",
        type: (q.type === "error-identification" ? "error-identification" : "sentence-completion") as StructureQuestion["type"],
      })).filter((q) => q.question && q.options.length === 4),
    }
  } catch {
    return { difficulty: opts.difficulty, questions: [] }
  }
}

/* ===========================================================================
   Listening (Brief Section 10.3)
   Generates a short English script (<1024 chars for TTS limit) + questions.
   Audio is generated on-the-go via TTS in dev mode (Brief allows text on-the-go;
   audio is technically supposed to be pre-generated, but dev-mode on-the-go is
   acceptable until the Koyeb/Kokoro batch pipeline is built).
   =========================================================================== */
export type GeneratedListening = {
  title: string
  script: string
  speaker: string // description: "Conversation between two students" etc.
  questions: ReadingQuestion[] // reuse the same question type
  difficulty: "easy" | "medium" | "hard"
  topic: string
}

const LISTENING_SCENARIOS = [
  "a conversation between two students about a group project",
  "a lecture excerpt about environmental science",
  "a conversation between a student and a professor during office hours",
  "a campus announcement about an upcoming event",
  "a discussion between two friends about a movie they just watched",
  "a news report about a recent scientific discovery",
  "a job interview excerpt for a marketing position",
  "a library orientation for new students",
]

export async function generateListening(opts: {
  difficulty: "easy" | "medium" | "hard"
}): Promise<GeneratedListening> {
  const scenario = LISTENING_SCENARIOS[Math.floor(Math.random() * LISTENING_SCENARIOS.length)]
  const wordTarget = opts.difficulty === "easy" ? "100-130" : opts.difficulty === "medium" ? "130-160" : "160-200"
  const sys = `You are an English listening exam writer creating TOEFL/IELTS-style listening scripts. Rules:
1. Write a SHORT English script (aim for ${wordTarget} words, MUST be under 900 characters total including spaces) about: ${scenario}.
2. For conversations, use "Speaker 1:" and "Speaker 2:" labels. For lectures/announcements, use a single speaker.
3. Natural spoken English, not academic prose. Include fillers, pauses, conversational contractions.
4. Generate 5 multiple-choice comprehension questions (main idea, detail, inference, speaker purpose, vocabulary).
5. Each question has 4 options (A-D). Mark correct answer index (0-3). Provide short explanation.
6. Vary content every time.
Output STRICT JSON: {"title":"<short>","script":"<full script under 900 chars>","speaker":"<description>","difficulty":"${opts.difficulty}","topic":"${scenario}","questions":[{"id":"q1","question":"...","options":["A","B","C","D"],"answer":0,"explanation":"..."}]}`

  const completion = await createCompletion({
    messages: [
      { role: "assistant", content: sys },
      { role: "user", content: `Generate a ${opts.difficulty} listening script about ${scenario}.` },
    ],
  })
  const raw = completion.choices[0]?.message?.content ?? ""
  try {
    const parsed = extractJSON(raw) as GeneratedListening
    return {
      title: parsed.title || scenario,
      script: (parsed.script || "").slice(0, 1020), // TTS limit safety
      speaker: parsed.speaker || scenario,
      difficulty: parsed.difficulty || opts.difficulty,
      topic: parsed.topic || scenario,
      questions: (parsed.questions || []).slice(0, 5).map((q, i) => ({
        id: q.id || `q${i + 1}`,
        question: q.question || "",
        options: Array.isArray(q.options) ? q.options.slice(0, 4) : [],
        answer: typeof q.answer === "number" ? q.answer : 0,
        explanation: q.explanation || "",
      })).filter((q) => q.question && q.options.length === 4),
    }
  } catch {
    return { title: scenario, script: "", speaker: scenario, difficulty: opts.difficulty, topic: scenario, questions: [] }
  }
}
