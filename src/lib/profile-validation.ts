import { AuthorizationError } from "@/lib/authorization"

// ---------------------------------------------------------------------------
// Profile PUT validation — durable security decisions
// ---------------------------------------------------------------------------

/** Maximum number of items allowed per child collection. */
export const MAX_EXPERIENCES = 20
export const MAX_EDUCATIONS = 10
export const MAX_SKILLS = 30
export const MAX_CERTIFICATIONS = 20
export const MAX_LANGUAGES = 10

/** Maximum string length for free-text profile fields. */
const MAX_TEXT_LENGTH = 2000
/** Maximum string length for short fields (names, titles, etc.). */
const MAX_SHORT_LENGTH = 256

/** Fields that must never be reassigned from client input. */
const PROTECTED_FIELDS = new Set([
  "id",
  "accountId",
  "userProfileId",
  "ownerId",
  "parentId",
  "createdAt",
  "updatedAt",
])

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v)
}

function isString(v: unknown): v is string {
  return typeof v === "string"
}

function isOptionalString(v: unknown): v is string | null | undefined {
  return v === null || v === undefined || typeof v === "string"
}

function isBoolean(v: unknown): v is boolean {
  return typeof v === "boolean"
}

function isNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v)
}

function isOptionalNumber(v: unknown): v is number | null | undefined {
  return v === null || v === undefined || (typeof v === "number" && Number.isFinite(v))
}

function isArrayOfStrings(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((item) => typeof item === "string")
}

function isOptionalArrayOfStrings(v: unknown): v is string[] | null | undefined {
  return v === null || v === undefined || isArrayOfStrings(v)
}

function stripProtected(obj: Record<string, unknown>): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {}
  for (const key of Object.keys(obj)) {
    if (!PROTECTED_FIELDS.has(key)) {
      cleaned[key] = obj[key]
    }
  }
  return cleaned
}

function validateStringField(
  value: unknown,
  name: string,
  maxLen: number,
  required: boolean
): asserts value is string {
  if (value === undefined || value === null) {
    if (required) throw new AuthorizationError("BAD_REQUEST")
    return
  }
  if (!isString(value)) throw new AuthorizationError("BAD_REQUEST")
  if (value.length > maxLen) throw new AuthorizationError("BAD_REQUEST")
}

function validateOptionalStringField(
  value: unknown,
  name: string,
  maxLen: number
): void {
  if (value === undefined || value === null) return
  if (!isString(value)) throw new AuthorizationError("BAD_REQUEST")
  if (value.length > maxLen) throw new AuthorizationError("BAD_REQUEST")
}

/**
 * Validates a single experience child object.
 * Strips protected fields and validates required/optional types.
 */
function validateExperience(item: unknown): Record<string, unknown> {
  if (!isPlainObject(item)) throw new AuthorizationError("BAD_REQUEST")
  const c = stripProtected(item)
  validateStringField(c.type, "type", MAX_SHORT_LENGTH, false)
  validateStringField(c.title, "title", MAX_SHORT_LENGTH, true)
  validateStringField(c.organization, "organization", MAX_SHORT_LENGTH, true)
  validateOptionalStringField(c.startDate, "startDate", MAX_SHORT_LENGTH)
  validateOptionalStringField(c.endDate, "endDate", MAX_SHORT_LENGTH)
  if (c.current !== undefined && c.current !== null && !isBoolean(c.current))
    throw new AuthorizationError("BAD_REQUEST")
  validateOptionalStringField(c.location, "location", MAX_SHORT_LENGTH)
  validateOptionalStringField(c.description, "description", MAX_TEXT_LENGTH)
  if (c.achievements !== undefined && c.achievements !== null && !isArrayOfStrings(c.achievements))
    throw new AuthorizationError("BAD_REQUEST")
  validateOptionalStringField(c.contextNotes, "contextNotes", MAX_TEXT_LENGTH)
  if (c.order !== undefined && c.order !== null && !isNumber(c.order))
    throw new AuthorizationError("BAD_REQUEST")
  return c
}

/**
 * Validates a single education child object.
 */
function validateEducation(item: unknown): Record<string, unknown> {
  if (!isPlainObject(item)) throw new AuthorizationError("BAD_REQUEST")
  const c = stripProtected(item)
  validateStringField(c.institution, "institution", MAX_SHORT_LENGTH, true)
  validateOptionalStringField(c.degree, "degree", MAX_SHORT_LENGTH)
  validateOptionalStringField(c.field, "field", MAX_SHORT_LENGTH)
  validateOptionalStringField(c.startDate, "startDate", MAX_SHORT_LENGTH)
  validateOptionalStringField(c.endDate, "endDate", MAX_SHORT_LENGTH)
  if (c.current !== undefined && c.current !== null && !isBoolean(c.current))
    throw new AuthorizationError("BAD_REQUEST")
  validateOptionalStringField(c.gpa, "gpa", MAX_SHORT_LENGTH)
  validateOptionalStringField(c.description, "description", MAX_TEXT_LENGTH)
  if (c.order !== undefined && c.order !== null && !isNumber(c.order))
    throw new AuthorizationError("BAD_REQUEST")
  return c
}

/**
 * Validates a single skill child object.
 */
function validateSkill(item: unknown): Record<string, unknown> {
  if (!isPlainObject(item)) throw new AuthorizationError("BAD_REQUEST")
  const c = stripProtected(item)
  validateStringField(c.name, "name", MAX_SHORT_LENGTH, true)
  validateOptionalStringField(c.category, "category", MAX_SHORT_LENGTH)
  validateOptionalStringField(c.proficiency, "proficiency", MAX_SHORT_LENGTH)
  validateOptionalStringField(c.context, "context", MAX_TEXT_LENGTH)
  if (c.order !== undefined && c.order !== null && !isNumber(c.order))
    throw new AuthorizationError("BAD_REQUEST")
  return c
}

/**
 * Validates a single certification child object.
 */
function validateCertification(item: unknown): Record<string, unknown> {
  if (!isPlainObject(item)) throw new AuthorizationError("BAD_REQUEST")
  const c = stripProtected(item)
  validateStringField(c.name, "name", MAX_SHORT_LENGTH, true)
  validateOptionalStringField(c.issuer, "issuer", MAX_SHORT_LENGTH)
  validateOptionalStringField(c.issueDate, "issueDate", MAX_SHORT_LENGTH)
  validateOptionalStringField(c.expiryDate, "expiryDate", MAX_SHORT_LENGTH)
  validateOptionalStringField(c.credentialId, "credentialId", MAX_SHORT_LENGTH)
  validateOptionalStringField(c.url, "url", MAX_TEXT_LENGTH)
  if (c.order !== undefined && c.order !== null && !isNumber(c.order))
    throw new AuthorizationError("BAD_REQUEST")
  return c
}

/**
 * Validates a single language proficiency child object.
 */
function validateLanguage(item: unknown): Record<string, unknown> {
  if (!isPlainObject(item)) throw new AuthorizationError("BAD_REQUEST")
  const c = stripProtected(item)
  validateStringField(c.language, "language", MAX_SHORT_LENGTH, true)
  validateOptionalStringField(c.level, "level", MAX_SHORT_LENGTH)
  if (c.order !== undefined && c.order !== null && !isNumber(c.order))
    throw new AuthorizationError("BAD_REQUEST")
  return c
}

/**
 * Validates the complete PUT payload before any database write.
 * Throws AuthorizationError(BAD_REQUEST) for any invalid input.
 * Returns validated, stripped collections ready for use.
 */
export function validateProfilePutPayload(body: unknown): {
  experiences: Record<string, unknown>[]
  skills: Record<string, unknown>[]
  educations: Record<string, unknown>[]
  certifications: Record<string, unknown>[]
  languages: Record<string, unknown>[]
} {
  if (!isPlainObject(body)) {
    throw new AuthorizationError("BAD_REQUEST")
  }

  const safe = body as Record<string, unknown>

  // Validate scalar profile fields
  for (const key of Object.keys(safe)) {
    if (PROTECTED_FIELDS.has(key)) {
      throw new AuthorizationError("BAD_REQUEST")
    }
  }
  if (safe.fullName !== undefined && safe.fullName !== null) {
    if (!isString(safe.fullName) || safe.fullName.length > MAX_SHORT_LENGTH)
      throw new AuthorizationError("BAD_REQUEST")
  }
  if (safe.email !== undefined && safe.email !== null) {
    if (!isString(safe.email) || safe.email.length > MAX_SHORT_LENGTH)
      throw new AuthorizationError("BAD_REQUEST")
  }
  if (safe.headline !== undefined && safe.headline !== null && (!isString(safe.headline) || safe.headline.length > MAX_TEXT_LENGTH))
    throw new AuthorizationError("BAD_REQUEST")
  if (safe.summary !== undefined && safe.summary !== null && (!isString(safe.summary) || safe.summary.length > MAX_TEXT_LENGTH))
    throw new AuthorizationError("BAD_REQUEST")
  if (safe.phone !== undefined && safe.phone !== null && (!isString(safe.phone) || safe.phone.length > MAX_SHORT_LENGTH))
    throw new AuthorizationError("BAD_REQUEST")
  if (safe.location !== undefined && safe.location !== null && (!isString(safe.location) || safe.location.length > MAX_SHORT_LENGTH))
    throw new AuthorizationError("BAD_REQUEST")
  if (safe.photoUrl !== undefined && safe.photoUrl !== null && (!isString(safe.photoUrl) || safe.photoUrl.length > MAX_TEXT_LENGTH))
    throw new AuthorizationError("BAD_REQUEST")

  // Validate each collection is an array
  const collections: Record<string, unknown[]> = {}
  for (const [name, item] of [
    ["experiences", safe.experiences],
    ["skills", safe.skills],
    ["educations", safe.educations],
    ["certifications", safe.certifications],
    ["languages", safe.languages],
  ] as const) {
    if (item === undefined || item === null) {
      collections[name] = []
      continue
    }
    if (!Array.isArray(item)) {
      throw new AuthorizationError("BAD_REQUEST")
    }
    collections[name] = item as unknown[]
  }

  // Size limits
  if (collections.experiences.length > MAX_EXPERIENCES) throw new AuthorizationError("BAD_REQUEST")
  if (collections.educations.length > MAX_EDUCATIONS) throw new AuthorizationError("BAD_REQUEST")
  if (collections.skills.length > MAX_SKILLS) throw new AuthorizationError("BAD_REQUEST")
  if (collections.certifications.length > MAX_CERTIFICATIONS) throw new AuthorizationError("BAD_REQUEST")
  if (collections.languages.length > MAX_LANGUAGES) throw new AuthorizationError("BAD_REQUEST")

  // Validate each child of each collection (all-or-nothing: first invalid
  // item rejects the entire request before any database write).
  const validatedExperiences = collections.experiences.map(validateExperience)
  const validatedEducations = collections.educations.map(validateEducation)
  const validatedSkills = collections.skills.map(validateSkill)
  const validatedCertifications = collections.certifications.map(validateCertification)
  const validatedLanguages = collections.languages.map(validateLanguage)

  return {
    experiences: validatedExperiences,
    educations: validatedEducations,
    skills: validatedSkills,
    certifications: validatedCertifications,
    languages: validatedLanguages,
  }
}
