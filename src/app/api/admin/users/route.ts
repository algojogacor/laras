import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSession, isAdminRole } from "@/lib/auth"

/**
 * GET /api/admin/users
 * Returns all users with their profile summary + verification badge counts.
 * Admin/owner only (Brief §9.4 governance).
 */
export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  if (!isAdminRole(session.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  const accounts = await db.account.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
      profile: {
        select: {
          id: true,
          fullName: true,
          headline: true,
          onboardingComplete: true,
          profileCompletion: true,
          verificationBadges: { select: { type: true, status: true } },
        },
      },
    },
  })

  const users = accounts.map((a) => ({
    id: a.id,
    email: a.email,
    name: a.name,
    role: a.role,
    createdAt: a.createdAt,
    fullName: a.profile?.fullName ?? null,
    headline: a.profile?.headline ?? null,
    onboardingComplete: a.profile?.onboardingComplete ?? false,
    profileCompletion: a.profile?.profileCompletion ?? 0,
    profileId: a.profile?.id ?? null,
    badges: a.profile?.verificationBadges ?? [],
  }))

  return NextResponse.json({ users })
}
