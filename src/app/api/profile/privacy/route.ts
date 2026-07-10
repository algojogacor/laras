import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSession } from "@/lib/auth"
import { getConsentEntries, setConsent, CONSENT_FIELDS, type ConsentField, type Visibility } from "@/lib/privacy"

const VALID_VISIBILITY: Visibility[] = ["public", "connections", "private"]

/**
 * GET /api/profile/privacy
 * Returns the current user's per-field consent settings (merged with defaults).
 */
export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const profile = await db.userProfile.findUnique({
    where: { accountId: session.userId },
    select: { id: true },
  })
  if (!profile) return NextResponse.json({ error: "no-profile" }, { status: 404 })

  const entries = await getConsentEntries(profile.id)
  return NextResponse.json({ entries })
}

/**
 * PATCH /api/profile/privacy
 * Body: { field, visibility }
 * Updates a single field's visibility consent.
 */
export async function PATCH(request: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  let body: { field?: string; visibility?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "invalid-body" }, { status: 400 })
  }

  const field = body.field as ConsentField | undefined
  const visibility = body.visibility as Visibility | undefined

  if (!field || !CONSENT_FIELDS.includes(field)) {
    return NextResponse.json({ error: "invalid field" }, { status: 400 })
  }
  if (!visibility || !VALID_VISIBILITY.includes(visibility)) {
    return NextResponse.json({ error: "invalid visibility" }, { status: 400 })
  }

  const profile = await db.userProfile.findUnique({
    where: { accountId: session.userId },
    select: { id: true },
  })
  if (!profile) return NextResponse.json({ error: "no-profile" }, { status: 404 })

  await setConsent(profile.id, field, visibility)

  // Audit log
  await db.auditLog.create({
    data: {
      userProfileId: profile.id,
      action: "privacy.update",
      resourceType: "ConsentSetting",
      metadata: JSON.stringify({ field, visibility, by: session.email }),
    },
  })

  return NextResponse.json({ ok: true, field, visibility })
}
