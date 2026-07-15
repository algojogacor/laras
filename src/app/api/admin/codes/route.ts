import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import {
  requireActor,
  requireCurrentAdmin,
  handleAuthorizationError,
  AuthorizationError,
  safeNextResponse,
} from "@/lib/authorization"
import { createLicenseCodes, deactivateCode, listCodes } from "@/lib/license-codes"
import type { Plan } from "@/lib/entitlement"

const VALID_PLANS: Plan[] = ["free", "plus", "pro", "max"]

/**
 * GET /api/admin/codes
 * Lists license codes with redemption counts. Admin/owner only.
 */
export async function GET() {
  try {
    const actor = await requireActor()
    requireCurrentAdmin(actor)

    const codes = await listCodes({ limit: 100 })

    return safeNextResponse({
      codes: codes.map((c) => ({
        id: c.id,
        // Do NOT return plaintext codes in listing
        plan: c.plan,
        features: c.features,
        maxRedemptions: c.maxRedemptions,
        currentRedemptions: c.currentRedemptions,
        batchId: c.batchId,
        campaignId: c.campaignId,
        isActive: c.isActive,
        startsAt: c.startsAt,
        expiresAt: c.expiresAt,
        createdAt: c.createdAt,
        codePrefix: c.code ? c.code.substring(0, 4) + "..." : null,
      })),
    })
  } catch (error) {
    return handleAuthorizationError(error)
  }
}

/**
 * POST /api/admin/codes
 * Generates individual or batch license codes.
 * Body: { plan, features?, count?, batchId?, campaignId?, expiresAt?, maxRedemptions? }
 * Returns codes — only shown once!
 */
export async function POST(request: Request) {
  try {
    const actor = await requireActor()
    requireCurrentAdmin(actor)

    let body: {
      plan?: string
      features?: string[]
      count?: number
      batchId?: string
      campaignId?: string
      expiresAt?: string
      maxRedemptions?: number
    }
    try {
      body = await request.json()
    } catch {
      throw new AuthorizationError("BAD_REQUEST")
    }

    const plan = body.plan as Plan | undefined
    if (!plan || !VALID_PLANS.includes(plan)) {
      throw new AuthorizationError("BAD_REQUEST")
    }

    const count = body.count ?? 1
    if (count < 1 || count > 100) {
      throw new AuthorizationError("BAD_REQUEST")
    }

    const expiresAt = body.expiresAt ? new Date(body.expiresAt) : undefined
    if (expiresAt && isNaN(expiresAt.getTime())) {
      throw new AuthorizationError("BAD_REQUEST")
    }

    const results = await createLicenseCodes({
      plan,
      features: body.features,
      count,
      batchId: body.batchId,
      campaignId: body.campaignId,
      createdById: actor.accountId,
      maxRedemptions: body.maxRedemptions ?? 1,
      expiresAt,
    })

    // Audit log for code generation
    // (We batch this after the transaction since createLicenseCodes already creates records)
    await db.auditLog.create({
      data: {
        userProfileId: actor.profileId!,
        action: "admin.codes.generate",
        resourceType: "LicenseCode",
        resourceId: results[0]?.id ?? null,
        metadata: JSON.stringify({
          count: results.length,
          plan,
          batchId: body.batchId ?? null,
          campaignId: body.campaignId ?? null,
        }),
      },
    })

    return safeNextResponse({
      ok: true,
      generated: results.length,
      codes: results.map((r) => ({
        id: r.id,
        code: r.code,
        plan: r.plan,
        maxRedemptions: r.maxRedemptions,
        expiresAt: r.expiresAt,
      })),
    })
  } catch (error) {
    return handleAuthorizationError(error)
  }
}

/**
 * PATCH /api/admin/codes
 * Deactivates/revokes a code.
 * Body: { codeId }
 */
export async function PATCH(request: Request) {
  try {
    const actor = await requireActor()
    requireCurrentAdmin(actor)

    let body: { codeId?: string }
    try {
      body = await request.json()
    } catch {
      throw new AuthorizationError("BAD_REQUEST")
    }

    const codeId = body.codeId?.trim()
    if (!codeId || !/^c[a-z0-9]{24}$/.test(codeId)) {
      throw new AuthorizationError("BAD_REQUEST")
    }

    const existing = await db.licenseCode.findUnique({ where: { id: codeId } })
    if (!existing) {
      throw new AuthorizationError("NOT_FOUND")
    }

    await deactivateCode(codeId)

    return safeNextResponse({ ok: true, deactivated: codeId })
  } catch (error) {
    return handleAuthorizationError(error)
  }
}
