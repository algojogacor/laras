import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import {
  requireActor,
  requireCurrentAdmin,
  handleAuthorizationError,
  AuthorizationError,
  isValidId,
  safeNextResponse
} from "@/lib/authorization"
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
  try {
    const actor = await requireActor()
    requireCurrentAdmin(actor)

    let body: { profileId?: string; type?: string; status?: string; note?: string }
    try {
      body = await request.json()
    } catch {
      throw new AuthorizationError("BAD_REQUEST")
    }

    const profileId = body.profileId?.trim()
    const type = body.type as VerificationType | undefined
    const status = body.status as VerificationStatus | undefined
    const note = body.note?.trim() || null

    if (!isValidId(profileId)) {
      throw new AuthorizationError("BAD_REQUEST")
    }
    if (!type || !VALID_TYPES.includes(type)) {
      throw new AuthorizationError("BAD_REQUEST")
    }
    if (!status || !VALID_STATUSES.includes(status)) {
      throw new AuthorizationError("BAD_REQUEST")
    }

    // Verify the profile exists
    const profile = await db.userProfile.findUnique({
      where: { id: profileId },
      select: { id: true },
    })
    if (!profile) {
      throw new AuthorizationError("NOT_FOUND")
    }

    const verifiedAt = status === "verified" ? new Date() : null

    const badge = await db.verificationBadge.upsert({
      where: { userProfileId_type: { userProfileId: profileId, type } },
      update: { status, verifiedAt, note },
      create: { userProfileId: profileId, type, status, verifiedAt, note },
    })

    return safeNextResponse({ ok: true, badge })
  } catch (error) {
    return handleAuthorizationError(error)
  }
}
