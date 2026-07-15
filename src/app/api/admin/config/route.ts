import {
  requireActor,
  requireCurrentAdmin,
  handleAuthorizationError,
  AuthorizationError,
  safeNextResponse,
} from "@/lib/authorization"
import { requireCapability } from "@/lib/permissions"
import { getConfig, setConfig, deleteConfig, listConfigs } from "@/lib/feature-flags"

/**
 * GET /api/admin/config
 * Returns all DynamicConfig entries. Admin/owner only.
 */
export async function GET() {
  try {
    const actor = await requireActor()
    await requireCapability(actor, "config.read")

    const configs = await listConfigs()

    return safeNextResponse({ configs })
  } catch (error) {
    return handleAuthorizationError(error)
  }
}

/**
 * POST /api/admin/config
 * Body: { key, value, description? }
 * Creates or updates a DynamicConfig entry. Admin/owner only.
 */
export async function POST(request: Request) {
  try {
    const actor = await requireActor()
    await requireCapability(actor, "config.write")

    let body: {
      key?: string
      value?: unknown
      description?: string
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

    if (body.value === undefined) {
      throw new AuthorizationError("BAD_REQUEST")
    }

    await setConfig(key, body.value, actor.accountId)

    return safeNextResponse({ ok: true, key })
  } catch (error) {
    return handleAuthorizationError(error)
  }
}

/**
 * DELETE /api/admin/config
 * Body: { key }
 * Deletes a DynamicConfig entry. Admin/owner only.
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

    const deleted = await deleteConfig(key)
    if (!deleted) {
      throw new AuthorizationError("NOT_FOUND")
    }

    return safeNextResponse({ ok: true, key })
  } catch (error) {
    return handleAuthorizationError(error)
  }
}

/**
 * For Next.js App Router, support DELETE via POST with _method override.
 */
export async function PUT(request: Request) {
  try {
    const actor = await requireActor()
    await requireCapability(actor, "config.write")

    let body: { key?: string; value?: unknown; description?: string }
    try {
      body = await request.json()
    } catch {
      throw new AuthorizationError("BAD_REQUEST")
    }

    const key = body.key?.trim()
    if (!key || body.value === undefined) {
      throw new AuthorizationError("BAD_REQUEST")
    }

    await setConfig(key, body.value, actor.accountId)

    return safeNextResponse({ ok: true, key })
  } catch (error) {
    return handleAuthorizationError(error)
  }
}
