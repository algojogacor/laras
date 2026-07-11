import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import {
  requireActor,
  requireCurrentAdmin,
  handleAuthorizationError,
} from "@/lib/authorization"

/**
 * GET /api/admin/users
 * Returns all users with their profile summary + verification badge counts.
 * Admin/owner only (Brief §9.4 governance).
 */
export async function GET() {
  try {
    const actor = await requireActor()
    requireCurrentAdmin(actor)

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
  } catch (error) {
    return handleAuthorizationError(error)
  }
}
