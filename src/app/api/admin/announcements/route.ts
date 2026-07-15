import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import {
  requireActor,
  handleAuthorizationError,
  AuthorizationError,
  safeNextResponse
} from "@/lib/authorization"
import { requireCapability } from "@/lib/permissions"

const VALID_AUDIENCES = ["all", "free", "pro", "admin"]
const VALID_PRIORITIES = ["low", "normal", "high", "urgent"]
const VALID_STATUSES = ["draft", "published", "archived"]

/**
 * GET /api/admin/announcements
 * Returns all announcements (admin/owner only).
 */
export async function GET() {
  try {
    const actor = await requireActor()
    await requireCapability(actor, "announcements.manage")

    const announcements = await db.announcement.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
    })

    return safeNextResponse({ announcements })
  } catch (error) {
    return handleAuthorizationError(error)
  }
}

/**
 * POST /api/admin/announcements
 * Creates a new announcement. Admin/owner only.
 */
export async function POST(request: Request) {
  try {
    const actor = await requireActor()
    await requireCapability(actor, "announcements.manage")

    let body: {
      title?: string
      body?: string
      audience?: string
      priority?: string
      status?: string
    }
    try {
      body = await request.json()
    } catch {
      throw new AuthorizationError("BAD_REQUEST")
    }

    const title = body.title?.trim()
    const content = body.body?.trim()
    const audience = body.audience ?? "all"
    const priority = body.priority ?? "normal"
    const status = body.status ?? "draft"

    if (!title || !content) {
      throw new AuthorizationError("BAD_REQUEST")
    }
    if (!VALID_AUDIENCES.includes(audience) || !VALID_PRIORITIES.includes(priority) || !VALID_STATUSES.includes(status)) {
      throw new AuthorizationError("BAD_REQUEST")
    }

    const publishedAt = status === "published" ? new Date() : null

    const announcement = await db.announcement.create({
      data: { title, body: content, audience, priority, status, publishedAt },
    })

    return safeNextResponse({ ok: true, announcement })
  } catch (error) {
    return handleAuthorizationError(error)
  }
}

/**
 * PATCH /api/admin/announcements
 * Updates an existing announcement (e.g. publish, archive, edit).
 */
export async function PATCH(request: Request) {
  try {
    const actor = await requireActor()
    await requireCapability(actor, "announcements.manage")

    let body: {
      id?: string
      title?: string
      body?: string
      audience?: string
      priority?: string
      status?: string
    }
    try {
      body = await request.json()
    } catch {
      throw new AuthorizationError("BAD_REQUEST")
    }

    const id = body.id?.trim()
    if (!id) {
      throw new AuthorizationError("BAD_REQUEST")
    }

    const existing = await db.announcement.findUnique({ where: { id } })
    if (!existing) {
      throw new AuthorizationError("NOT_FOUND")
    }

    const data: Record<string, unknown> = {}
    if (body.title !== undefined) data.title = body.title.trim()
    if (body.body !== undefined) data.body = body.body.trim()
    if (body.audience !== undefined) {
      if (!VALID_AUDIENCES.includes(body.audience)) {
        throw new AuthorizationError("BAD_REQUEST")
      }
      data.audience = body.audience
    }
    if (body.priority !== undefined) {
      if (!VALID_PRIORITIES.includes(body.priority)) {
        throw new AuthorizationError("BAD_REQUEST")
      }
      data.priority = body.priority
    }
    if (body.status !== undefined) {
      if (!VALID_STATUSES.includes(body.status)) {
        throw new AuthorizationError("BAD_REQUEST")
      }
      data.status = body.status
      if (body.status === "published" && existing.status !== "published") {
        data.publishedAt = new Date()
      }
    }

    const announcement = await db.announcement.update({ where: { id }, data })
    return safeNextResponse({ ok: true, announcement })
  } catch (error) {
    return handleAuthorizationError(error)
  }
}

/**
 * DELETE /api/admin/announcements?id=...
 * Deletes an announcement.
 */
export async function DELETE(request: Request) {
  try {
    const actor = await requireActor()
    await requireCapability(actor, "announcements.manage")

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")?.trim()
    if (!id) {
      throw new AuthorizationError("BAD_REQUEST")
    }

    const existing = await db.announcement.findUnique({ where: { id } })
    if (!existing) {
      throw new AuthorizationError("NOT_FOUND")
    }

    await db.announcement.delete({ where: { id } })
    return safeNextResponse({ ok: true })
  } catch (error) {
    return handleAuthorizationError(error)
  }
}
