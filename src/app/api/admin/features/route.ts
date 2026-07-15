import {
  requireActor,
  requireCurrentAdmin,
  handleAuthorizationError,
  AuthorizationError,
  safeNextResponse,
} from "@/lib/authorization"
import { requireCapability } from "@/lib/permissions"
import {
  listFeatureFlags,
  upsertFeatureFlag,
  deleteFeatureFlag,
} from "@/lib/feature-flags"

/**
 * GET /api/admin/features
 * Returns all FeatureFlag entries. Admin/owner only.
 */
export async function GET() {
  try {
    const actor = await requireActor()
    await requireCapability(actor, "config.read")

    const flags = await listFeatureFlags()

    return safeNextResponse({ flags })
  } catch (error) {
    return handleAuthorizationError(error)
  }
}

/**
 * POST /api/admin/features
 * Body: { key, enabled, description?, rules? }
 * Creates or updates a FeatureFlag. Admin/owner only.
 */
export async function POST(request: Request) {
  try {
    const actor = await requireActor()
    await requireCapability(actor, "config.write")

    let body: {
      key?: string
      enabled?: boolean
      description?: string
      rules?: { plans?: string[]; roles?: string[]; percentage?: number }
    }
    try {
      body = await request.json()
    } catch {
      throw new AuthorizationError("BAD_REQUEST")
    }

    const key = body.key?.trim()
    if (!key || key.length < 2 || key.length > 100) {
      throw new AuthorizationError("BAD_REQUEST")
    }

    if (body.enabled === undefined) {
      throw new AuthorizationError("BAD_REQUEST")
    }

    // Validate percentage
    if (body.rules?.percentage !== undefined) {
      const pct = body.rules.percentage
      if (typeof pct !== "number" || pct < 0 || pct > 100) {
        throw new AuthorizationError("BAD_REQUEST")
      }
    }

    await upsertFeatureFlag(key, {
      enabled: body.enabled,
      description: body.description?.trim(),
      rules: body.rules,
    })

    return safeNextResponse({ ok: true, key })
  } catch (error) {
    return handleAuthorizationError(error)
  }
}

/**
 * DELETE /api/admin/features
 * Body: { key }
 * Deletes a FeatureFlag. Admin/owner only.
 */
export async function DELETE(request: Request) {
  try {
    const actor = await requireActor()
    await requireCapability(actor, "config.write")

    let body: { key?: string }
    try {
      body = await request.json()
    } catch {
      throw new AuthorizationError("BAD_REQUEST")
    }

    const key = body.key?.trim()
    if (!key) {
      throw new AuthorizationError("BAD_REQUEST")
    }

    const deleted = await deleteFeatureFlag(key)
    if (!deleted) {
      throw new AuthorizationError("NOT_FOUND")
    }

    return safeNextResponse({ ok: true, key })
  } catch (error) {
    return handleAuthorizationError(error)
  }
}
