import "server-only"
import { db } from "@/lib/db"

// ============================================================================
// Quota Ledger — Phase 3C
// Atomic, idempotent entitlement consumption. Replaces stateless count checks.
// ============================================================================

export interface ConsumeResult {
  success: boolean
  reason?: "cap_exceeded" | "duplicate" | "error"
  consumed?: number
  remaining?: number
}

/**
 * Atomically consume one unit of a capability for a user.
 *
 * Uses the idempotencyKey to prevent double-consumption — if the same key has
 * already been consumed (and not refunded), returns success:false with
 * reason:"duplicate".
 *
 * The caller is responsible for defining the cap (maxAllowed) per capability.
 * This function only checks the current ledger consumption against that cap.
 */
export async function consumeQuota(
  userProfileId: string,
  capability: string,
  idempotencyKey: string,
  maxAllowed: number,
  metadata?: Record<string, unknown>
): Promise<ConsumeResult> {
  try {
    return await db.$transaction(async (tx) => {
      // 1. Check for existing idempotency key (non-refunded)
      const existing = await tx.quotaLedger.findUnique({
        where: { idempotencyKey },
        select: { id: true, refundedAt: true },
      })

      if (existing) {
        if (!existing.refundedAt) {
          return { success: false, reason: "duplicate" }
        }
        // If refunded, allow re-consumption by deleting the refunded record
        await tx.quotaLedger.delete({ where: { id: existing.id } })
      }

      // 2. Count current non-refunded consumption for this user+capability
      const current = await tx.quotaLedger.count({
        where: {
          userProfileId,
          capability,
          refundedAt: null,
        },
      })

      if (current >= maxAllowed) {
        return { success: false, reason: "cap_exceeded", consumed: current, remaining: 0 }
      }

      // 3. Consume one unit
      await tx.quotaLedger.create({
        data: {
          userProfileId,
          capability,
          amount: 1,
          idempotencyKey,
          metadata: metadata ? JSON.stringify(metadata) : null,
        },
      })

      return {
        success: true,
        consumed: current + 1,
        remaining: maxAllowed - (current + 1),
      }
    })
  } catch {
    return { success: false, reason: "error" }
  }
}

/**
 * Refund a previously consumed quota by idempotency key.
 * Idempotent — calling multiple times on the same key is safe.
 */
export async function refundQuota(
  idempotencyKey: string,
  userProfileId: string
): Promise<boolean> {
  try {
    const result = await db.quotaLedger.updateMany({
      where: {
        idempotencyKey,
        userProfileId,
        refundedAt: null,
      },
      data: { refundedAt: new Date() },
    })
    return result.count > 0
  } catch {
    return false
  }
}

/**
 * Get current consumption count for a user+capability (non-refunded).
 */
export async function getCurrentConsumption(
  userProfileId: string,
  capability: string
): Promise<number> {
  return db.quotaLedger.count({
    where: {
      userProfileId,
      capability,
      refundedAt: null,
    },
  })
}

/**
 * Get consumption summary across all capabilities for a user.
 */
export async function getConsumptionSummary(userProfileId: string): Promise<
  Array<{ capability: string; consumed: number }>
> {
  const results = await db.quotaLedger.groupBy({
    by: ["capability"],
    where: {
      userProfileId,
      refundedAt: null,
    },
    _count: { id: true },
  })

  return results.map((r) => ({
    capability: r.capability,
    consumed: r._count.id,
  }))
}
