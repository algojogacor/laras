// This module is the authoritative public-profile projection. It is invoked
// only by server code; Client Components may import its DTO types with
// `import type`, but must never receive the raw projection inputs.

export type PublicProfileViewerClass =
  | "OWNER"
  | "ACCEPTED_CONNECTION"
  | "PENDING_CONNECTION"
  | "AUTHENTICATED_STRANGER"
  | "ANONYMOUS"

export type PublicProfileControlledField =
  | "fullName"
  | "email"
  | "phone"
  | "location"
  | "links"
  | "experiences"
  | "education"
  | "skills"
  | "certifications"
  | "languages"
  | "summary"

type Visibility = "public" | "connections" | "private"

type RelationshipRecord = {
  requesterId: string
  addresseeId: string
  status: unknown
}

type ProjectionProfile = {
  id: string
  accountId: string
  fullName: string | null
  headline: string | null
  summary: string | null
  email: string | null
  phone: string | null
  location: string | null
  photoUrl: string | null
  links: string | null
  createdAt: Date
  experiences: Array<{
    title: string
    organization: string
    startDate: string | null
    endDate: string | null
    current: boolean
    location: string | null
    description: string | null
    achievements?: string | null
    contextNotes?: string | null
  }>
  educations: Array<{
    institution: string
    degree: string | null
    field: string | null
    startDate: string | null
    endDate: string | null
    current: boolean
    gpa?: string | null
    description?: string | null
  }>
  skills: Array<{
    name: string
    category: string | null
    proficiency: string | null
    context?: string | null
  }>
  certifications: Array<{
    name: string
    issuer: string | null
    credentialId?: string | null
    url?: string | null
  }>
  languages: Array<{ language: string; level: string | null }>
  verificationBadges: Array<{
    type: string
    status: string
    evidence?: string | null
    note?: string | null
  }>
}

export type PublicProfileProjectionInput = {
  profile: ProjectionProfile
  consentSettings: Array<{ field: unknown; visibility: unknown }>
  viewer: { accountId: string; profileId: string | null } | null
  relationships?: readonly RelationshipRecord[] | null
}

export type PublicProfileDTO = {
  viewerClass: PublicProfileViewerClass
  omittedFields: PublicProfileControlledField[]
  profile: {
    fullName?: string | null
    headline: string | null
    summary?: string | null
    email?: string | null
    phone?: string | null
    location?: string | null
    photoUrl: string | null
    links?: Record<string, string>
    memberSince: string
    experiences?: Array<{
      title: string
      organization: string
      startDate: string | null
      endDate: string | null
      current: boolean
      location: string | null
      description: string | null
    }>
    educations?: Array<{
      institution: string
      degree: string | null
      field: string | null
      startDate: string | null
      endDate: string | null
      current: boolean
    }>
    skills?: Array<{
      name: string
      category: string | null
      proficiency: string | null
    }>
    certifications?: Array<{ name: string; issuer: string | null }>
    languages?: Array<{ language: string; level: string | null }>
    verifiedBadges: string[]
  }
}

const CONTROLLED_FIELDS = [
  "fullName",
  "email",
  "phone",
  "location",
  "links",
  "experiences",
  "education",
  "skills",
  "certifications",
  "languages",
] as const

const DEFAULT_VISIBILITY: Record<(typeof CONTROLLED_FIELDS)[number], Visibility> = {
  fullName: "public",
  email: "private",
  phone: "private",
  location: "connections",
  links: "connections",
  experiences: "public",
  education: "public",
  skills: "public",
  certifications: "public",
  languages: "public",
}

const VALID_VISIBILITY = new Set<Visibility>(["public", "connections", "private"])
const SAFE_LINK_KEYS = new Set(["linkedin", "portfolio", "github", "website", "other"])
const PUBLIC_VERIFICATION_TYPES = new Set([
  "email",
  "phone",
  "identity",
  "education",
  "employment",
  "skill",
])

function isVisibility(value: unknown): value is Visibility {
  return typeof value === "string" && VALID_VISIBILITY.has(value as Visibility)
}

function resolveConsent(
  settings: PublicProfileProjectionInput["consentSettings"]
): Record<(typeof CONTROLLED_FIELDS)[number], Visibility | null> {
  const result = {} as Record<(typeof CONTROLLED_FIELDS)[number], Visibility | null>

  for (const field of CONTROLLED_FIELDS) {
    const matches = settings.filter((setting) => setting.field === field)
    if (matches.length === 0) {
      result[field] = DEFAULT_VISIBILITY[field]
    } else if (matches.length === 1 && isVisibility(matches[0].visibility)) {
      result[field] = matches[0].visibility
    } else {
      result[field] = null
    }
  }

  return result
}

function classifyViewer({
  profile,
  viewer,
  relationships,
}: Pick<PublicProfileProjectionInput, "profile" | "viewer" | "relationships">): PublicProfileViewerClass {
  if (!viewer) return "ANONYMOUS"
  if (viewer.accountId === profile.accountId) return "OWNER"
  if (!viewer.profileId || !relationships || relationships.length !== 1) {
    return "AUTHENTICATED_STRANGER"
  }

  const relationship = relationships[0]
  const isExpectedPair =
    (relationship.requesterId === viewer.profileId && relationship.addresseeId === profile.id) ||
    (relationship.requesterId === profile.id && relationship.addresseeId === viewer.profileId)
  if (!isExpectedPair) return "AUTHENTICATED_STRANGER"
  if (relationship.status === "accepted") return "ACCEPTED_CONNECTION"
  if (relationship.status === "pending") return "PENDING_CONNECTION"
  return "AUTHENTICATED_STRANGER"
}

function canSee(
  visibility: Visibility | null,
  viewerClass: PublicProfileViewerClass
): boolean {
  if (viewerClass === "OWNER") return true
  if (visibility === "public") return true
  return visibility === "connections" && viewerClass === "ACCEPTED_CONNECTION"
}

function parseSafeLinks(value: string | null): Record<string, string> | undefined {
  if (!value) return {}
  try {
    const parsed: unknown = JSON.parse(value)
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return undefined

    const links: Record<string, string> = {}
    for (const [key, url] of Object.entries(parsed)) {
      if (!SAFE_LINK_KEYS.has(key) || typeof url !== "string" || !url) continue
      const parsedUrl = new URL(url)
      if (parsedUrl.protocol !== "https:" && parsedUrl.protocol !== "http:") continue
      links[key] = parsedUrl.toString()
    }
    return links
  } catch {
    return undefined
  }
}

export function projectPublicProfile(
  input: PublicProfileProjectionInput
): PublicProfileDTO {
  const { profile } = input
  const viewerClass = classifyViewer(input)
  const consent = resolveConsent(input.consentSettings)
  const omittedFields: PublicProfileControlledField[] = []
  const projected: PublicProfileDTO["profile"] = {
    headline: profile.headline,
    photoUrl: profile.photoUrl,
    memberSince: profile.createdAt.toISOString(),
    verifiedBadges: profile.verificationBadges
      .filter(
        (badge) =>
          badge.status === "verified" && PUBLIC_VERIFICATION_TYPES.has(badge.type)
      )
      .map((badge) => badge.type),
  }

  const include = (
    field: (typeof CONTROLLED_FIELDS)[number],
    apply: () => boolean | void
  ) => {
    if (!canSee(consent[field], viewerClass)) {
      omittedFields.push(field)
      return
    }
    if (apply() === false) omittedFields.push(field)
  }

  include("fullName", () => {
    projected.fullName = profile.fullName
  })
  include("email", () => {
    projected.email = profile.email
  })
  include("phone", () => {
    projected.phone = profile.phone
  })
  include("location", () => {
    projected.location = profile.location
  })
  include("links", () => {
    const links = parseSafeLinks(profile.links)
    if (links === undefined) return false
    projected.links = links
  })
  include("experiences", () => {
    projected.experiences = profile.experiences.map((experience) => ({
      title: experience.title,
      organization: experience.organization,
      startDate: experience.startDate,
      endDate: experience.endDate,
      current: experience.current,
      location: experience.location,
      description: experience.description,
    }))
  })
  include("education", () => {
    projected.educations = profile.educations.map((education) => ({
      institution: education.institution,
      degree: education.degree,
      field: education.field,
      startDate: education.startDate,
      endDate: education.endDate,
      current: education.current,
    }))
  })
  include("skills", () => {
    projected.skills = profile.skills.map((skill) => ({
      name: skill.name,
      category: skill.category,
      proficiency: skill.proficiency,
    }))
  })
  include("certifications", () => {
    projected.certifications = profile.certifications.map((certification) => ({
      name: certification.name,
      issuer: certification.issuer,
    }))
  })
  include("languages", () => {
    projected.languages = profile.languages.map((language) => ({
      language: language.language,
      level: language.level,
    }))
  })

  if (viewerClass === "OWNER") {
    projected.summary = profile.summary
  } else {
    omittedFields.push("summary")
  }

  return { viewerClass, omittedFields, profile: projected }
}
