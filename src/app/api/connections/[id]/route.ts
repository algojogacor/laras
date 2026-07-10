import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSession } from "@/lib/auth"
import { acceptConnection, declineConnection } from "@/lib/connections"

/**
 * PATCH /api/connections/[id]
 * Body: { action: "accept" | "decline" }
 * Accepts or declines a pending connection request (addressee only).
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const { id } = await params

  let body: { action?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "invalid-body" }, { status: 400 })
  }

  const myProfile = await db.userProfile.findUnique({
    where: { accountId: session.userId },
    select: { id: true },
  })
  if (!myProfile) return NextResponse.json({ error: "no-profile" }, { status: 404 })

  let result: { ok: boolean; error?: string }
  if (body.action === "accept") {
    result = await acceptConnection(id, myProfile.id)
  } else if (body.action === "decline") {
    result = await declineConnection(id, myProfile.id)
  } else {
    return NextResponse.json({ error: "invalid action" }, { status: 400 })
  }

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  // Audit log
  await db.auditLog.create({
    data: {
      userProfileId: myProfile.id,
      action: `connection.${body.action}`,
      resourceType: "Connection",
      resourceId: id,
      metadata: JSON.stringify({ by: session.email }),
    },
  })

  return NextResponse.json({ ok: true })
}
