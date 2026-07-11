import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import {
  requireActor,
  requireCurrentAdmin,
  handleAuthorizationError,
  AuthorizationError,
  isValidId,
} from "@/lib/authorization"
import type { Plan, LicenseStatus } from "@/lib/entitlement"

const VALID_PLANS: Plan[] = ["free", "pro", "org"]
const VALID_STATUSES: LicenseStatus[] = ["active", "expired", "suspended", "cancelled"]

/**
 * GET /api/admin/licenses
 * Returns all licenses with user info. Admin/owner only (Brief §9.4).
 */
export async function GET() {
  try {
    const actor = await requireActor()
    requireCurrentAdmin(actor)

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
  } catch (error) {
    return handleAuthorizationError(error)
  }
}

/**
 * POST /api/admin/licenses
 * Body: { profileId, plan, status?, expiresAt?, note?, features? }
 * Creates a new license for a user. Admin/owner only.
 */
export async function POST(request: Request) {
  try {
    const actor = await requireActor()
    requireCurrentAdmin(actor)

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
      throw new AuthorizationError("BAD_REQUEST")
    }

    const profileId = body.profileId?.trim()
    const plan = body.plan as Plan | undefined
    const status = (body.status as LicenseStatus) ?? "active"
    const note = body.note?.trim() || null
    const features = body.features?.length ? JSON.stringify(body.features) : null
    const expiresAt = body.expiresAt ? new Date(body.expiresAt) : null

    if (!isValidId(profileId)) {
      throw new AuthorizationError("BAD_REQUEST")
    }
    if (!plan || !VALID_PLANS.includes(plan)) {
      throw new AuthorizationError("BAD_REQUEST")
    }
    if (!VALID_STATUSES.includes(status)) {
      throw new AuthorizationError("BAD_REQUEST")
    }

    const profile = await db.userProfile.findUnique({
      where: { id: profileId },
      select: { id: true },
    })
    if (!profile) {
      throw new AuthorizationError("NOT_FOUND")
    }

    const license = await db.license.create({
      data: {
        userProfileId: profileId,
        plan,
        status,
        features,
        note,
        issuedById: actor.accountId,
        expiresAt,
      },
    })

    return NextResponse.json({ ok: true, license })
  } catch (error) {
    return handleAuthorizationError(error)
  }
}

/**
 * PATCH /api/admin/licenses
 * Body: { licenseId, status?, expiresAt?, note? }
 * Updates an existing license (e.g. suspend, extend, cancel).
 */
export async function PATCH(request: Request) {
  try {
    const actor = await requireActor()
    requireCurrentAdmin(actor)

    let body: {
      licenseId?: string
      status?: string
      expiresAt?: string | null
      note?: string
    }
    try {
      body = await request.json()
    } catch {
      throw new AuthorizationError("BAD_REQUEST")
    }

    const licenseId = body.licenseId?.trim()
    if (!isValidId(licenseId)) {
      throw new AuthorizationError("BAD_REQUEST")
    }

    const existing = await db.license.findUnique({ where: { id: licenseId } })
    if (!existing) {
      throw new AuthorizationError("NOT_FOUND")
    }

    const data: Record<string, unknown> = {}
    if (body.status) {
      if (!VALID_STATUSES.includes(body.status as LicenseStatus)) {
        throw new AuthorizationError("BAD_REQUEST")
      }
      data.status = body.status
    }
    if (body.expiresAt !== undefined) {
      data.expiresAt = body.expiresAt ? new Date(body.expiresAt) : null
    }
    if (body.note !== undefined) data.note = body.note?.trim() || null

    const license = await db.license.update({ where: { id: licenseId }, data })

    return NextResponse.json({ ok: true, license })
  } catch (error) {
    return handleAuthorizationError(error)
  }
}
