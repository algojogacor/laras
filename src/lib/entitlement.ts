import { db } from "@/lib/db"
import type { UserProfile } from "@prisma/client"
import { consumeQuota, refundQuota } from "@/lib/quota-ledger"

// ---------------------------------------------------------------------------
// Entitlement & License Engine — Brief §9.4 (monetization/entitlement)
// ---------------------------------------------------------------------------
// Plans define a baseline set of features. A License can additionally grant
// specific feature keys (overrides). The most permissive ACTIVE license wins.
//
// Feature keys (used by gateFeature / FeatureGate):
//   - documents.unlimited     (free tier is capped at 5 docs)
//   - documents.visual_cv     (visual CV is pro+)
//   - interview.unlimited     (free tier is capped at 3 sets)
//   - english.advanced        (advanced listening bank is pro+)
//   - admin.panel             (admin/owner only — also role-gated)
//   - support.priority        (pro+ priority support)
// ---------------------------------------------------------------------------

export type Plan = "free" | "pro" | "org"
export type LicenseStatus = "active" | "expired" | "suspended" | "cancelled"
export type FeatureKey =
  | "documents.unlimited"
  | "documents.visual_cv"
  | "interview.unlimited"
  | "english.advanced"
  | "admin.panel"
  | "support.priority"

export const PLAN_FEATURES: Record<Plan, FeatureKey[]> = {
  free: [],
  pro: [
    "documents.unlimited",
    "documents.visual_cv",
    "interview.unlimited",
    "english.advanced",
    "support.priority",
  ],
  org: [
    "documents.unlimited",
    "documents.visual_cv",
    "interview.unlimited",
    "english.advanced",
    "support.priority",
  ],
}

export const PLAN_LABELS: Record<Plan, string> = {
  free: "Free",
  pro: "Pro",
  org: "Org",
}

export const PLAN_RANK: Record<Plan, number> = { free: 0, pro: 1, org: 2 }

export interface Entitlement {
  plan: Plan
  status: LicenseStatus | "none"
  features: Set<FeatureKey>
  /** The active license backing this entitlement, or null for implicit free. */
  licenseId: string | null
  expiresAt: Date | null
  /** Human-readable plan rank for "most permissive" comparison. */
  rank: number
}

const FREE_ENTITLEMENT: Entitlement = {
  plan: "free",
  status: "none",
  features: new Set<FeatureKey>([]),
  licenseId: null,
  expiresAt: null,
  rank: 0,
}

/**
 * Compute the effective entitlement for a user.
 *
 * Loads all licenses, filters to active + not-expired, and picks the most
 * permissive one (org > pro > free). Merges plan features + license-specific
 * feature overrides.
 *
 * If no active license exists, returns the implicit free entitlement.
 */
export async function getEntitlement(
  profile: Pick<UserProfile, "id">
): Promise<Entitlement> {
  const licenses = await db.license.findMany({
    where: { userProfileId: profile.id },
    orderBy: { createdAt: "desc" },
  })

  const now = new Date()
  const active = licenses.filter(
    (l) => l.status === "active" && (!l.expiresAt || l.expiresAt > now)
  )

  if (active.length === 0) return FREE_ENTITLEMENT

  // Pick the most permissive active license (highest plan rank)
  let best = active[0]
  for (const l of active) {
    if (PLAN_RANK[l.plan as Plan] > PLAN_RANK[best.plan as Plan]) best = l
  }

  const plan = best.plan as Plan
  const features = new Set<FeatureKey>(PLAN_FEATURES[plan])
  // Merge license-specific feature overrides
  if (best.features) {
    try {
      const extra = JSON.parse(best.features) as string[]
      for (const f of extra) features.add(f as FeatureKey)
    } catch {
      /* ignore malformed features */
    }
  }

  return {
    plan,
    status: best.status as LicenseStatus,
    features,
    licenseId: best.id,
    expiresAt: best.expiresAt,
    rank: PLAN_RANK[plan],
  }
}

/** Returns true if the entitlement includes the given feature. */
export function hasFeature(e: Entitlement, feature: FeatureKey): boolean {
  return e.features.has(feature)
}

/** Free-tier usage caps (used by feature gates that check counts). */
export const FREE_TIER_LIMITS = {
  maxDocuments: 5,
  maxInterviewSets: 3,
} as const

/**
 * Check whether the user can create another document. Free tier is capped;
 * pro/org with documents.unlimited bypass the cap.
 *
 * Phase 3C: Uses QuotaLedger for atomic consumption when an idempotencyKey
 * is provided. Falls back to stateless count for backward compatibility.
 */
export async function canCreateDocument(
  profile: Pick<UserProfile, "id">,
  idempotencyKey?: string
): Promise<{ allowed: boolean; reason?: string; used: number; limit: number | null }> {
  const e = await getEntitlement(profile)
  const limit = FREE_TIER_LIMITS.maxDocuments

  if (hasFeature(e, "documents.unlimited")) {
    // Still count for display purposes
    let used: number
    if (idempotencyKey) {
      const { getCurrentConsumption } = await import("@/lib/quota-ledger")
      used = await getCurrentConsumption(profile.id, "documents.create")
    } else {
      used = await db.document.count({ where: { userProfileId: profile.id } })
    }
    return { allowed: true, used, limit: null }
  }

  if (idempotencyKey) {
    // Phase 3C: Atomic consumption via QuotaLedger
    const result = await consumeQuota(profile.id, "documents.create", idempotencyKey, limit)
    if (!result.success) {
      const used = result.consumed ?? limit
      return { allowed: false, reason: "document-limit", used, limit }
    }
    return { allowed: true, used: result.consumed ?? 0, limit }
  }

  // Fallback: stateless count (legacy, non-atomic)
  const used = await db.document.count({ where: { userProfileId: profile.id } })
  if (used >= limit) {
    return { allowed: false, reason: "document-limit", used, limit }
  }
  return { allowed: true, used, limit }
}

/**
 * Check whether the user can access the visual CV builder (pro+ feature).
 */
export async function canAccessVisualCV(
  profile: Pick<UserProfile, "id">
): Promise<{ allowed: boolean; reason?: string }> {
  const e = await getEntitlement(profile)
  if (hasFeature(e, "documents.visual_cv")) return { allowed: true }
  return { allowed: false, reason: "visual-cv-locked" }
}

/**
 * Check whether the user can create another interview set. Free tier is
 * capped at 3; pro/org with interview.unlimited bypass the cap.
 */
export async function canCreateInterviewSet(
  profile: Pick<UserProfile, "id">
): Promise<{ allowed: boolean; reason?: string; used: number; limit: number | null }> {
  const e = await getEntitlement(profile)
  const used = await db.interviewSet.count({ where: { userProfileId: profile.id } })
  if (hasFeature(e, "interview.unlimited")) {
    return { allowed: true, used, limit: null }
  }
  const limit = FREE_TIER_LIMITS.maxInterviewSets
  if (used >= limit) {
    return { allowed: false, reason: "interview-limit", used, limit }
  }
  return { allowed: true, used, limit }
}

/**
 * Check whether the user can access advanced (hard) English practice.
 * Pro+ feature (english.advanced).
 */
export async function canAccessAdvancedEnglish(
  profile: Pick<UserProfile, "id">
): Promise<{ allowed: boolean; reason?: string }> {
  const e = await getEntitlement(profile)
  if (hasFeature(e, "english.advanced")) return { allowed: true }
  return { allowed: false, reason: "english-advanced-locked" }
}
