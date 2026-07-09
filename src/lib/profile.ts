import type {
  UserProfile,
  Experience,
  Education,
  Skill,
  Certification,
  LanguageProficiency,
} from "@prisma/client"

export type ProfileWithRelations = UserProfile & {
  experiences: Experience[]
  educations: Education[]
  skills: Skill[]
  certifications: Certification[]
  languages: LanguageProficiency[]
}

/** Compute a 0-100 profile completeness score (Brief Section 4.1). */
export function computeCompletion(p: Partial<ProfileWithRelations>): number {
  let score = 0
  let max = 0

  // Basics (6 fields)
  const basics = [p.fullName, p.headline, p.summary, p.email, p.phone, p.location]
  max += basics.length * 8
  score += basics.filter(Boolean).filter((v) => String(v).trim().length > 0).length * 8

  // Links
  max += 8
  try {
    const links = p.links ? JSON.parse(p.links) : null
    if (links && (links.linkedin || links.portfolio || links.website || links.github)) score += 8
  } catch {
    /* ignore */
  }

  // Experiences (at least 1 with context notes)
  max += 16
  const exps = p.experiences ?? []
  if (exps.length > 0) {
    score += 8
    if (exps.some((e) => (e.contextNotes ?? "").trim().length > 0)) score += 8
  }

  // Skills (at least 3 with context)
  max += 12
  const skills = p.skills ?? []
  if (skills.length >= 1) score += 4
  if (skills.length >= 3) score += 4
  if (skills.some((s) => (s.context ?? "").trim().length > 0)) score += 4

  // Education
  max += 8
  if ((p.educations ?? []).length > 0) score += 8

  // Languages
  max += 4
  if ((p.languages ?? []).length > 0) score += 4

  // Preferences
  max += 12
  if (p.opportunityTypes) score += 4
  if (p.targetRegion) score += 4
  if (p.preferredTone) score += 4

  return Math.min(100, Math.round((score / max) * 100))
}

/** Serialize a profile (with relations) into a plain JSON-safe object for the client/export. */
export function serializeProfile(p: ProfileWithRelations) {
  return {
    id: p.id,
    fullName: p.fullName,
    headline: p.headline,
    summary: p.summary,
    email: p.email,
    phone: p.phone,
    location: p.location,
    photoUrl: p.photoUrl,
    links: p.links ? JSON.parse(p.links) : {},
    uiLocale: p.uiLocale,
    docLocale: p.docLocale,
    targetRegion: p.targetRegion,
    opportunityTypes: p.opportunityTypes ? JSON.parse(p.opportunityTypes) : [],
    preferredTone: p.preferredTone,
    urgency: p.urgency,
    targetExamScore: p.targetExamScore,
    onboardingComplete: p.onboardingComplete,
    onboardingStep: p.onboardingStep,
    profileCompletion: p.profileCompletion,
    experiences: p.experiences.map((e) => ({
      ...e,
      achievements: e.achievements ? JSON.parse(e.achievements) : [],
    })),
    educations: p.educations,
    skills: p.skills,
    certifications: p.certifications,
    languages: p.languages,
  }
}

export type SerializedProfile = ReturnType<typeof serializeProfile>
