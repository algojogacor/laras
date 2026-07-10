import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSession, isAdminRole } from "@/lib/auth"
import type { Plan, LicenseStatus } from "@/lib/entitlement"

const VALID_PLANS: Plan[] = ["free", "pro", "org"]
const VALID_STATUSES: LicenseStatus[] = ["active", "expired", "suspended", "cancelled"]

/**
 * GET /api/admin/licenses
 * Returns all licenses with user info. Admin/owner only (Brief §9.4).
 */
export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  if (!isAdminRole(session.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  const licenses = await db.license.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      userProfile: {
        select: { id: true, fullName: true, email: true, accountId: true },
      },
    },
    take: 100,
  })

  return NextResponse.json({
    licenses: licenses.map((l) => ({
      id: l.id,
      plan: l.plan,
      status: l.status,
      features: l.features,
      note: l.note,
      issuedById: l.issuedById,
      startsAt: l.startsAt,
      expiresAt: l.expiresAt,
      createdAt: l.createdAt,
      profileId: l.userProfileId,
      fullName: l.userProfile?.fullName ?? null,
      email: l.userProfile?.email ?? null,
    })),
  })
}

/**
 * POST /api/admin/licenses
 * Body: { profileId, plan, status?, expiresAt?, note?, features? }
 * Creates a new license for a user. Admin/owner only.
 */
export async function POST(request: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  if (!isAdminRole(session.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  let body: {
    profileId?: string
    plan?: string
    status?: string
    expiresAt?: string | null
    note?: string
    features?: string[]
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "invalid-body" }, { status: 400 })
  }

  const profileId = body.profileId?.trim()
  const plan = body.plan as Plan | undefined
  const status = (body.status as LicenseStatus) ?? "active"
  const note = body.note?.trim() || null
  const features = body.features?.length ? JSON.stringify(body.features) : null
  const expiresAt = body.expiresAt ? new Date(body.expiresAt) : null

  if (!profileId) return NextResponse.json({ error: "profileId required" }, { status: 400 })
  if (!plan || !VALID_PLANS.includes(plan)) {
    return NextResponse.json({ error: "invalid plan" }, { status: 400 })
  }
  if (!VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: "invalid status" }, { status: 400 })
  }

  const profile = await db.userProfile.findUnique({
    where: { id: profileId },
    select: { id: true },
  })
  if (!profile) return NextResponse.json({ error: "profile not found" }, { status: 404 })

  const license = await db.license.create({
    data: {
      userProfileId: profileId,
      plan,
      status,
      features,
      note,
      issuedById: session.userId,
      expiresAt,
    },
  })

  // Audit log
  await db.auditLog.create({
    data: {
      userProfileId: profileId,
      action: "admin.license.grant",
      resourceType: "License",
      resourceId: license.id,
      metadata: JSON.stringify({
        plan,
        status,
        expiresAt: expiresAt?.toISOString() ?? null,
        by: session.email,
      }),
    },
  })

  return NextResponse.json({ ok: true, license })
}

/**
 * PATCH /api/admin/licenses
 * Body: { licenseId, status?, expiresAt?, note? }
 * Updates an existing license (e.g. suspend, extend, cancel).
 */
export async function PATCH(request: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  if (!isAdminRole(session.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  let body: {
    licenseId?: string
    status?: string
    expiresAt?: string | null
    note?: string
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "invalid-body" }, { status: 400 })
  }

  const licenseId = body.licenseId?.trim()
  if (!licenseId) return NextResponse.json({ error: "licenseId required" }, { status: 400 })

  const existing = await db.license.findUnique({ where: { id: licenseId } })
  if (!existing) return NextResponse.json({ error: "license not found" }, { status: 404 })

  const data: Record<string, unknown> = {}
  if (body.status) {
    if (!VALID_STATUSES.includes(body.status as LicenseStatus)) {
      return NextResponse.json({ error: "invalid status" }, { status: 400 })
    }
    data.status = body.status
  }
  if (body.expiresAt !== undefined) {
    data.expiresAt = body.expiresAt ? new Date(body.expiresAt) : null
  }
  if (body.note !== undefined) data.note = body.note?.trim() || null

  const license = await db.license.update({ where: { id: licenseId }, data })

  await db.auditLog.create({
    data: {
      userProfileId: existing.userProfileId,
      action: "admin.license.update",
      resourceType: "License",
      resourceId: license.id,
      metadata: JSON.stringify({ changes: data, by: session.email }),
    },
  })

  return NextResponse.json({ ok: true, license })
}
