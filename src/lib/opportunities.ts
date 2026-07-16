import "server-only"
import { db } from "@/lib/db"
import {
  requireActor,
  getRequiredProfileId,
  handleAuthorizationError,
  safeNextResponse,
  isValidId,
  AuthorizationError,
} from "@/lib/authorization"
import type { NextRequest } from "next/server"

export const OPPORTUNITY_TYPES = [
  "job", "internship", "scholarship", "fellowship", "competition",
  "volunteer", "event", "odp", "bumn", "cpns", "other",
] as const
export type OpportunityType = (typeof OPPORTUNITY_TYPES)[number]

export const OPPORTUNITY_STATUSES = [
  "saved", "applied", "interviewing", "offered", "accepted",
  "rejected", "archived", "expired",
] as const

/** GET /api/opportunities — list user's opportunities */
export async function GET(request: NextRequest) {
  try {
    const actor = await requireActor()
    const profileId = getRequiredProfileId(actor)

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const type = searchParams.get("type")

    const where: Record<string, unknown> = { userProfileId: profileId }
    if (status) where.status = status
    if (type) where.type = type

    const items = await db.opportunity.findMany({
      where,
      orderBy: [{ deadline: "asc" }, { createdAt: "desc" }],
      take: 100,
      select: {
        id: true,
        type: true,
        title: true,
        organization: true,
        description: true,
        requirements: true,
        deadline: true,
        location: true,
        url: true,
        source: true,
        status: true,
        matchScore: true,
        matchDetail: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return safeNextResponse({ opportunities: items })
  } catch (error) {
    return handleAuthorizationError(error)
  }
}

/** POST /api/opportunities — create a new saved opportunity */
export async function POST(request: NextRequest) {
  try {
    const actor = await requireActor()
    const profileId = getRequiredProfileId(actor)

    const body = await request.json().catch(() => {
      throw new AuthorizationError("BAD_REQUEST")
    })

    if (!body || typeof body !== "object") {
      throw new AuthorizationError("BAD_REQUEST")
    }

    const {
      type, title, organization, description, requirements,
      deadline, location, url, notes,
    } = body as Record<string, unknown>

    if (typeof type !== "string" || !OPPORTUNITY_TYPES.includes(type as OpportunityType)) {
      throw new AuthorizationError("BAD_REQUEST")
    }
    if (typeof title !== "string" || title.trim().length === 0 || title.length > 200) {
      throw new AuthorizationError("BAD_REQUEST")
    }

    const opp = await db.opportunity.create({
      data: {
        userProfileId: profileId,
        type: type as string,
        title: title.trim(),
        organization: typeof organization === "string" ? organization : null,
        description: typeof description === "string" ? description : null,
        requirements: typeof requirements === "string" ? requirements : null,
        deadline: typeof deadline === "string" ? deadline : null,
        location: typeof location === "string" ? location : null,
        url: typeof url === "string" ? url : null,
        notes: typeof notes === "string" ? notes : null,
      },
      select: {
        id: true,
        type: true,
        title: true,
        organization: true,
        description: true,
        requirements: true,
        deadline: true,
        location: true,
        url: true,
        source: true,
        status: true,
        matchScore: true,
        matchDetail: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return safeNextResponse({ opportunity: opp }, { status: 201 })
  } catch (error) {
    return handleAuthorizationError(error)
  }
}

/** PATCH /api/opportunities — update opportunity (status, notes, etc.) */
export async function PATCH(request: NextRequest) {
  try {
    const actor = await requireActor()
    const profileId = getRequiredProfileId(actor)

    const body = await request.json().catch(() => {
      throw new AuthorizationError("BAD_REQUEST")
    })
    if (!body || typeof body !== "object") {
      throw new AuthorizationError("BAD_REQUEST")
    }

    const { id, ...updates } = body as Record<string, unknown>
    if (!isValidId(id as string | null | undefined)) {
      throw new AuthorizationError("BAD_REQUEST")
    }

    const existing = await db.opportunity.findFirst({
      where: { id: id as string, userProfileId: profileId },
      select: { id: true },
    })
    if (!existing) throw new AuthorizationError("NOT_FOUND")

    const data: Record<string, unknown> = {}
    if (updates.status !== undefined) {
      if (typeof updates.status !== "string" || !OPPORTUNITY_STATUSES.includes(updates.status as any)) {
        throw new AuthorizationError("BAD_REQUEST")
      }
      data.status = updates.status
    }
    if (updates.notes !== undefined) {
      data.notes = typeof updates.notes === "string" ? updates.notes : null
    }
    if (updates.title !== undefined && typeof updates.title === "string") {
      data.title = updates.title.trim()
    }

    const updated = await db.opportunity.update({
      where: { id: id as string },
      data,
      select: {
        id: true, type: true, title: true, organization: true,
        description: true, requirements: true, deadline: true,
        location: true, url: true, source: true, status: true,
        matchScore: true, matchDetail: true, notes: true,
        createdAt: true, updatedAt: true,
      },
    })

    return safeNextResponse({ opportunity: updated })
  } catch (error) {
    return handleAuthorizationError(error)
  }
}

/** DELETE /api/opportunities — delete opportunity by ID */
export async function DELETE(request: NextRequest) {
  try {
    const actor = await requireActor()
    const profileId = getRequiredProfileId(actor)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    if (!isValidId(id)) throw new AuthorizationError("BAD_REQUEST")

    const existing = await db.opportunity.findFirst({
      where: { id, userProfileId: profileId },
      select: { id: true },
    })
    if (!existing) throw new AuthorizationError("NOT_FOUND")

    await db.opportunity.delete({ where: { id } })
    return safeNextResponse({ deleted: true })
  } catch (error) {
    return handleAuthorizationError(error)
  }
}
