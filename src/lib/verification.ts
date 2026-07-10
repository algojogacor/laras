import type { ProfileWithRelations } from "@/lib/profile"
import { db } from "@/lib/db"

// ---------------------------------------------------------------------------
// Trust & Verification Engine — Brief §9.1 (Trust and Verification Graph)
// ---------------------------------------------------------------------------
// Determines the verification state of key profile claims. In pre-production,
// email/phone/education/employment/skill badges auto-derive from profile data:
//   - email: verified if profile.email is non-empty
//   - phone: verified if profile.phone is non-empty
//   - education: verified if ≥1 education entry exists
//   - employment: verified if ≥1 experience entry exists
//   - skill: verified if ≥3 skills (with at least 1 having context)
//   - identity: pending by default (admin-issuable in future)
//
// Persisted VerificationBadge rows (status: verified/rejected/expired) override
// the derived state, so admin/manual verifications are respected.
// ---------------------------------------------------------------------------

export type VerificationType =
  | "email"
  | "phone"
  | "identity"
  | "education"
  | "employment"
  | "skill"

export type VerificationStatus = "pending" | "verified" | "rejected" | "expired"

export interface VerificationClaim {
  type: VerificationType
  status: VerificationStatus
  label: string // short label (set by caller via i18n)
  /** Whether this claim is auto-derivable from profile data (vs admin-only). */
  autoDerivable: boolean
}

export interface VerificationSummary {
  claims: VerificationClaim[]
  verifiedCount: number
  totalCount: number
  /** 0–100 trust score based on verified claims (weighted). */
  trustScore: number
}

const WEIGHTS: Record<VerificationType, number> = {
  identity: 0.30, // heaviest — admin-issued
  email: 0.20,
  phone: 0.15,
  employment: 0.15,
  education: 0.10,
  skill: 0.10,
}

/**
 * Compute the verification summary for a profile.
 * Merges persisted badges (DB) with derived state from profile data.
 */
export async function computeVerificationSummary(
  profile: ProfileWithRelations
): Promise<VerificationSummary> {
  const badges = await db.verificationBadge.findMany({
    where: { userProfileId: profile.id },
  })
  const badgeByType = new Map(badges.map((b) => [b.type, b]))

  const claims: VerificationClaim[] = [
    {
      type: "email",
      status: deriveStatus(badgeByType.get("email")?.status, !!profile.email?.trim()),
      label: "email",
      autoDerivable: true,
    },
    {
      type: "phone",
      status: deriveStatus(badgeByType.get("phone")?.status, !!profile.phone?.trim()),
      label: "phone",
      autoDerivable: true,
    },
    {
      type: "education",
      status: deriveStatus(
        badgeByType.get("education")?.status,
        (profile.educations ?? []).length > 0
      ),
      label: "education",
      autoDerivable: true,
    },
    {
      type: "employment",
      status: deriveStatus(
        badgeByType.get("employment")?.status,
        (profile.experiences ?? []).length > 0
      ),
      label: "employment",
      autoDerivable: true,
    },
    {
      type: "skill",
      status: deriveStatus(
        badgeByType.get("skill")?.status,
        (profile.skills ?? []).length >= 3 &&
          (profile.skills ?? []).some((s) => (s.context ?? "").trim().length > 0)
      ),
      label: "skill",
      autoDerivable: true,
    },
    {
      type: "identity",
      status: (badgeByType.get("identity")?.status as VerificationStatus) ?? "pending",
      label: "identity",
      autoDerivable: false,
    },
  ]

  const verifiedCount = claims.filter((c) => c.status === "verified").length
  const trustScore = Math.round(
    claims
      .filter((c) => c.status === "verified")
      .reduce((sum, c) => sum + WEIGHTS[c.type], 0) * 100
  )

  return { claims, verifiedCount, totalCount: claims.length, trustScore }
}

/**
 * Merge a persisted badge status with the derived state.
 * - If a persisted badge is "verified" or "rejected", respect it (admin override).
 * - Otherwise derive from the profile data: present → "verified", absent → "pending".
 */
function deriveStatus(
  persisted: string | undefined,
  dataPresent: boolean
): VerificationStatus {
  if (persisted === "verified") return "verified"
  if (persisted === "rejected") return "rejected"
  if (persisted === "expired") return "expired"
  return dataPresent ? "verified" : "pending"
}
