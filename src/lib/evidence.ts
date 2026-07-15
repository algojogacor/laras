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

// ============================================================================
// Evidence Graph — Phase 2A
// ============================================================================

export type EvidenceType =
  | "project"
  | "metric"
  | "artifact"
  | "certification"
  | "publication"
  | "other"

export type VerificationStatus =
  | "self-reported"
  | "pending"
  | "verified"
  | "disputed"

export const EVIDENCE_TYPES: EvidenceType[] = [
  "project",
  "metric",
  "artifact",
  "certification",
  "publication",
  "other",
]

export interface CreateEvidenceInput {
  type: EvidenceType
  title: string
  description?: string
  sourceUrl?: string
  metricValue?: string
  metricContext?: string
  experienceId?: string
  skillId?: string
  achievementId?: string
}

export interface UpdateEvidenceInput {
  type?: EvidenceType
  title?: string
  description?: string
  sourceUrl?: string
  metricValue?: string
  metricContext?: string
  experienceId?: string | null
  skillId?: string | null
  achievementId?: string | null
}

function validateEvidenceInput(body: unknown): CreateEvidenceInput {
  if (!body || typeof body !== "object") {
    throw new AuthorizationError("BAD_REQUEST")
  }

  const { type, title, description, sourceUrl, metricValue, metricContext, experienceId, skillId, achievementId } =
    body as Record<string, unknown>

  if (typeof type !== "string" || !EVIDENCE_TYPES.includes(type as EvidenceType)) {
    throw new AuthorizationError("BAD_REQUEST")
  }
  if (typeof title !== "string" || title.trim().length === 0 || title.length > 200) {
    throw new AuthorizationError("BAD_REQUEST")
  }
  if (description !== undefined && description !== null && typeof description !== "string") {
    throw new AuthorizationError("BAD_REQUEST")
  }
  if (sourceUrl !== undefined && sourceUrl !== null && typeof sourceUrl !== "string") {
    throw new AuthorizationError("BAD_REQUEST")
  }
  if (metricValue !== undefined && metricValue !== null && typeof metricValue !== "string") {
    throw new AuthorizationError("BAD_REQUEST")
  }
  if (metricContext !== undefined && metricContext !== null && typeof metricContext !== "string") {
    throw new AuthorizationError("BAD_REQUEST")
  }

  return {
    type: type as EvidenceType,
    title: title.trim(),
    description: description || undefined,
    sourceUrl: sourceUrl || undefined,
    metricValue: metricValue || undefined,
    metricContext: metricContext || undefined,
    experienceId: experienceId as string | undefined,
    skillId: skillId as string | undefined,
    achievementId: achievementId as string | undefined,
  }
}

// ---- API HANDLERS ----

/** GET /api/profile/evidence — list all evidence for the current user */
export async function GET() {
  try {
    const actor = await requireActor()
    const profileId = getRequiredProfileId(actor)

    const items = await db.evidence.findMany({
      where: { userProfileId: profileId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        type: true,
        title: true,
        description: true,
        sourceUrl: true,
        metricValue: true,
        metricContext: true,
        verificationStatus: true,
        experienceId: true,
        skillId: true,
        achievementId: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return safeNextResponse({ evidence: items })
  } catch (error) {
    return handleAuthorizationError(error)
  }
}

/** POST /api/profile/evidence — create new evidence */
export async function POST(request: NextRequest) {
  try {
    const actor = await requireActor()
    const profileId = getRequiredProfileId(actor)

    const body = await request.json().catch(() => {
      throw new AuthorizationError("BAD_REQUEST")
    })

    const input = validateEvidenceInput(body)

    // Validate linked entities belong to the owner if provided
    if (input.experienceId) {
      const exp = await db.experience.findFirst({
        where: { id: input.experienceId, userProfileId: profileId },
        select: { id: true },
      })
      if (!exp) throw new AuthorizationError("NOT_FOUND")
    }
    if (input.skillId) {
      const skill = await db.skill.findFirst({
        where: { id: input.skillId, userProfileId: profileId },
        select: { id: true },
      })
      if (!skill) throw new AuthorizationError("NOT_FOUND")
    }
    if (input.achievementId) {
      const ach = await db.achievement.findFirst({
        where: { id: input.achievementId, userProfileId: profileId },
        select: { id: true },
      })
      if (!ach) throw new AuthorizationError("NOT_FOUND")
    }

    const evidence = await db.evidence.create({
      data: {
        userProfileId: profileId,
        type: input.type,
        title: input.title,
        description: input.description,
        sourceUrl: input.sourceUrl,
        metricValue: input.metricValue,
        metricContext: input.metricContext,
        experienceId: input.experienceId || null,
        skillId: input.skillId || null,
        achievementId: input.achievementId || null,
      },
      select: {
        id: true,
        type: true,
        title: true,
        description: true,
        sourceUrl: true,
        metricValue: true,
        metricContext: true,
        verificationStatus: true,
        experienceId: true,
        skillId: true,
        achievementId: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return safeNextResponse({ evidence }, { status: 201 })
  } catch (error) {
    return handleAuthorizationError(error)
  }
}

/** PATCH /api/profile/evidence — update evidence by ID */
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

    // Verify ownership
    const existing = await db.evidence.findFirst({
      where: { id: id as string, userProfileId: profileId },
      select: { id: true },
    })
    if (!existing) {
      throw new AuthorizationError("NOT_FOUND")
    }

    // Build update data
    const data: Record<string, unknown> = {}

    if (updates.type !== undefined) {
      if (typeof updates.type !== "string" || !EVIDENCE_TYPES.includes(updates.type as EvidenceType)) {
        throw new AuthorizationError("BAD_REQUEST")
      }
      data.type = updates.type
    }
    if (updates.title !== undefined) {
      if (typeof updates.title !== "string" || (updates.title as string).trim().length === 0) {
        throw new AuthorizationError("BAD_REQUEST")
      }
      data.title = (updates.title as string).trim()
    }
    if (updates.description !== undefined) {
      data.description = typeof updates.description === "string" ? updates.description : null
    }
    if (updates.sourceUrl !== undefined) {
      data.sourceUrl = typeof updates.sourceUrl === "string" ? updates.sourceUrl : null
    }
    if (updates.metricValue !== undefined) {
      data.metricValue = typeof updates.metricValue === "string" ? updates.metricValue : null
    }
    if (updates.metricContext !== undefined) {
      data.metricContext = typeof updates.metricContext === "string" ? updates.metricContext : null
    }
    if (updates.experienceId !== undefined) {
      if (updates.experienceId !== null && typeof updates.experienceId === "string") {
        const exp = await db.experience.findFirst({
          where: { id: updates.experienceId, userProfileId: profileId },
          select: { id: true },
        })
        if (!exp) throw new AuthorizationError("NOT_FOUND")
        data.experienceId = updates.experienceId
      } else {
        data.experienceId = null
      }
    }
    if (updates.skillId !== undefined) {
      if (updates.skillId !== null && typeof updates.skillId === "string") {
        const skill = await db.skill.findFirst({
          where: { id: updates.skillId, userProfileId: profileId },
          select: { id: true },
        })
        if (!skill) throw new AuthorizationError("NOT_FOUND")
        data.skillId = updates.skillId
      } else {
        data.skillId = null
      }
    }
    if (updates.achievementId !== undefined) {
      if (updates.achievementId !== null) {
        throw new AuthorizationError("BAD_REQUEST") // achievementId changes not allowed via PATCH
      }
    }

    const updated = await db.evidence.update({
      where: { id: id as string },
      data,
      select: {
        id: true,
        type: true,
        title: true,
        description: true,
        sourceUrl: true,
        metricValue: true,
        metricContext: true,
        verificationStatus: true,
        experienceId: true,
        skillId: true,
        achievementId: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return safeNextResponse({ evidence: updated })
  } catch (error) {
    return handleAuthorizationError(error)
  }
}

/** DELETE /api/profile/evidence — delete evidence by ID */
export async function DELETE(request: NextRequest) {
  try {
    const actor = await requireActor()
    const profileId = getRequiredProfileId(actor)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!isValidId(id)) {
      throw new AuthorizationError("BAD_REQUEST")
    }

    // Verify ownership
    const existing = await db.evidence.findFirst({
      where: { id, userProfileId: profileId },
      select: { id: true },
    })
    if (!existing) {
      throw new AuthorizationError("NOT_FOUND")
    }

    await db.evidence.delete({ where: { id } })

    return safeNextResponse({ deleted: true })
  } catch (error) {
    return handleAuthorizationError(error)
  }
}
