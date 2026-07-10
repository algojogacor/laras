import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSession, isAdminRole } from "@/lib/auth"
import type { VerificationType, VerificationStatus } from "@/lib/verification"

const VALID_TYPES: VerificationType[] = [
  "email",
  "phone",
  "identity",
  "education",
  "employment",
  "skill",
]
const VALID_STATUSES: VerificationStatus[] = [
  "verified",
  "rejected",
  "expired",
  "pending",
]

/**
 * POST /api/admin/verification
 * Body: { profileId, type, status, note? }
 * Admin/owner only. Upserts a VerificationBadge (Brief §9.4 governance +
 * §9.1 Trust and Verification Graph).
 *
 * - "verified" sets verifiedAt to now.
 * - "rejected"/"expired"/"pending" clears verifiedAt.
 */
export async function POST(request: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  if (!isAdminRole(session.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  let body: { profileId?: string; type?: string; status?: string; note?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "invalid-body" }, { status: 400 })
  }

  const profileId = body.profileId?.trim()
  const type = body.type as VerificationType | undefined
  const status = body.status as VerificationStatus | undefined
  const note = body.note?.trim() || null

  if (!profileId) return NextResponse.json({ error: "profileId required" }, { status: 400 })
  if (!type || !VALID_TYPES.includes(type)) {
    return NextResponse.json({ error: "invalid type" }, { status: 400 })
  }
  if (!status || !VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: "invalid status" }, { status: 400 })
  }

  // Verify the profile exists
  const profile = await db.userProfile.findUnique({
    where: { id: profileId },
    select: { id: true },
  })
  if (!profile) return NextResponse.json({ error: "profile not found" }, { status: 404 })

  const verifiedAt = status === "verified" ? new Date() : null

  const badge = await db.verificationBadge.upsert({
    where: { userProfileId_type: { userProfileId: profileId, type } },
    update: { status, verifiedAt, note },
    create: { userProfileId: profileId, type, status, verifiedAt, note },
  })

  // Audit log (Brief §9.4 — admin actions are auditable)
  await db.auditLog.create({
    data: {
      userProfileId: profileId,
      action: "admin.verification",
      resourceType: "VerificationBadge",
      resourceId: badge.id,
      metadata: JSON.stringify({
        badgeType: type,
        status,
        note,
        by: session.email,
      }),
    },
  })

  return NextResponse.json({ ok: true, badge })
}
