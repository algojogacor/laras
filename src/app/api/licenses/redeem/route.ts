import {
  requireActor,
  getRequiredProfileId,
  handleAuthorizationError,
  AuthorizationError,
  safeNextResponse,
} from "@/lib/authorization"
import { redeemCode, RedeemError } from "@/lib/license-codes"
import { getEntitlement } from "@/lib/entitlement"

/**
 * POST /api/licenses/redeem
 * Body: { code }
 * Redeems a license code for the authenticated user.
 */
export async function POST(request: Request) {
  try {
    const actor = await requireActor()
    const profileId = getRequiredProfileId(actor)

    let body: { code?: string }
    try {
      body = await request.json()
    } catch {
      throw new AuthorizationError("BAD_REQUEST")
    }

    const code = body.code?.trim()
    if (!code || typeof code !== "string" || code.length < 4) {
      // anti-enumeration: don't reveal validation specifics
      return safeNextResponse(
        { error: "invalid-code" },
        { status: 400 }
      )
    }

    let result
    try {
      result = await redeemCode(code, profileId, actor.accountId)
    } catch (error) {
      if (error instanceof RedeemError) {
        switch (error.code) {
          case "NOT_FOUND":
            return safeNextResponse(
              { error: "not-found" },
              { status: 404 }
            )
          case "EXPIRED":
            return safeNextResponse(
              { error: "expired" },
              { status: 410 }
            )
          case "USED_UP":
            return safeNextResponse(
              { error: "used-up" },
              { status: 409 }
            )
          case "DUPLICATE":
            return safeNextResponse(
              { error: "duplicate" },
              { status: 409 }
            )
        }
      }
      throw error
    }

    // Load the fresh entitlement after redemption
    const profile = { id: profileId } as { id: string }
    const entitlement = await getEntitlement(profile)

    return safeNextResponse({
      ok: true,
      license: result.license,
      entitlement: {
        plan: entitlement.plan,
        status: entitlement.status,
        features: Array.from(entitlement.features),
        licenseId: entitlement.licenseId,
        expiresAt: entitlement.expiresAt?.toISOString() ?? null,
        rank: entitlement.rank,
      },
    })
  } catch (error) {
    return handleAuthorizationError(error)
  }
}
