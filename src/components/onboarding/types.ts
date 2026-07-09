// Shared types for the onboarding wizard & profile editor.
// These mirror the PUT /api/profile contract (src/app/api/profile/route.ts).

export type ExpType = "work" | "org" | "project" | "volunteer"
export type SkillCategory = "technical" | "soft" | "tool" | "domain"
export type SkillProficiency = "beginner" | "intermediate" | "advanced" | "expert"
export type LangLevel = "native" | "fluent" | "advanced" | "intermediate" | "beginner"
export type OppType = "work" | "org" | "scholarship" | "volunteer"
export type TargetRegion = "domestic" | "international"
export type Urgency = "deadline-soon" | "active" | "exploring"
export type PreferredTone = "formal" | "direct" | "warm"

export type ExperienceInput = {
  id: string
  type: ExpType
  title: string
  organization: string
  startDate: string
  endDate: string
  current: boolean
  description: string
  achievements: string // raw textarea; split into array on save
  contextNotes: string
}

export type SkillInput = {
  id: string
  name: string
  category: SkillCategory
  proficiency: SkillProficiency
  context: string
}

export type EducationInput = {
  id: string
  institution: string
  degree: string
  field: string
  startDate: string
  endDate: string
  current: boolean
  gpa: string
}

export type CertificationInput = {
  id: string
  name: string
  issuer: string
  issueDate: string
}

export type LanguageInput = {
  id: string
  language: string
  level: LangLevel
}

export type WizardState = {
  fullName: string
  headline: string
  email: string
  phone: string
  location: string
  linkedin: string
  portfolio: string
  summary: string
  experiences: ExperienceInput[]
  skills: SkillInput[]
  educations: EducationInput[]
  certifications: CertificationInput[]
  languages: LanguageInput[]
  opportunityTypes: OppType[]
  targetRegion: TargetRegion
  urgency: Urgency
  preferredTone: PreferredTone
}

export const emptyExperience = (): ExperienceInput => ({
  id: crypto.randomUUID(),
  type: "work",
  title: "",
  organization: "",
  startDate: "",
  endDate: "",
  current: false,
  description: "",
  achievements: "",
  contextNotes: "",
})

export const emptySkill = (): SkillInput => ({
  id: crypto.randomUUID(),
  name: "",
  category: "technical",
  proficiency: "intermediate",
  context: "",
})

export const emptyEducation = (): EducationInput => ({
  id: crypto.randomUUID(),
  institution: "",
  degree: "",
  field: "",
  startDate: "",
  endDate: "",
  current: false,
  gpa: "",
})

export const emptyCertification = (): CertificationInput => ({
  id: crypto.randomUUID(),
  name: "",
  issuer: "",
  issueDate: "",
})

export const emptyLanguage = (): LanguageInput => ({
  id: crypto.randomUUID(),
  language: "",
  level: "intermediate",
})

/** Build the JSON body to PUT /api/profile from a WizardState. */
export function buildProfilePayload(state: WizardState) {
  return {
    fullName: state.fullName,
    headline: state.headline,
    summary: state.summary,
    email: state.email,
    phone: state.phone,
    location: state.location,
    links: {
      linkedin: state.linkedin,
      portfolio: state.portfolio,
    },
    targetRegion: state.targetRegion,
    opportunityTypes: state.opportunityTypes,
    preferredTone: state.preferredTone,
    urgency: state.urgency,
    experiences: state.experiences
      .filter((e) => e.title.trim() || e.organization.trim())
      .map((e, i) => ({
        type: e.type,
        title: e.title,
        organization: e.organization,
        startDate: e.startDate || null,
        endDate: e.current ? "Present" : e.endDate || null,
        current: e.current,
        description: e.description || null,
        achievements: e.achievements
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean),
        contextNotes: e.contextNotes || null,
        order: i,
      })),
    skills: state.skills
      .filter((s) => s.name.trim())
      .map((s, i) => ({
        name: s.name,
        category: s.category,
        proficiency: s.proficiency,
        context: s.context || null,
        order: i,
      })),
    educations: state.educations
      .filter((e) => e.institution.trim())
      .map((e, i) => ({
        institution: e.institution,
        degree: e.degree || null,
        field: e.field || null,
        startDate: e.startDate || null,
        endDate: e.current ? "Present" : e.endDate || null,
        current: e.current,
        gpa: e.gpa || null,
        order: i,
      })),
    certifications: state.certifications
      .filter((c) => c.name.trim())
      .map((c, i) => ({
        name: c.name,
        issuer: c.issuer || null,
        issueDate: c.issueDate || null,
        order: i,
      })),
    languages: state.languages
      .filter((l) => l.language.trim())
      .map((l, i) => ({
        language: l.language,
        level: l.level,
        order: i,
      })),
  }
}
