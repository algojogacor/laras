import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import {
  requireActor,
  requireCurrentAdmin,
  handleAuthorizationError,
  AuthorizationError,
  safeNextResponse,
  isValidId,
} from "@/lib/authorization"
import { requireCapability } from "@/lib/permissions"
import {
  createCampaign,
  getAllCampaigns,
  updateCampaign,
  assignToCampaign,
  removeFromCampaign,
  getUserCampaigns,
} from "@/lib/campaigns"
import type { Plan } from "@/lib/entitlement"

const VALID_PLANS: Plan[] = ["free", "plus", "pro", "max"]

/**
 * GET /api/admin/campaigns
 * Returns all campaigns. Admin/owner only.
 */
export async function GET() {
  try {
    const actor = await requireActor()
    await requireCapability(actor, "campaigns.manage")

    const campaigns = await getAllCampaigns({ limit: 100 })

    return safeNextResponse({ campaigns })
  } catch (error) {
    return handleAuthorizationError(error)
  }
}

/**
 * POST /api/admin/campaigns
 * Body: { name, description?, plan, features?, maxSeats?, startsAt?, expiresAt? }
 * Creates a new campaign. Admin/owner only.
 */
export async function POST(request: Request) {
  try {
    const actor = await requireActor()
    await requireCapability(actor, "campaigns.manage")

    let body: {
      name?: string
      description?: string
      plan?: string
      features?: string[]
      maxSeats?: number
      startsAt?: string
      expiresAt?: string
    }
    try {
      body = await request.json()
    } catch {
      throw new AuthorizationError("BAD_REQUEST")
    }

    const name = body.name?.trim()
    if (!name || name.length < 1 || name.length > 200) {
      throw new AuthorizationError("BAD_REQUEST")
    }

    const plan = body.plan as Plan | undefined
    if (!plan || !VALID_PLANS.includes(plan)) {
      throw new AuthorizationError("BAD_REQUEST")
    }

    const maxSeats = body.maxSeats ?? 100
    if (maxSeats < 1 || maxSeats > 100000) {
      throw new AuthorizationError("BAD_REQUEST")
    }

    const campaign = await createCampaign({
      name,
      description: body.description?.trim() || undefined,
      plan,
      features: body.features,
      maxSeats,
      startsAt: body.startsAt ? new Date(body.startsAt) : undefined,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
      createdById: actor.accountId,
    })

    // Audit log
    await db.auditLog.create({
      data: {
        userProfileId: actor.profileId!,
        action: "admin.campaigns.create",
        resourceType: "Campaign",
        resourceId: campaign.id,
        metadata: JSON.stringify({ name, plan }),
      },
    })

    return safeNextResponse({ ok: true, campaign })
  } catch (error) {
    return handleAuthorizationError(error)
  }
}

/**
 * PATCH /api/admin/campaigns
 * Body: { campaignId, name?, description?, plan?, features?, maxSeats?, isActive?, expiresAt? }
 * Updates an existing campaign.
 */
export async function PATCH(request: Request) {
  try {
    const actor = await requireActor()
    await requireCapability(actor, "campaigns.manage")

    let body: {
      campaignId?: string
      name?: string
      description?: string
      plan?: string
      features?: string[]
      maxSeats?: number
      startsAt?: string
      expiresAt?: string | null
      isActive?: boolean
    }
    try {
      body = await request.json()
    } catch {
      throw new AuthorizationError("BAD_REQUEST")
    }

    const campaignId = body.campaignId?.trim()
    if (!isValidId(campaignId)) {
      throw new AuthorizationError("BAD_REQUEST")
    }

    if (body.plan && !VALID_PLANS.includes(body.plan as Plan)) {
      throw new AuthorizationError("BAD_REQUEST")
    }

    const campaign = await updateCampaign(campaignId, {
      name: body.name?.trim(),
      description: body.description?.trim(),
      plan: body.plan as Plan | undefined,
      features: body.features,
      maxSeats: body.maxSeats,
      startsAt: body.startsAt ? new Date(body.startsAt) : undefined,
      expiresAt: body.expiresAt === null ? null : body.expiresAt ? new Date(body.expiresAt) : undefined,
      isActive: body.isActive,
    })

    if (!campaign) {
      throw new AuthorizationError("NOT_FOUND")
    }

    return safeNextResponse({ ok: true, campaign })
  } catch (error) {
    return handleAuthorizationError(error)
  }
}
