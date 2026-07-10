import type { ProfileWithRelations } from "@/lib/profile"

// ---------------------------------------------------------------------------
// Career Readiness Engine — Brief §9.1 (Career Graph + Progress Graph)
// ---------------------------------------------------------------------------
// Two layers:
//   1. Profile Breakdown — 6 dimensions, each 0–100, so users see exactly
//      what to improve (advances the "Progress Graph" primitive).
//   2. Readiness Score — a composite 0–100 north-star metric combining
//      profile completeness + document/application/interview/english activity.
// ---------------------------------------------------------------------------

export type DimensionKey =
  | "basics"
  | "experience"
  | "skills"
  | "education"
  | "languages"
  | "preferences"

export interface DimensionScore {
  key: DimensionKey
  score: number // 0–100
  filled: number // count of filled items
  total: number // total items in this dimension
}

export interface ProfileBreakdown {
  dimensions: DimensionScore[]
  overall: number // 0–100 (weighted)
}

/**
 * Compute a 6-dimension profile breakdown.
 * Each dimension is independently scored so the UI can show exactly where
 * the user is strong vs. thin — directly supporting the "Progress Graph".
 */
export function computeProfileBreakdown(
  p: Partial<ProfileWithRelations>
): ProfileBreakdown {
  // 1. Basics — 6 core fields
  const basicsFields = [p.fullName, p.headline, p.summary, p.email, p.phone, p.location]
  const basicsFilled = basicsFields.filter(
    (v) => v != null && String(v).trim().length > 0
  ).length

  // Links count toward basics too (but as a bonus, not a separate dimension)
  let linksFilled = 0
  try {
    const links = p.links ? JSON.parse(p.links) : null
    if (links && (links.linkedin || links.portfolio || links.website || links.github))
      linksFilled = 1
  } catch {
    /* ignore */
  }
  const basicsTotal = 6
  const basicsScore = Math.round(((basicsFilled + linksFilled) / (basicsTotal + 1)) * 100)

  // 2. Experience — count + context-notes coverage
  const exps = p.experiences ?? []
  const expWithNotes = exps.filter((e) => (e.contextNotes ?? "").trim().length > 0).length
  const expTotal = exps.length
  // Score: having ≥1 exp = 50%, having context notes on any = +50%
  const expScore =
    exps.length === 0 ? 0 : Math.min(100, 50 + (expWithNotes > 0 ? 50 : 0))

  // 3. Skills — count tiers (1, 3, 5+) + context coverage
  const skills = p.skills ?? []
  const skillsWithCtx = skills.filter((s) => (s.context ?? "").trim().length > 0).length
  let skillScore = 0
  if (skills.length >= 1) skillScore += 30
  if (skills.length >= 3) skillScore += 30
  if (skills.length >= 5) skillScore += 20
  if (skillsWithCtx > 0) skillScore += 20
  skillScore = Math.min(100, skillScore)

  // 4. Education
  const edus = p.educations ?? []
  const eduScore = edus.length > 0 ? 100 : 0

  // 5. Languages
  const langs = p.languages ?? []
  const langScore = langs.length > 0 ? 100 : 0

  // 6. Preferences — opportunityTypes, targetRegion, preferredTone
  const prefFields = [p.opportunityTypes, p.targetRegion, p.preferredTone]
  const prefFilled = prefFields.filter(
    (v) => v != null && String(v).trim().length > 0
  ).length
  const prefScore = Math.round((prefFilled / 3) * 100)

  const dimensions: DimensionScore[] = [
    { key: "basics", score: basicsScore, filled: basicsFilled + linksFilled, total: basicsTotal + 1 },
    { key: "experience", score: expScore, filled: exps.length, total: Math.max(exps.length, 1) },
    { key: "skills", score: skillScore, filled: skills.length, total: Math.max(skills.length, 5) },
    { key: "education", score: eduScore, filled: edus.length, total: Math.max(edus.length, 1) },
    { key: "languages", score: langScore, filled: langs.length, total: Math.max(langs.length, 1) },
    { key: "preferences", score: prefScore, filled: prefFilled, total: 3 },
  ]

  // Weighted overall (basics and experience weigh most)
  const weights: Record<DimensionKey, number> = {
    basics: 0.25,
    experience: 0.25,
    skills: 0.20,
    education: 0.10,
    languages: 0.08,
    preferences: 0.12,
  }
  const overall = Math.round(
    dimensions.reduce((sum, d) => sum + d.score * weights[d.key], 0)
  )

  return { dimensions, overall: Math.min(100, overall) }
}

// ---------------------------------------------------------------------------
// Composite Readiness Score — the north-star "are you ready?" metric.
// ---------------------------------------------------------------------------

export interface ReadinessInput {
  completion: number // profile completeness 0–100
  docCount: number
  appCount: number
  interviewCount: number
  englishCount: number
}

export type ReadinessLevel = "starter" | "building" | "ready" | "competitive"

export interface ReadinessComponent {
  key: string
  label: string // i18n label (set by caller)
  value: number // 0–100
  weight: number // 0–1
}

export interface ReadinessResult {
  score: number // 0–100 composite
  level: ReadinessLevel
  components: Omit<ReadinessComponent, "label">[]
}

/**
 * Compute the composite Career Readiness Score.
 *
 * Weights reflect the LARAS lifecycle (Brief §8):
 *   - Profile completeness is the foundation (30%)
 *   - Having documents proves you can "Prove" (20%)
 *   - Tracking applications shows you "Apply" (20%)
 *   - Interview prep means you're preparing to "Interview" (15%)
 *   - English readiness supports international opportunities (15%)
 *
 * Each activity component saturates quickly (1 item = 60%, 3 = 100%) so the
 * score rewards breadth of engagement, not raw volume.
 */
export function computeReadinessScore(input: ReadinessInput): ReadinessResult {
  const { completion, docCount, appCount, interviewCount, englishCount } = input

  const saturate = (n: number) => Math.min(100, n >= 3 ? 100 : n === 2 ? 80 : n === 1 ? 60 : 0)

  const components: Omit<ReadinessComponent, "label">[] = [
    { key: "profile", value: completion, weight: 0.3 },
    { key: "documents", value: saturate(docCount), weight: 0.2 },
    { key: "applications", value: saturate(appCount), weight: 0.2 },
    { key: "interview", value: saturate(interviewCount), weight: 0.15 },
    { key: "english", value: saturate(englishCount), weight: 0.15 },
  ]

  const score = Math.round(
    components.reduce((sum, c) => sum + c.value * c.weight, 0)
  )

  let level: ReadinessLevel = "starter"
  if (score >= 75) level = "competitive"
  else if (score >= 50) level = "ready"
  else if (score >= 25) level = "building"

  return { score: Math.min(100, score), level, components }
}

// ---------------------------------------------------------------------------
// Activity timeline — unify documents, applications, interviews, english.
// ---------------------------------------------------------------------------

export type ActivityKind = "document" | "application" | "interview" | "english"

export interface ActivityItem {
  id: string
  kind: ActivityKind
  title: string
  subtitle: string
  href: string
  timestamp: Date
}

/**
 * Merge heterogeneous recent activities into a single chronological timeline.
 */
export function buildActivityTimeline(params: {
  documents: { id: string; type: string; title: string; updatedAt: Date }[]
  applications: { id: string; position: string; organization: string; status: string; updatedAt: Date }[]
  interviews: { id: string; title: string; role: string; updatedAt: Date }[]
  english: { id: string; createdAt: Date; score: number | null }[]
  typeLabels: Record<string, string>
}): ActivityItem[] {
  const { documents, applications, interviews, english, typeLabels } = params
  const items: ActivityItem[] = []

  for (const d of documents) {
    items.push({
      id: `doc-${d.id}`,
      kind: "document",
      title: d.title,
      subtitle: typeLabels[d.type] ?? d.type,
      href: `/documents/${d.type}/${d.id}`,
      timestamp: d.updatedAt,
    })
  }
  for (const a of applications) {
    items.push({
      id: `app-${a.id}`,
      kind: "application",
      title: a.position,
      subtitle: `${a.organization} · ${a.status}`,
      href: `/applications`,
      timestamp: a.updatedAt,
    })
  }
  for (const i of interviews) {
    items.push({
      id: `iv-${i.id}`,
      kind: "interview",
      title: i.title || i.role || "Interview set",
      subtitle: i.role || "",
      href: `/interview/${i.id}`,
      timestamp: i.updatedAt,
    })
  }
  for (const e of english) {
    items.push({
      id: `en-${e.id}`,
      kind: "english",
      title: e.score != null ? `English session · ${e.score}` : "English session",
      subtitle: "Practice",
      href: `/english`,
      timestamp: e.createdAt,
    })
  }

  return items.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, 8)
}
