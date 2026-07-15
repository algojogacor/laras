import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import {
  requireActor,
  handleAuthorizationError,
  safeNextResponse,
  isValidId,
  AuthorizationError,
} from "@/lib/authorization"
import { requireCapability } from "@/lib/permissions"

// Roles that can be assigned through the governance API (owner excluded).
const ALLOWED_TARGET_ROLES = ["user", "admin", "moderator"] as const

/**
 * GET /api/admin/users
 * Returns all users with their profile summary + verification badge counts.
 * Admin/owner only.
 */
export async function GET() {
  try {
    const actor = await requireActor()
    await requireCapability(actor, "users.read")

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

    return safeNextResponse({ users })
  } catch (error) {
    return handleAuthorizationError(error)
  }
}

/**
 * PATCH /api/admin/users
 * Owner-only role governance.  Permits owner to assign user, admin, or
 * moderator roles to non-owner accounts.  Owner assignment, owner demotion,
 * and self-targeting are rejected.  Role enforcement happens BEFORE target
 * lookup so non-owner callers cannot use this as an account-existence oracle.
 */
export async function PATCH(request: NextRequest) {
  try {
    // 1. Authenticate
    const actor = await requireActor()

    // 2. Owner-only gate — BEFORE any target lookup
    await requireCapability(actor, "roles.manage")

    // 3. Parse and validate the request body
    let body: unknown
    try {
      body = await request.json()
    } catch {
      throw new AuthorizationError("BAD_REQUEST")
    }

    if (!body || typeof body !== "object") {
      throw new AuthorizationError("BAD_REQUEST")
    }

    const { targetId, role } = body as Record<string, unknown>

    // Only allow the exact fields we expect
    const allowedKeys = ["targetId", "role"]
    const receivedKeys = Object.keys(body as object)
    if (receivedKeys.some((k) => !allowedKeys.includes(k))) {
      throw new AuthorizationError("BAD_REQUEST")
    }

    // Validate targetId
    if (!isValidId(targetId as string | null | undefined)) {
      throw new AuthorizationError("BAD_REQUEST")
    }

    // Validate role — only exact allowed strings
    if (typeof role !== "string" || !ALLOWED_TARGET_ROLES.includes(role as (typeof ALLOWED_TARGET_ROLES)[number])) {
      throw new AuthorizationError("BAD_REQUEST")
    }

    // 4. Atomic transaction: load target, verify constraints, update
    const result = await db.$transaction(async (tx) => {
      // Load target
      const target = await tx.account.findUnique({
        where: { id: targetId as string },
        select: { id: true, role: true },
      })

      if (!target) {
        throw new AuthorizationError("NOT_FOUND")
      }

      // Cannot target the platform owner
      if (target.role === "owner") {
        throw new AuthorizationError("FORBIDDEN")
      }

      // Cannot self-target (owner changing their own role)
      if (target.id === actor.accountId) {
        throw new AuthorizationError("FORBIDDEN")
      }

      // Duplicate no-op: role is already the requested role
      if (target.role === role) {
        throw new AuthorizationError("CONFLICT")
      }

      // Apply the role change
      const updated = await tx.account.update({
        where: { id: target.id },
        data: { role },
        select: { id: true, email: true, role: true },
      })

      // Write minimal audit record
      await tx.auditLog.create({
        data: {
          userProfileId: actor.profileId ?? "c00000000000000000000000",
          action: "admin.role_change",
          resourceType: "Account",
          resourceId: target.id,
          metadata: JSON.stringify({
            previousRole: target.role,
            newRole: role,
          }),
        },
      })

      return updated
    })

    return safeNextResponse({
      id: result.id,
      role: result.role,
    })
  } catch (error) {
    return handleAuthorizationError(error)
  }
}
