import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSession, isAdminRole } from "@/lib/auth"
import { getEntitlement } from "@/lib/entitlement"

/**
 * GET /api/announcements
 * Returns published announcements targeted to the current user based on
 * their plan (free/pro) and admin status. Brief §9.4/§9.5.
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

  // Build the audience filter: user sees announcements targeted to their plan
  const audiences = ["all"]
  if (entitlement.plan === "free") audiences.push("free")
  else audiences.push("pro") // pro or org
  if (isAdmin) audiences.push("admin")

  const now = new Date()
  const announcements = await db.announcement.findMany({
    where: {
      status: "published",
      publishedAt: { lte: now },
      audience: { in: audiences },
    },
    orderBy: [{ priority: "desc" }, { publishedAt: "desc" }],
    take: 10,
  })

  return NextResponse.json({ announcements })
}
