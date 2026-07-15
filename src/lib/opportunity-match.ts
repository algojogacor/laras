import "server-only"
import { db } from "@/lib/db"

// ============================================================================
// Phase 3B — Opportunity Match Analysis Service
// ============================================================================

export interface MatchRequirement {
  required: string[]
  preferred: string[]
  minimumEducation?: string
  minimumGPA?: number
  maxAge?: number
}

export interface MatchGap {
  field: string
  label: string
  type: "strength" | "gap" | "partial"
  detail: string
  verified: boolean
}

export interface MatchResult {
  overallScore: number
  categoryScores: {
    requiredSkills: number   // 0-40
    preferredSkills: number  // 0-20
    experience: number       // 0-20
    education: number        // 0-10
    languages: number        // 0-10
  }
  strengths: MatchGap[]
  gaps: MatchGap[]
  partial: MatchGap[]
  analyzedAt: string
}

function parseRequirements(raw: string | null | undefined): MatchRequirement {
  if (!raw) return { required: [], preferred: [] }
  try {
    const parsed = JSON.parse(raw)
    return {
      required: Array.isArray(parsed.required) ? parsed.required.map((s: unknown) => String(s).toLowerCase().trim()) : [],
      preferred: Array.isArray(parsed.preferred) ? parsed.preferred.map((s: unknown) => String(s).toLowerCase().trim()) : [],
      minimumEducation: typeof parsed.minimumEducation === "string" ? parsed.minimumEducation.toLowerCase().trim() : undefined,
      minimumGPA: typeof parsed.minimumGPA === "number" ? parsed.minimumGPA : undefined,
      maxAge: typeof parsed.maxAge === "number" ? parsed.maxAge : undefined,
    }
  } catch {
    // If it's plain text (not JSON), treat each line as a required item
    const lines = raw.split(/[\n,]/).map(s => s.trim().toLowerCase()).filter(Boolean)
    return { required: lines, preferred: [] }
  }
}

/**
 * Normalize a skill/requirement term for fuzzy comparison.
 * Removes common suffixes, normalizes spacing.
 */
function normalizeTerm(term: string): string {
  return term
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

/**
 * Check if a profile skill matches a requirement term.
 * Uses substring matching for partial matches.
 */
function skillMatches(skillName: string, reqTerm: string): "exact" | "partial" | "none" {
  const sn = normalizeTerm(skillName)
  const rt = normalizeTerm(reqTerm)
  if (sn === rt) return "exact"
  if (sn.includes(rt) || rt.includes(sn)) return "partial"
  return "none"
}

/**
 * Extract skill names from profile skills array.
 */
function getProfileSkillNames(skills: { name: string }[]): string[] {
  return skills.map(s => s.name)
}

/**
 * Extract experience-related keywords from profile experiences.
 */
function getExperienceKeywords(experiences: { title: string; description?: string | null; achievements?: string | null }[]): string[] {
  const kws = new Set<string>()
  for (const exp of experiences) {
    const text = [exp.title, exp.description, exp.achievements].filter(Boolean).join(" ")
    text.split(/\s+/).forEach(w => {
      const clean = w.toLowerCase().replace(/[^a-z0-9]/g, "").trim()
      if (clean.length > 2) kws.add(clean)
    })
  }
  return [...kws]
}

/**
 * Map education level to a numeric rank for comparison.
 */
function educationRank(level: string | null | undefined): number {
  if (!level) return 0
  const l = level.toLowerCase().trim()
  if (l.includes("phd") || l.includes("doktor") || l.includes("s3") || l.includes("doctorate")) return 6
  if (l.includes("master") || l.includes("magister") || l.includes("s2") || l.includes("graduate")) return 5
  if (l.includes("bachelor") || l.includes("sarjana") || l.includes("s1") || l.includes("undergraduate")) return 4
  if (l.includes("associate") || l.includes("diploma") || l.includes("d3") || l.includes("d4")) return 3
  if (l.includes("high school") || l.includes("sma") || l.includes("smk") || l.includes("secondary")) return 2
  return 1
}

/**
 * Determine the highest education level from the profile.
 */
function getHighestEducationRank(educations: { degree?: string | null; field?: string | null }[]): number {
  let maxRank = 0
  for (const edu of educations) {
    const r = educationRank(edu.degree)
    if (r > maxRank) maxRank = r
  }
  return maxRank
}

/**
 * Get language levels from profile.
 */
function getLanguageMap(languages: { language: string; level?: string | null }[]): Map<string, string> {
  const map = new Map<string, string>()
  for (const lang of languages) {
    map.set(lang.language.toLowerCase().trim(), (lang.level || "beginner").toLowerCase().trim())
  }
  return map
}

/**
 * Map CEFR/descriptive language level to numeric rank.
 */
function languageRank(level: string): number {
  const l = level.toLowerCase().trim()
  if (l === "native" || l.includes("c2") || l === "fluent") return 5
  if (l.includes("c1") || l === "advanced") return 4
  if (l.includes("b2") || l === "intermediate") return 3
  if (l.includes("b1")) return 2
  if (l.includes("a1") || l.includes("a2") || l === "beginner") return 1
  return 1
}

/**
 * Core match analysis function.
 *
 * Loads an opportunity's requirements and compares them against the user's
 * profile (skills, experience, education, languages, evidence).
 *
 * Returns a MatchResult with scores, strengths, gaps, and partial matches.
 * Distinguishes verified evidence from self-declared data.
 */
export async function analyzeMatch(
  opportunityId: string,
  profileId: string,
): Promise<MatchResult> {
  // Check profile exists first
  const profile = await db.userProfile.findUnique({
    where: { id: profileId },
    select: {
      id: true,
      fullName: true,
      educations: { orderBy: { order: "asc" }, select: { id: true, degree: true, field: true, institution: true, gpa: true } },
      skills: { orderBy: { order: "asc" }, select: { id: true, name: true, category: true, proficiency: true, context: true } },
      experiences: { orderBy: { order: "asc" }, select: { id: true, title: true, organization: true, description: true, achievements: true, type: true } },
      languages: { orderBy: { order: "asc" }, select: { id: true, language: true, level: true } },
    },
  })
  if (!profile) {
    throw new Error("Profile not found")
  }

  // Load opportunity
  const opportunity = await db.opportunity.findFirst({
    where: { id: opportunityId, userProfileId: profileId },
    select: { id: true, requirements: true, title: true, type: true },
  })
  if (!opportunity) {
    throw new Error("Opportunity not found")
  }

  // Load evidence for verified vs self-declared distinction
  const evidence = await db.evidence.findMany({
    where: { userProfileId: profileId },
    select: { id: true, type: true, title: true, verificationStatus: true },
  })

  const verifiedEvidenceTitles = new Set(
    evidence
      .filter(e => e.verificationStatus === "verified")
      .map(e => e.title.toLowerCase().trim())
  )

  const reqs = parseRequirements(opportunity.requirements)

  const strengths: MatchGap[] = []
  const gaps: MatchGap[] = []
  const partials: MatchGap[] = []

  // ---- 1. Required Skills (0-40 points) ----
  const profileSkillNames = getProfileSkillNames(profile.skills)
  let requiredScore = 0
  const maxRequired = Math.max(reqs.required.length, 1)
  const skillVerified = (name: string) => verifiedEvidenceTitles.has(name.toLowerCase().trim())

  for (const reqSkill of reqs.required) {
    let matched = false
    let partialMatched = false
    for (const skill of profile.skills) {
      const m = skillMatches(skill.name, reqSkill)
      if (m === "exact") { matched = true; break }
      if (m === "partial") partialMatched = true
    }
    if (matched) {
      requiredScore += 1
      strengths.push({
        field: "skills",
        label: reqSkill,
        type: "strength",
        detail: `Kamu memiliki keahlian "${reqSkill}" yang sesuai.`,
        verified: skillVerified(reqSkill),
      })
    } else if (partialMatched) {
      requiredScore += 0.5
      partials.push({
        field: "skills",
        label: reqSkill,
        type: "partial",
        detail: `Keahlian "${reqSkill}" sebagian terpenuhi — kamu memiliki keahlian terkait.`,
        verified: false,
      })
    } else {
      gaps.push({
        field: "skills",
        label: reqSkill,
        type: "gap",
        detail: `Kamu belum memiliki keahlian "${reqSkill}" yang dibutuhkan.`,
        verified: false,
      })
    }
  }

  const requiredSkillsScore = Math.round((requiredScore / maxRequired) * 40)

  // ---- 2. Preferred Skills (0-20 points) ----
  let preferredScore = 0
  const maxPreferred = Math.max(reqs.preferred.length, 1)

  for (const prefSkill of reqs.preferred) {
    let matched = false
    let partialMatched = false
    for (const skill of profile.skills) {
      const m = skillMatches(skill.name, prefSkill)
      if (m === "exact") { matched = true; break }
      if (m === "partial") partialMatched = true
    }

    if (matched) {
      preferredScore += 1
      strengths.push({
        field: "skills",
        label: prefSkill,
        type: "strength",
        detail: `Kamu memiliki keahlian preferensi "${prefSkill}".`,
        verified: skillVerified(prefSkill),
      })
    } else if (partialMatched) {
      preferredScore += 0.5
      partials.push({
        field: "skills",
        label: prefSkill,
        type: "partial",
        detail: `Keahlian preferensi "${prefSkill}" sebagian terpenuhi.`,
        verified: false,
      })
    } else {
      gaps.push({
        field: "skills",
        label: prefSkill,
        type: "gap",
        detail: `Keahlian preferensi "${prefSkill}" belum dimiliki — nilai tambah jika dipenuhi.`,
        verified: false,
      })
    }
  }

  const preferredSkillsScore = Math.round((preferredScore / maxPreferred) * 20)

  // ---- 3. Experience Match (0-20 points) ----
  let experienceScore = 0
  const expCount = profile.experiences.length

  if (expCount === 0) {
    experienceScore = 0
    gaps.push({
      field: "experience",
      label: "experienceCount",
      type: "gap",
      detail: "Kamu belum memiliki pengalaman yang tercatat — tambahkan riwayat pengalamanmu.",
      verified: false,
    })
  } else {
    // Base score from experience count
    const countScore = Math.min(expCount * 2, 10)
    experienceScore += countScore

    // Relevance: check if experience titles/organizations relate to opportunity
    const oppTitle = opportunity.title.toLowerCase().split(/\s+/)
    const oppType = opportunity.type.toLowerCase()
    const expKeywords = getExperienceKeywords(profile.experiences)
    const oppKeywords = new Set(oppTitle.filter(w => w.length > 3))

    let relevanceMatches = 0
    for (const kw of oppKeywords) {
      if (expKeywords.includes(kw)) relevanceMatches++
    }

    const relevanceScore = Math.min(relevanceMatches * 2, 10)
    experienceScore += relevanceScore

    if (expCount >= 2) {
      strengths.push({
        field: "experience",
        label: "experienceCount",
        type: "strength",
        detail: `Kamu memiliki ${expCount} pengalaman tercatat.`,
        verified: false,
      })
    }

    if (relevanceMatches > 0) {
      strengths.push({
        field: "experience",
        label: "experienceRelevance",
        type: "strength",
        detail: `${relevanceMatches} kata kunci dari lowongan cocok dengan pengalamanmu.`,
        verified: false,
      })
    }

    if (relevanceMatches === 0) {
      partials.push({
        field: "experience",
        label: "experienceRelevance",
        type: "partial",
        detail: "Pengalamanmu ada, tapi belum tampak terkait dengan lowongan ini secara langsung.",
        verified: false,
      })
    }
  }

  // ---- 4. Education Match (0-10 points) ----
  let educationScore = 0
  const highestEduRank = getHighestEducationRank(profile.educations)

  if (highestEduRank === 0) {
    educationScore = 0
    gaps.push({
      field: "education",
      label: "educationRequired",
      type: "gap",
      detail: "Kamu belum menambahkan riwayat pendidikan.",
      verified: false,
    })
  } else {
    // If minimumEducation is specified, check against it
    const minEduRank = reqs.minimumEducation ? educationRank(reqs.minimumEducation) : 0

    if (minEduRank > 0 && highestEduRank < minEduRank) {
      educationScore = 3
      partials.push({
        field: "education",
        label: "educationLevel",
        type: "partial",
        detail: `Pendidikan tertinggimu di bawah minimum yang diminta (${reqs.minimumEducation}).`,
        verified: !!profile.educations[0]?.degree && verifiedEvidenceTitles.has(profile.educations[0].degree.toLowerCase().trim()),
      })
    } else if (minEduRank > 0 && highestEduRank >= minEduRank) {
      educationScore = 10
      strengths.push({
        field: "education",
        label: "educationLevel",
        type: "strength",
        detail: `Pendidikanmu memenuhi atau melampaui syarat minimum.`,
        verified: !!profile.educations[0]?.degree && verifiedEvidenceTitles.has(profile.educations[0].degree.toLowerCase().trim()),
      })
    } else {
      // No minimum specified, score based on having education data
      educationScore = Math.min(highestEduRank * 2, 10)

      if (highestEduRank >= 4) {
        strengths.push({
          field: "education",
          label: "educationLevel",
          type: "strength",
          detail: `Kamu memiliki latar belakang pendidikan S1 atau lebih tinggi.`,
          verified: false,
        })
      } else {
        partials.push({
          field: "education",
          label: "educationLevel",
          type: "partial",
          detail: "Pendidikanmu sudah tercatat, tapi belum mencapai jenjang sarjana.",
          verified: false,
        })
      }
    }

    // Check GPA if specified
    if (reqs.minimumGPA !== undefined && profile.educations.length > 0) {
      const gpaStr = profile.educations[0].gpa
      const gpa = gpaStr ? parseFloat(gpaStr) : NaN
      if (!isNaN(gpa)) {
        if (gpa >= reqs.minimumGPA) {
          strengths.push({
            field: "education",
            label: "gpa",
            type: "strength",
            detail: `IPK-mu (${gpa}) memenuhi syarat minimum (${reqs.minimumGPA}).`,
            verified: false,
          })
        } else {
          gaps.push({
            field: "education",
            label: "gpa",
            type: "gap",
            detail: `IPK-mu (${gpa}) di bawah syarat minimum (${reqs.minimumGPA}).`,
            verified: false,
          })
        }
      }
    }
  }

  // ---- 5. Language Proficiency (0-10 points) ----
  let languageScore = 0
  const langMap = getLanguageMap(profile.languages)

  if (profile.languages.length === 0) {
    languageScore = 0
    gaps.push({
      field: "languages",
      label: "languages",
      type: "gap",
      detail: "Kamu belum menambahkan data kemampuan bahasa.",
      verified: false,
    })
  } else {
    // Score based on quantity and level of languages
    const totalLangScore = profile.languages.reduce((sum, lang) => sum + languageRank(lang.level || "beginner"), 0)
    languageScore = Math.min(Math.round((totalLangScore / (profile.languages.length * 5)) * 10), 10)

    // Check English specifically (most common requirement)
    const englishLevel = langMap.get("english") || langMap.get("inggris") || langMap.get("bahasa inggris")
    if (englishLevel) {
      const engRank = languageRank(englishLevel)
      if (engRank >= 3) {
        strengths.push({
          field: "languages",
          label: "english",
          type: "strength",
          detail: `Kemampuan bahasa Inggrismu tercatat pada level "${englishLevel}".`,
          verified: false,
        })
      } else {
        partials.push({
          field: "languages",
          label: "english",
          type: "partial",
          detail: `Kemampuan bahasa Inggrismu masih di level dasar — pertimbangkan untuk meningkatkannya.`,
          verified: false,
        })
      }
    } else {
      partials.push({
        field: "languages",
        label: "english",
        type: "partial",
        detail: "Belum ada data kemampuan bahasa Inggris — banyak lowongan mensyaratkannya.",
        verified: false,
      })
    }

    if (profile.languages.length >= 2) {
      strengths.push({
        field: "languages",
        label: "multilingual",
        type: "strength",
        detail: `Kamu mencatat ${profile.languages.length} bahasa — nilai tambah untuk peran global.`,
        verified: false,
      })
    }
  }

  // ---- Final Composite Score ----
  const overallScore = Math.min(
    requiredSkillsScore + preferredSkillsScore + experienceScore + educationScore + languageScore,
    100
  )

  const result: MatchResult = {
    overallScore,
    categoryScores: {
      requiredSkills: requiredSkillsScore,
      preferredSkills: preferredSkillsScore,
      experience: experienceScore,
      education: educationScore,
      languages: languageScore,
    },
    strengths,
    gaps,
    partial: partials,
    analyzedAt: new Date().toISOString(),
  }

  // Persist match results to the opportunity
  await db.opportunity.update({
    where: { id: opportunityId },
    data: {
      matchScore: overallScore,
      matchDetail: JSON.stringify(result),
    },
  })

  return result
}

/**
 * Retrieve existing match detail from the opportunity if already computed.
 */
export async function getExistingMatch(
  opportunityId: string,
  profileId: string,
): Promise<MatchResult | null> {
  const opportunity = await db.opportunity.findFirst({
    where: { id: opportunityId, userProfileId: profileId },
    select: { matchScore: true, matchDetail: true },
  })
  if (!opportunity || !opportunity.matchDetail) return null
  try {
    return JSON.parse(opportunity.matchDetail) as MatchResult
  } catch {
    return null
  }
}
