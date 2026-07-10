import { db } from "@/lib/db"

// ---------------------------------------------------------------------------
// Consent & Privacy Engine — Brief §9.1 (Consent and Privacy Graph)
// ---------------------------------------------------------------------------
// Manages per-field visibility consent for a user's profile. Each trackable
// field has a visibility level:
//   public       — visible to anyone (future public profile)
//   connections  — visible only to accepted connections (future network)
//   private      — visible only to the user themselves
//
// Defaults are conservative: contact info (email, phone, location, links)
// defaults to private; professional history (experiences, education, skills,
// certifications, languages) defaults to public; fullName defaults to public.
// ---------------------------------------------------------------------------

export type Visibility = "public" | "connections" | "private"

export type ConsentField =
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

export interface ConsentEntry {
  field: ConsentField
  visibility: Visibility
}

export interface ConsentMap {
  [field: string]: Visibility
}

/** All trackable profile fields. */
export const CONSENT_FIELDS: ConsentField[] = [
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
]

/** Conservative default visibility per field. */
export const DEFAULT_VISIBILITY: Record<ConsentField, Visibility> = {
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

/**
 * Get the consent map for a user, merging persisted settings with defaults.
 */
export async function getConsentMap(userProfileId: string): Promise<ConsentMap> {
  const settings = await db.consentSetting.findMany({
    where: { userProfileId },
    select: { field: true, visibility: true },
  })
  const map: ConsentMap = {}
  for (const f of CONSENT_FIELDS) {
    const persisted = settings.find((s) => s.field === f)
    map[f] = (persisted?.visibility as Visibility) ?? DEFAULT_VISIBILITY[f]
  }
  return map
}

/**
 * Get the consent entries as an array (for client rendering).
 */
export async function getConsentEntries(userProfileId: string): Promise<ConsentEntry[]> {
  const map = await getConsentMap(userProfileId)
  return CONSENT_FIELDS.map((field) => ({ field, visibility: map[field] }))
}

/**
 * Set the visibility for a single field. Upserts the ConsentSetting row.
 */
export async function setConsent(
  userProfileId: string,
  field: ConsentField,
  visibility: Visibility
): Promise<void> {
  await db.consentSetting.upsert({
    where: { userProfileId_field: { userProfileId, field } },
    update: { visibility },
    create: { userProfileId, field, visibility },
  })
}

/**
 * Check whether a field is visible to a viewer given the owner's consent map
 * and the viewer's relationship to the owner.
 *
 * - owner viewing their own profile → always visible
 * - public → visible to anyone
 * - connections → visible only if isConnection
 * - private → never visible to others
 */
export function isFieldVisible(
  visibility: Visibility,
  isOwner: boolean,
  isConnection: boolean
): boolean {
  if (isOwner) return true
  if (visibility === "public") return true
  if (visibility === "connections") return isConnection
  return false // private
}

/**
 * Filter a serialized profile to only include fields the viewer is allowed to
 * see, based on the consent map. Nulls out or omits private fields.
 */
export function filterProfileByConsent<T extends Record<string, unknown>>(
  profile: T,
  consent: ConsentMap,
  isOwner: boolean,
  isConnection: boolean
): Partial<T> {
  const filtered: Record<string, unknown> = {}
  for (const key of Object.keys(profile)) {
    if (key in consent) {
      const vis = consent[key]
      if (isFieldVisible(vis, isOwner, isConnection)) {
        filtered[key] = profile[key]
      }
      // else: omit the field entirely
    } else {
      // Non-consent-tracked fields (id, createdAt, etc.) pass through
      filtered[key] = profile[key]
    }
  }
  return filtered as Partial<T>
}
