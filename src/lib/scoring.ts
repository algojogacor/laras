/**
 * TOEFL/IELTS scoring engine (Brief: TOEFL/IELTS 2026-Ready Test Spec).
 *
 * ALL scores are PRACTICE ESTIMATES — never official.
 * Labels: "Estimated practice score", "Not an official score".
 */

export type TestSpec = "TOEFL_IBT_2026" | "TOEFL_IBT_LEGACY_COMPAT" | "IELTS_ACADEMIC" | "IELTS_GENERAL_TRAINING" | "LARAS_TOEFL_STYLE" | "LARAS_IELTS_STYLE"

export type ScoringResult = {
  rawScore: number
  total: number
  percentage: number
  estimatedCEFR: string
  estimatedTOEFL2026: number // 1-6 scale
  estimatedTOEFLLegacy: number | null // 0-120 comparable
  estimatedIELTSBand: number | null // 0-9
  confidence: "low" | "medium" | "high"
  label: string // "Estimated practice score"
  disclaimer: string
}

const DISCLAIMER = "Bukan skor resmi TOEFL/IELTS. Ini adalah estimasi hasil latihan di platform Laras dan tidak dapat menggantikan skor resmi dari ETS, IELTS, British Council, IDP, Cambridge, atau lembaga penguji resmi lainnya."

/** Calculate estimated practice scores from raw score. */
export function calculateScore(
  correct: number,
  total: number,
  testSpec: TestSpec = "LARAS_TOEFL_STYLE"
): ScoringResult {
  const percentage = total > 0 ? Math.round((correct / total) * 100) : 0

  // CEFR estimation based on percentage + total questions
  let cefr = "A2"
  if (percentage >= 90) cefr = "C1"
  else if (percentage >= 75) cefr = "B2"
  else if (percentage >= 60) cefr = "B1"
  else if (percentage >= 40) cefr = "A2"
  else cefr = "A1"

  // TOEFL 2026 scale: 1-6 with 0.5 increments
  const toefl2026 = Math.max(1, Math.min(6, Math.round((percentage / 100) * 6 * 2) / 2))

  // TOEFL legacy 0-120 comparable (only if legacy compat)
  const toeflLegacy = testSpec === "TOEFL_IBT_LEGACY_COMPAT" || testSpec === "TOEFL_IBT_2026"
    ? Math.round((percentage / 100) * 120)
    : null

  // IELTS band 0-9
  const ieltsBand = testSpec === "IELTS_ACADEMIC" || testSpec === "IELTS_GENERAL_TRAINING" || testSpec === "LARAS_IELTS_STYLE"
    ? Math.max(0, Math.min(9, Math.round((percentage / 100) * 9 * 2) / 2))
    : null

  // Confidence based on question count
  let confidence: "low" | "medium" | "high" = "low"
  if (total >= 10) confidence = "medium"
  if (total >= 20) confidence = "high"

  return {
    rawScore: correct,
    total,
    percentage,
    estimatedCEFR: cefr,
    estimatedTOEFL2026: toefl2026,
    estimatedTOEFLLegacy: toeflLegacy,
    estimatedIELTSBand: ieltsBand,
    confidence,
    label: "Estimated practice score",
    disclaimer: DISCLAIMER,
  }
}

/** Get skill tags from question results for weakness analysis. */
export function getSkillBreakdown(
  results: { isCorrect: boolean; category?: string }[],
  questions: { category?: string }[]
): { tag: string; correct: number; total: number; percentage: number }[] {
  const tags: Record<string, { correct: number; total: number }> = {}
  
  results.forEach((r, i) => {
    const tag = questions[i]?.category || "general"
    if (!tags[tag]) tags[tag] = { correct: 0, total: 0 }
    tags[tag].total++
    if (r.isCorrect) tags[tag].correct++
  })

  return Object.entries(tags).map(([tag, stats]) => ({
    tag,
    correct: stats.correct,
    total: stats.total,
    percentage: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0,
  })).sort((a, b) => a.percentage - b.percentage) // weakest first
}

/** Get weakness tags (skills below 60%). */
export function getWeaknessTags(breakdown: { tag: string; percentage: number }[]): string[] {
  return breakdown.filter((b) => b.percentage < 60).map((b) => b.tag)
}
