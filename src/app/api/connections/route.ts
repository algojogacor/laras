import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSession } from "@/lib/auth"
import { listConnections, requestConnection, searchUsers } from "@/lib/connections"

/**
 * GET /api/connections
 * Returns the current user's connections grouped by status.
 * Optional ?q= for user search.
 */
export async function GET(request: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const profile = await db.userProfile.findUnique({
    where: { accountId: session.userId },
    select: { id: true },
  })
  if (!profile) return NextResponse.json({ error: "no-profile" }, { status: 404 })

  const { searchParams } = new URL(request.url)
  const q = searchParams.get("q")

  // If searching for users to connect with
  if (q !== null) {
    const results = await searchUsers(session.userId, q)
    return NextResponse.json({ results })
  }

  // Otherwise list connections
  const groups = await listConnections(profile.id)
  return NextResponse.json(groups)
}

/**
 * POST /api/connections
 * Body: { addresseeId, message? }
 * Sends a connection request.
 */
export async function POST(request: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  let body: { addresseeId?: string; message?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "invalid-body" }, { status: 400 })
  }

  const addresseeId = body.addresseeId?.trim()
  if (!addresseeId) return NextResponse.json({ error: "addresseeId required" }, { status: 400 })

  const myProfile = await db.userProfile.findUnique({
    where: { accountId: session.userId },
    select: { id: true },
  })
  if (!myProfile) return NextResponse.json({ error: "no-profile" }, { status: 404 })

  const result = await requestConnection(myProfile.id, addresseeId, body.message)
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  // Audit log
  await db.auditLog.create({
    data: {
      userProfileId: myProfile.id,
      action: "connection.request",
      resourceType: "Connection",
      metadata: JSON.stringify({ addresseeId, by: session.email }),
    },
  })

  return NextResponse.json({ ok: true })
}
