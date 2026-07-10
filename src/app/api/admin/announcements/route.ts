import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSession, isAdminRole } from "@/lib/auth"

const VALID_AUDIENCES = ["all", "free", "pro", "admin"]
const VALID_PRIORITIES = ["low", "normal", "high", "urgent"]
const VALID_STATUSES = ["draft", "published", "archived"]

/**
 * GET /api/admin/announcements
 * Returns all announcements (admin/owner only).
 */
export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  if (!isAdminRole(session.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  const announcements = await db.announcement.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  })

  return NextResponse.json({ announcements })
}

/**
 * POST /api/admin/announcements
 * Creates a new announcement. Admin/owner only.
 */
export async function POST(request: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  if (!isAdminRole(session.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

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
    return NextResponse.json({ error: "invalid-body" }, { status: 400 })
  }

  const title = body.title?.trim()
  const content = body.body?.trim()
  const audience = body.audience ?? "all"
  const priority = body.priority ?? "normal"
  const status = body.status ?? "draft"

  if (!title) return NextResponse.json({ error: "title required" }, { status: 400 })
  if (!content) return NextResponse.json({ error: "body required" }, { status: 400 })
  if (!VALID_AUDIENCES.includes(audience)) {
    return NextResponse.json({ error: "invalid audience" }, { status: 400 })
  }
  if (!VALID_PRIORITIES.includes(priority)) {
    return NextResponse.json({ error: "invalid priority" }, { status: 400 })
  }
  if (!VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: "invalid status" }, { status: 400 })
  }

  const publishedAt = status === "published" ? new Date() : null

  const announcement = await db.announcement.create({
    data: { title, body: content, audience, priority, status, publishedAt },
  })

  // Audit log
  await db.auditLog.create({
    data: {
      userProfileId: "system",
      action: "admin.announcement.create",
      resourceType: "Announcement",
      resourceId: announcement.id,
      metadata: JSON.stringify({ title, audience, priority, status, by: session.email }),
    },
  }).catch(() => {
    /* audit log is best-effort; ignore if userProfileId constraint fails */
  })

  return NextResponse.json({ ok: true, announcement })
}

/**
 * PATCH /api/admin/announcements
 * Updates an existing announcement (e.g. publish, archive, edit).
 */
export async function PATCH(request: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  if (!isAdminRole(session.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

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
    return NextResponse.json({ error: "invalid-body" }, { status: 400 })
  }

  const id = body.id?.trim()
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })

  const existing = await db.announcement.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: "not found" }, { status: 404 })

  const data: Record<string, unknown> = {}
  if (body.title !== undefined) data.title = body.title.trim()
  if (body.body !== undefined) data.body = body.body.trim()
  if (body.audience !== undefined) {
    if (!VALID_AUDIENCES.includes(body.audience)) {
      return NextResponse.json({ error: "invalid audience" }, { status: 400 })
    }
    data.audience = body.audience
  }
  if (body.priority !== undefined) {
    if (!VALID_PRIORITIES.includes(body.priority)) {
      return NextResponse.json({ error: "invalid priority" }, { status: 400 })
    }
    data.priority = body.priority
  }
  if (body.status !== undefined) {
    if (!VALID_STATUSES.includes(body.status)) {
      return NextResponse.json({ error: "invalid status" }, { status: 400 })
    }
    data.status = body.status
    // Set publishedAt when transitioning to published
    if (body.status === "published" && existing.status !== "published") {
      data.publishedAt = new Date()
    }
  }

  const announcement = await db.announcement.update({ where: { id }, data })
  return NextResponse.json({ ok: true, announcement })
}

/**
 * DELETE /api/admin/announcements?id=...
 * Deletes an announcement.
 */
export async function DELETE(request: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  if (!isAdminRole(session.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")?.trim()
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })

  await db.announcement.delete({ where: { id } }).catch(() => {
    /* ignore not-found */
  })
  return NextResponse.json({ ok: true })
}
