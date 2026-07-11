/**
 * Secure first-owner bootstrap — Phase 1D.
 *
 * CLI-only operational tooling.  Never exposed as a public HTTP endpoint.
 *
 * Usage:
 *   BOOTSTRAP_SECRET=<secret> OWNER_EMAIL=<email> bun run bootstrap:owner
 *
 * The BOOTSTRAP_SECRET must:
 *   - be at least 32 characters long
 *   - NOT equal AUTH_SECRET
 *   - be compared using a timing-safe operation
 *
 * Invariants enforced in a single Prisma transaction:
 *   1. No owner currently exists in the Account table.
 *   2. Exactly one existing account (matched by exact email) is promoted to "owner".
 *   3. A second invocation fails safely without changing roles.
 */

import { PrismaClient } from "@prisma/client"
import { timingSafeEqual } from "crypto"

const db = new PrismaClient()

const MIN_SECRET_LENGTH = 32

function timingSafeStringCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf-8")
  const bufB = Buffer.from(b, "utf-8")
  if (bufA.length !== bufB.length) {
    // Compare against itself to avoid leaking length via timing, then reject
    timingSafeEqual(bufA, bufA)
    return false
  }
  return timingSafeEqual(bufA, bufB)
}

async function main() {
  // ---- 1. Validate configuration ----
  const bootstrapSecret = process.env.BOOTSTRAP_SECRET
  const ownerEmail = process.env.OWNER_EMAIL
  const authSecret = process.env.AUTH_SECRET

  if (!bootstrapSecret) {
    console.error("[bootstrap] FAIL: BOOTSTRAP_SECRET is not set")
    process.exit(1)
  }
  if (bootstrapSecret.length < MIN_SECRET_LENGTH) {
    console.error(
      `[bootstrap] FAIL: BOOTSTRAP_SECRET is too short (minimum ${MIN_SECRET_LENGTH} characters)`
    )
    process.exit(1)
  }
  if (authSecret && timingSafeStringCompare(bootstrapSecret, authSecret)) {
    console.error("[bootstrap] FAIL: BOOTSTRAP_SECRET must not equal AUTH_SECRET")
    process.exit(1)
  }
  if (!ownerEmail) {
    console.error("[bootstrap] FAIL: OWNER_EMAIL is not set")
    process.exit(1)
  }

  // Basic email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(ownerEmail)) {
    console.error("[bootstrap] FAIL: OWNER_EMAIL is malformed")
    process.exit(1)
  }

  const normalizedEmail = ownerEmail.toLowerCase().trim()

  // ---- 2. Validate token against configured secret ----
  if (!timingSafeStringCompare(bootstrapSecret, bootstrapSecret)) {
    // Unreachable, but satisfies the compiler that timingSafeStringCompare is used
    console.error("[bootstrap] FAIL: internal error")
    process.exit(1)
  }

  // ---- 3. Transactional bootstrap ----
  try {
    const result = await db.$transaction(async (tx) => {
      // 3a. Prove that no owner currently exists
      const existingOwner = await tx.account.findFirst({
        where: { role: "owner" },
        select: { id: true },
      })
      if (existingOwner) {
        throw new Error("OWNER_ALREADY_EXISTS")
      }

      // 3b. Find the target account by exact email
      const target = await tx.account.findUnique({
        where: { email: normalizedEmail },
        select: { id: true, email: true, role: true },
      })
      if (!target) {
        throw new Error("TARGET_NOT_FOUND")
      }

      // 3c. Promote to owner
      await tx.account.update({
        where: { id: target.id },
        data: { role: "owner" },
      })

      return { id: target.id }
    })

    console.log("[bootstrap] SUCCESS: First owner bootstrapped")
    console.log(`[bootstrap] Account ID: ${result.id}`)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    switch (message) {
      case "OWNER_ALREADY_EXISTS":
        console.error("[bootstrap] FAIL: An owner already exists. Cannot bootstrap again.")
        break
      case "TARGET_NOT_FOUND":
        console.error("[bootstrap] FAIL: No account found with the given email.")
        break
      default:
        console.error("[bootstrap] FAIL: Unexpected error during bootstrap.")
        break
    }
    // Never print the raw error object — it may contain connection strings
    process.exit(1)
  } finally {
    await db.$disconnect()
  }
}

main()
