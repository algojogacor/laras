import "server-only"
import { db } from "@/lib/db"
import type { Plan } from "@/lib/entitlement"

// ============================================================================
// Campaign Service — Phase 5B
// ============================================================================

export interface CampaignInput {
  name: string
  description?: string
  plan: Plan
  features?: string[]
  maxSeats?: number
  startsAt?: Date
  expiresAt?: Date
  createdById: string
}

export interface CampaignResult {
  id: string
  name: string
  description: string | null
  plan: string
  features: string | null
  maxSeats: number
  usedSeats: number
  startsAt: Date
  expiresAt: Date | null
  isActive: boolean
  createdById: string
  createdAt: Date
}

/**
 * Create a new marketing/entitlement campaign.
 * Admin-scoped — caller must enforce authorization.
 */
export async function createCampaign(input: CampaignInput): Promise<CampaignResult> {
  const featuresJson = input.features?.length ? JSON.stringify(input.features) : null

  const campaign = await db.campaign.create({
    data: {
      name: input.name,
      description: input.description ?? null,
      plan: input.plan,
      features: featuresJson,
      maxSeats: input.maxSeats ?? 100,
      startsAt: input.startsAt ?? new Date(),
      expiresAt: input.expiresAt ?? null,
      createdById: input.createdById,
      isActive: true,
    },
  })

  return {
    id: campaign.id,
    name: campaign.name,
    description: campaign.description,
    plan: campaign.plan,
    features: campaign.features,
    maxSeats: campaign.maxSeats,
    usedSeats: campaign.usedSeats,
    startsAt: campaign.startsAt,
    expiresAt: campaign.expiresAt,
    isActive: campaign.isActive,
    createdById: campaign.createdById,
    createdAt: campaign.createdAt,
  }
}

/**
 * List active campaigns with optional pagination.
 */
export async function getActiveCampaigns(opts?: {
  limit?: number
  offset?: number
}): Promise<CampaignResult[]> {
  const now = new Date()
  const campaigns = await db.campaign.findMany({
    where: {
      isActive: true,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    orderBy: { createdAt: "desc" },
    take: Math.min(opts?.limit ?? 50, 100),
    skip: opts?.offset ?? 0,
  })

  return campaigns.map((c) => ({
    id: c.id,
    name: c.name,
    description: c.description,
    plan: c.plan,
    features: c.features,
    maxSeats: c.maxSeats,
    usedSeats: c.usedSeats,
    startsAt: c.startsAt,
    expiresAt: c.expiresAt,
    isActive: c.isActive,
    createdById: c.createdById,
    createdAt: c.createdAt,
  }))
}

/**
 * List all campaigns (including inactive/expired) for admin view.
 */
export async function getAllCampaigns(opts?: {
  limit?: number
  offset?: number
}): Promise<CampaignResult[]> {
  const campaigns = await db.campaign.findMany({
    orderBy: { createdAt: "desc" },
    take: Math.min(opts?.limit ?? 50, 100),
    skip: opts?.offset ?? 0,
  })

  return campaigns.map((c) => ({
    id: c.id,
    name: c.name,
    description: c.description,
    plan: c.plan,
    features: c.features,
    maxSeats: c.maxSeats,
    usedSeats: c.usedSeats,
    startsAt: c.startsAt,
    expiresAt: c.expiresAt,
    isActive: c.isActive,
    createdById: c.createdById,
    createdAt: c.createdAt,
  }))
}

/**
 * Assign a user profile to a campaign.
 * Atomically increments usedSeats on the campaign.
 * Returns false if the campaign is full, inactive, or expired.
 */
export async function assignToCampaign(
  userProfileId: string,
  campaignId: string
): Promise<{ ok: boolean; reason?: string }> {
  try {
    return await db.$transaction(async (tx) => {
      // 1. Validate campaign
      const campaign = await tx.campaign.findUnique({ where: { id: campaignId } })
      if (!campaign) {
        return { ok: false, reason: "not-found" }
      }
      if (!campaign.isActive) {
        return { ok: false, reason: "inactive" }
      }
      if (campaign.expiresAt && campaign.expiresAt < new Date()) {
        return { ok: false, reason: "expired" }
      }
      if (campaign.usedSeats >= campaign.maxSeats) {
        return { ok: false, reason: "full" }
      }

      // 2. Check user exists
      const profile = await tx.userProfile.findUnique({
        where: { id: userProfileId },
        select: { id: true },
      })
      if (!profile) {
        return { ok: false, reason: "user-not-found" }
      }

      // 3. Check for existing membership
      const existing = await tx.campaignMember.findUnique({
        where: {
          campaignId_userProfileId: {
            campaignId,
            userProfileId,
          },
        },
      })
      if (existing) {
        return { ok: false, reason: "already-member" }
      }

      // 4. Create membership + increment seat count
      await tx.campaignMember.create({
        data: {
          campaignId,
          userProfileId,
          expiresAt: campaign.expiresAt,
        },
      })

      await tx.campaign.update({
        where: { id: campaignId },
        data: { usedSeats: { increment: 1 } },
      })

      return { ok: true }
    })
  } catch {
    return { ok: false, reason: "error" }
  }
}

/**
 * Get campaigns a user is enrolled in.
 */
export async function getUserCampaigns(userProfileId: string): Promise<
  Array<{
    campaignId: string
    name: string
    description: string | null
    plan: string
    features: string | null
    enrolledAt: Date
    expiresAt: Date | null
    isActive: boolean
  }>
> {
  const now = new Date()
  const memberships = await db.campaignMember.findMany({
    where: {
      userProfileId,
    },
    include: {
      campaign: {
        select: {
          id: true,
          name: true,
          description: true,
          plan: true,
          features: true,
          isActive: true,
          expiresAt: true,
        },
      },
    },
    orderBy: { enrolledAt: "desc" },
  })

  return memberships.map((m) => ({
    campaignId: m.campaignId,
    name: m.campaign.name,
    description: m.campaign.description,
    plan: m.campaign.plan,
    features: m.campaign.features,
    enrolledAt: m.enrolledAt,
    expiresAt: m.expiresAt || m.campaign.expiresAt,
    isActive: m.campaign.isActive && (!m.campaign.expiresAt || m.campaign.expiresAt > now),
  }))
}

/**
 * Update a campaign's properties.
 */
export async function updateCampaign(
  campaignId: string,
  updates: {
    name?: string
    description?: string
    plan?: Plan
    features?: string[]
    maxSeats?: number
    startsAt?: Date
    expiresAt?: Date | null
    isActive?: boolean
  }
): Promise<CampaignResult | null> {
  const data: Record<string, unknown> = {}
  if (updates.name !== undefined) data.name = updates.name
  if (updates.description !== undefined) data.description = updates.description
  if (updates.plan !== undefined) data.plan = updates.plan
  if (updates.features !== undefined) {
    data.features = updates.features.length ? JSON.stringify(updates.features) : null
  }
  if (updates.maxSeats !== undefined) data.maxSeats = updates.maxSeats
  if (updates.startsAt !== undefined) data.startsAt = updates.startsAt
  if (updates.expiresAt !== undefined) data.expiresAt = updates.expiresAt
  if (updates.isActive !== undefined) data.isActive = updates.isActive

  const campaign = await db.campaign.update({
    where: { id: campaignId },
    data,
  })

  return {
    id: campaign.id,
    name: campaign.name,
    description: campaign.description,
    plan: campaign.plan,
    features: campaign.features,
    maxSeats: campaign.maxSeats,
    usedSeats: campaign.usedSeats,
    startsAt: campaign.startsAt,
    expiresAt: campaign.expiresAt,
    isActive: campaign.isActive,
    createdById: campaign.createdById,
    createdAt: campaign.createdAt,
  }
}

/**
 * Remove a user from a campaign.
 */
export async function removeFromCampaign(
  userProfileId: string,
  campaignId: string
): Promise<boolean> {
  try {
    return await db.$transaction(async (tx) => {
      const membership = await tx.campaignMember.findUnique({
        where: {
          campaignId_userProfileId: {
            campaignId,
            userProfileId,
          },
        },
      })
      if (!membership) return false

      await tx.campaignMember.delete({ where: { id: membership.id } })
      await tx.campaign.update({
        where: { id: campaignId },
        data: { usedSeats: { decrement: 1 } },
      })
      return true
    })
  } catch {
    return false
  }
}
