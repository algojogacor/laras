import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSession, isAdminRole } from "@/lib/auth"
import { getEntitlement } from "@/lib/entitlement"
import {
  requireActor,
  getRequiredProfileId,
  handleAuthorizationError,
  AuthorizationError,
  isValidId,
  safeNextResponse,
} from "@/lib/authorization"

/**
 * GET /api/announcements
 * Returns published announcements targeted to the current user, excluding
 * those they have dismissed. Phase 8C: read/dismiss state support.
 */
export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const profile = await db.userProfile.findUnique({
    where: { accountId: session.userId },
    select: { id: true },
  })
  if (!profile) return NextResponse.json({ announcements: [] })

  // Determine the user's plan for audience targeting
  const entitlement = await getEntitlement(profile)
  const isAdmin = isAdminRole(session.role)

  // Build the audience filter
  const audiences = ["all"]
  if (entitlement.plan === "free") audiences.push("free")
  else audiences.push("pro")
  if (isAdmin) audiences.push("admin")

  // Get IDs of dismissed announcements so we can exclude them
  const dismissed = await db.announcementRead.findMany({
    where: { userProfileId: profile.id, dismissed: true },
    select: { announcementId: true },
  })
  const dismissedIds = dismissed.map((d) => d.announcementId)

  const now = new Date()
  const announcements = await db.announcement.findMany({
    where: {
      status: "published",
      publishedAt: { lte: now },
      audience: { in: audiences },
      ...(dismissedIds.length > 0 ? { id: { notIn: dismissedIds } } : {}),
    },
    orderBy: [{ priority: "desc" }, { publishedAt: "desc" }],
    take: 10,
  })

  // Get read state for these announcements
  const readRecords = await db.announcementRead.findMany({
    where: {
      userProfileId: profile.id,
      announcementId: { in: announcements.map((a) => a.id) },
    },
    select: { announcementId: true, readAt: true },
  })
  const readMap = new Map(readRecords.map((r) => [r.announcementId, r.readAt]))

  const enriched = announcements.map((a) => ({
    ...a,
    readAt: readMap.get(a.id)?.toISOString() ?? null,
  }))

  return NextResponse.json({ announcements: enriched })
}

/**
 * PATCH /api/announcements
 * Mark an announcement as read or dismissed. Body: { id, action: "read" | "dismiss" }
 * Phase 8C.
 */
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

    const { id, action } = body as Record<string, unknown>
    if (!isValidId(id as string | null | undefined)) {
      throw new AuthorizationError("BAD_REQUEST")
    }
    if (action !== "read" && action !== "dismiss") {
      throw new AuthorizationError("BAD_REQUEST")
    }

    // Verify announcement exists
    const announcement = await db.announcement.findUnique({
      where: { id: id as string },
      select: { id: true },
    })
    if (!announcement) throw new AuthorizationError("NOT_FOUND")

    if (action === "dismiss") {
      await db.announcementRead.upsert({
        where: {
          userProfileId_announcementId: {
            userProfileId: profileId,
            announcementId: id as string,
          },
        },
        create: {
          userProfileId: profileId,
          announcementId: id as string,
          dismissed: true,
        },
        update: { dismissed: true },
      })
    } else {
      await db.announcementRead.upsert({
        where: {
          userProfileId_announcementId: {
            userProfileId: profileId,
            announcementId: id as string,
          },
        },
        create: {
          userProfileId: profileId,
          announcementId: id as string,
          readAt: new Date(),
        },
        update: { readAt: new Date() },
      })
    }

    return safeNextResponse({ ok: true })
  } catch (error) {
    return handleAuthorizationError(error)
  }
}
