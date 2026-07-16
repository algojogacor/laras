import "server-only"
import crypto from "crypto"
import { db } from "@/lib/db"
import type { Plan, LicenseStatus } from "@/lib/entitlement"

// ============================================================================
// License Code Service — Phase 5A
// ============================================================================

const CODE_LENGTH = 16
const CODE_CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789" // no 0/O, 1/I/l for readability

/**
 * Generate a single cryptographically random redemption code.
 * Uses crypto.randomBytes for secure randomness.
 */
export function generateCode(): string {
  const bytes = crypto.randomBytes(CODE_LENGTH)
  let code = ""
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_CHARSET[bytes[i] % CODE_CHARSET.length]
  }
  return code
}

/**
 * Generate multiple unique codes.
 */
export function generateCodes(count: number): string[] {
  const codes: string[] = []
  for (let i = 0; i < count; i++) {
    codes.push(generateCode())
  }
  return codes
}

export interface CreateCodesInput {
  plan: Plan
  features?: string[]
  count?: number
  batchId?: string
  campaignId?: string
  createdById: string
  maxRedemptions?: number
  expiresAt?: Date
}

export interface CreatedCodeResult {
  id: string
  code: string
  plan: string
  maxRedemptions: number
  expiresAt: string | null
}

/**
 * Creates license codes in the database and returns them.
 * Codes are ONLY returned on creation — they are not stored in plaintext after
 * this function returns (the caller should display them once).
 */
export async function createLicenseCodes(
  input: CreateCodesInput
): Promise<CreatedCodeResult[]> {
  const count = Math.min(input.count ?? 1, 100) // cap at 100 per batch
  const rawCodes = generateCodes(count)
  const featuresJson = input.features?.length ? JSON.stringify(input.features) : null

  // Create all codes in a transaction
  const results: CreatedCodeResult[] = []

  for (const code of rawCodes) {
    const record = await db.licenseCode.create({
      data: {
        code,
        plan: input.plan,
        features: featuresJson,
        maxRedemptions: input.maxRedemptions ?? 1,
        batchId: input.batchId ?? null,
        campaignId: input.campaignId ?? null,
        createdById: input.createdById,
        expiresAt: input.expiresAt ?? null,
      },
    })
    results.push({
      id: record.id,
      code: record.code,
      plan: record.plan,
      maxRedemptions: record.maxRedemptions,
      expiresAt: record.expiresAt?.toISOString() ?? null,
    })
  }

  return results
}

/**
 * Redeem a license code for a user.
 *
 * Verification (in order):
 * 1. Code exists → 404 if not
 * 2. Code is active → 410 if not (expired/deactivated)
 * 3. Code is not expired → 410 if expired
 * 4. Code has redemptions remaining → 409 if fully used
 * 5. User hasn't already redeemed this code → 409 if duplicate
 *
 * On success: atomically increments currentRedemptions, creates a License row,
 * and records an audit log entry.
 */
export async function redeemCode(
  code: string,
  userProfileId: string,
  accountId: string
): Promise<{ license: { id: string; plan: string; status: string } }> {
  const cleaned = code.trim().toUpperCase()

  return db.$transaction(async (tx) => {
    const licenseCode = await tx.licenseCode.findUnique({
      where: { code: cleaned },
    })

    if (!licenseCode) {
      throw new RedeemError("NOT_FOUND")
    }

    if (!licenseCode.isActive) {
      throw new RedeemError("EXPIRED")
    }

    if (licenseCode.expiresAt && licenseCode.expiresAt < new Date()) {
      throw new RedeemError("EXPIRED")
    }

    if (licenseCode.currentRedemptions >= licenseCode.maxRedemptions) {
      throw new RedeemError("USED_UP")
    }

    // Check duplicate: has this user already redeemed this specific code?
    const existingLicense = await tx.license.findFirst({
      where: {
        userProfileId,
        licenseCodeId: licenseCode.id,
      },
    })
    if (existingLicense) {
      throw new RedeemError("DUPLICATE")
    }

    // Atomically increment currentRedemptions
    await tx.licenseCode.update({
      where: { id: licenseCode.id },
      data: { currentRedemptions: { increment: 1 } },
    })

    // Parse features
    let features: string[] | null = null
    if (licenseCode.features) {
      try {
        features = JSON.parse(licenseCode.features)
      } catch {
        features = null
      }
    }

    // Create a License for the user
    const license = await tx.license.create({
      data: {
        userProfileId,
        plan: licenseCode.plan as Plan,
        status: "active" as LicenseStatus,
        features: features ? JSON.stringify(features) : null,
        note: `Redeemed code:${cleaned}` + (licenseCode.batchId ? ` batch:${licenseCode.batchId}` : ""),
        issuedById: licenseCode.createdById,
        licenseCodeId: licenseCode.id,
        startsAt: new Date(),
        expiresAt: licenseCode.expiresAt,
      },
    })

    // Create audit log entry
    await tx.auditLog.create({
      data: {
        userProfileId,
        action: "license.redeem",
        resourceType: "LicenseCode",
        resourceId: licenseCode.id,
        metadata: JSON.stringify({
          code: cleaned,
          plan: licenseCode.plan,
          licenseId: license.id,
        }),
      },
    })

    return {
      license: {
        id: license.id,
        plan: license.plan,
        status: license.status,
      },
    }
  })
}

/**
 * Deactivate (revoke) a license code by ID.
 */
export async function deactivateCode(codeId: string): Promise<void> {
  await db.licenseCode.update({
    where: { id: codeId },
    data: { isActive: false },
  })
}

/**
 * Get all codes in a batch by batchId.
 */
export async function getBatchCodes(batchId: string) {
  return db.licenseCode.findMany({
    where: { batchId },
    orderBy: { createdAt: "desc" },
  })
}

/**
 * List all license codes with pagination.
 */
export async function listCodes(opts?: { limit?: number; offset?: number }) {
  const limit = Math.min(opts?.limit ?? 50, 100)
  const offset = opts?.offset ?? 0
  return db.licenseCode.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    skip: offset,
  })
}

// ============================================================================
// RedeemError — thrown during code redemption with specific error types
// ============================================================================

export type RedeemErrorCode = "NOT_FOUND" | "EXPIRED" | "USED_UP" | "DUPLICATE"

export class RedeemError extends Error {
  constructor(public code: RedeemErrorCode) {
    super(code)
    this.name = "RedeemError"
  }
}
