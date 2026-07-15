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
//   - documents.unlimited     (free tier is capped at 5 docs; plus+)
//   - documents.visual_cv     (visual CV is pro+)
//   - interview.unlimited     (free tier is capped at 3 sets; plus+)
//   - english.advanced        (advanced listening bank is pro+)
//   - admin.panel             (admin/owner only — also role-gated)
//   - support.priority        (pro+ priority support)
//   - support.premium         (max only — dedicated support channel)
// ---------------------------------------------------------------------------

export type Plan = "free" | "plus" | "pro" | "max"
export type LicenseStatus = "active" | "expired" | "suspended" | "cancelled"
export type FeatureKey =
  | "documents.unlimited"
  | "documents.visual_cv"
  | "interview.unlimited"
  | "english.advanced"
  | "admin.panel"
  | "support.priority"
  | "support.premium"

export const PLAN_FEATURES: Record<Plan, FeatureKey[]> = {
  free: [],
  plus: [
    "documents.unlimited",
    "interview.unlimited",
  ],
  pro: [
    "documents.unlimited",
    "documents.visual_cv",
    "interview.unlimited",
    "english.advanced",
    "support.priority",
  ],
  max: [
    "documents.unlimited",
    "documents.visual_cv",
    "interview.unlimited",
    "english.advanced",
    "support.priority",
    "support.premium",
  ],
}

export const PLAN_LABELS: Record<Plan, string> = {
  free: "Free",
  plus: "Plus",
  pro: "Pro",
  max: "Max",
}

export const PLAN_RANK: Record<Plan, number> = { free: 0, plus: 1, pro: 2, max: 3 }

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

  // Determine best license
  let bestLicense: (typeof active)[number] | null = null
  if (active.length > 0) {
    bestLicense = active[0]
    for (const l of active) {
      if (PLAN_RANK[l.plan as Plan] > PLAN_RANK[bestLicense.plan as Plan]) bestLicense = l
    }
  }

  // Check campaign membership for plan grants
  let campaignPlan: Plan | null = null
  const campaignMemberships = await db.campaignMember.findMany({
    where: {
      userProfileId: profile.id,
      campaign: {
        isActive: true,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: now } },
        ],
      },
    },
    select: {
      campaign: { select: { plan: true } },
    },
  })

  for (const m of campaignMemberships) {
    const p = m.campaign.plan as Plan
    if (!campaignPlan || PLAN_RANK[p] > PLAN_RANK[campaignPlan]) {
      campaignPlan = p
    }
  }

  // If no license and no campaign, return free entitlement
  if (!bestLicense && !campaignPlan) return FREE_ENTITLEMENT

  // Determine effective plan: highest of license and campaign
  let effectivePlan: Plan = "free"
  let effectiveLicenseId: string | undefined
  let effectiveExpiresAt: Date | null = null

  if (bestLicense && campaignPlan) {
    if (PLAN_RANK[campaignPlan] > PLAN_RANK[bestLicense.plan as Plan]) {
      effectivePlan = campaignPlan
    } else {
      effectivePlan = bestLicense.plan as Plan
      effectiveLicenseId = bestLicense.id
      effectiveExpiresAt = bestLicense.expiresAt
    }
  } else if (campaignPlan) {
    effectivePlan = campaignPlan
  } else if (bestLicense) {
    effectivePlan = bestLicense.plan as Plan
    effectiveLicenseId = bestLicense.id
    effectiveExpiresAt = bestLicense.expiresAt
  }

  const features = new Set<FeatureKey>(PLAN_FEATURES[effectivePlan])
  // Merge license-specific feature overrides
  if (bestLicense?.features) {
    try {
      const extra = JSON.parse(bestLicense.features) as string[]
      for (const f of extra) features.add(f as FeatureKey)
    } catch {
      /* ignore malformed features */
    }
  }

  return {
    plan: effectivePlan,
    status: bestLicense?.status as LicenseStatus ?? "active",
    features,
    licenseId: effectiveLicenseId ?? null,
    expiresAt: effectiveExpiresAt,
    rank: PLAN_RANK[effectivePlan],
  }
}

/** Returns true if the entitlement includes the given feature. */
export function hasFeature(e: Entitlement, feature: FeatureKey): boolean {
  return e.features.has(feature)
}

/** Per-tier usage caps (used by feature gates that check counts). */
export const FREE_TIER_LIMITS = {
  maxDocuments: 5,
  maxInterviewSets: 3,
} as const

export const PLUS_TIER_LIMITS = {
  maxDocuments: Number.POSITIVE_INFINITY,
  maxInterviewSets: Number.POSITIVE_INFINITY,
} as const

export const PRO_TIER_LIMITS = {
  maxDocuments: Number.POSITIVE_INFINITY,
  maxInterviewSets: Number.POSITIVE_INFINITY,
} as const

export const MAX_TIER_LIMITS = {
  maxDocuments: Number.POSITIVE_INFINITY,
  maxInterviewSets: Number.POSITIVE_INFINITY,
} as const

/** Returns the effective tier limits for the given plan. */
export function getTierLimits(plan: Plan) {
  switch (plan) {
    case "free":
      return FREE_TIER_LIMITS
    case "plus":
      return PLUS_TIER_LIMITS
    case "pro":
      return PRO_TIER_LIMITS
    case "max":
      return MAX_TIER_LIMITS
  }
}

/**
 * Resolves the effective plan for a user by combining:
 *   1. The most permissive active license plan
 *   2. Any campaign-level plan override (campaign plan > license plan)
 *
 * Returns the effective Plan and the source of the determination.
 */
export async function resolveEffectivePlan(
  profile: Pick<UserProfile, "id">
): Promise<{ plan: Plan; source: "license" | "campaign" | "default"; campaignId?: string; licenseId?: string }> {
  const now = new Date()

  // 1. Check active licenses
  const licenses = await db.license.findMany({
    where: { userProfileId: profile.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, plan: true, status: true, expiresAt: true },
  })

  const activeLicenses = licenses.filter(
    (l) => l.status === "active" && (!l.expiresAt || l.expiresAt > now)
  )

  let bestLicensePlan: Plan | null = null
  let bestLicenseId: string | undefined
  if (activeLicenses.length > 0) {
    let best = activeLicenses[0]
    for (const l of activeLicenses) {
      if (PLAN_RANK[l.plan as Plan] > PLAN_RANK[best.plan as Plan]) best = l
    }
    bestLicensePlan = best.plan as Plan
    bestLicenseId = best.id
  }

  // 2. Check campaign membership (campaign plan overrides license plan)
  const now2 = new Date()
  const campaignMemberships = await db.campaignMember.findMany({
    where: {
      userProfileId: profile.id,
      campaign: {
        isActive: true,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: now2 } },
        ],
      },
    },
    select: {
      campaignId: true,
      campaign: { select: { plan: true } },
    },
    orderBy: { enrolledAt: "desc" },
  })

  let bestCampaignPlan: Plan | null = null
  let bestCampaignId: string | undefined
  if (campaignMemberships.length > 0) {
    // Pick the most permissive campaign
    for (const m of campaignMemberships) {
      const p = m.campaign.plan as Plan
      if (!bestCampaignPlan || PLAN_RANK[p] > PLAN_RANK[bestCampaignPlan]) {
        bestCampaignPlan = p
        bestCampaignId = m.campaignId
      }
    }
  }

  // Determine effective plan
  if (bestCampaignPlan && bestLicensePlan) {
    // Campaign plan overrides license plan (marketing campaigns are additive)
    if (PLAN_RANK[bestCampaignPlan] > PLAN_RANK[bestLicensePlan]) {
      return { plan: bestCampaignPlan, source: "campaign", campaignId: bestCampaignId }
    }
    return { plan: bestLicensePlan, source: "license", licenseId: bestLicenseId }
  }

  if (bestCampaignPlan) {
    return { plan: bestCampaignPlan, source: "campaign", campaignId: bestCampaignId }
  }

  if (bestLicensePlan) {
    return { plan: bestLicensePlan, source: "license", licenseId: bestLicenseId }
  }

  return { plan: "free", source: "default" }
}

/**
 * Returns a human-readable breakdown of what the user has and why.
 *
 * Includes:
 *   - Effective plan and its source
 *   - Features granted by the plan
 *   - License status (if any)
 *   - Campaign entitlement (if any)
 *   - Remaining limits for the current tier
 */
export async function explainEntitlement(
  profile: Pick<UserProfile, "id">
): Promise<{
  effectivePlan: Plan
  source: "license" | "campaign" | "default"
  license: { id: string; plan: Plan; status: string; expiresAt: Date | null } | null
  campaign: { id: string; name: string; plan: Plan } | null
  features: FeatureKey[]
  limits: { maxDocuments: number; maxInterviewSets: number }
  /** Human-readable summary (English) */
  summary: string
}> {
  const [entitlement, effective] = await Promise.all([
    getEntitlement(profile),
    resolveEffectivePlan(profile),
  ])

  const features = Array.from(entitlement.features)
  const limits = getTierLimits(effective.plan)

  let license: { id: string; plan: Plan; status: string; expiresAt: Date | null } | null = null
  if (entitlement.licenseId && entitlement.status !== "none") {
    license = {
      id: entitlement.licenseId,
      plan: entitlement.plan,
      status: entitlement.status,
      expiresAt: entitlement.expiresAt,
    }
  }

  let campaign: { id: string; name: string; plan: Plan } | null = null
  if (effective.campaignId) {
    const c = await db.campaign.findUnique({
      where: { id: effective.campaignId },
      select: { id: true, name: true, plan: true },
    })
    if (c) {
      campaign = { id: c.id, name: c.name, plan: c.plan as Plan }
    }
  }

  const planLabel = PLAN_LABELS[effective.plan]
  const sourceDesc =
    effective.source === "campaign"
      ? `campaign "${campaign?.name ?? "unknown"}"`
      : effective.source === "license"
        ? "active license"
        : "default free tier"

  const summary = `You are on the ${planLabel} plan (via ${sourceDesc}). ` +
    `You have access to ${features.length} premium feature(s): ${features.join(", ") || "none"}. ` +
    `Document limit: ${limits.maxDocuments === Number.POSITIVE_INFINITY ? "unlimited" : limits.maxDocuments}, ` +
    `Interview limit: ${limits.maxInterviewSets === Number.POSITIVE_INFINITY ? "unlimited" : limits.maxInterviewSets}.`

  return {
    effectivePlan: effective.plan,
    source: effective.source,
    license,
    campaign,
    features,
    limits: { maxDocuments: limits.maxDocuments, maxInterviewSets: limits.maxInterviewSets },
    summary,
  }
}

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

  // Fallback: stateless count + ledger consumption (legacy, non-atomic)
  // Sum both sources to prevent bypass via mixed consumption paths
  const docsCount = await db.document.count({ where: { userProfileId: profile.id } })
  const { getCurrentConsumption } = await import("@/lib/quota-ledger")
  const ledgerCount = await getCurrentConsumption(profile.id, "documents.create")
  const used = docsCount + ledgerCount
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
