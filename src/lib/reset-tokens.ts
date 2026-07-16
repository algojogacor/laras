import "server-only"
import crypto from "crypto"
import { db } from "@/lib/db"

const RESET_TTL_MS = 60 * 60 * 1000

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex")
}

export async function createResetToken(accountId: string): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex")
  await db.passwordResetToken.create({
    data: { accountId, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + RESET_TTL_MS) },
  })
  return token
}

export async function validateResetToken(token: string): Promise<string | null> {
  if (!/^[a-f0-9]{64}$/i.test(token)) return null
  const row = await db.passwordResetToken.findFirst({
    where: { tokenHash: hashToken(token), consumedAt: null, revokedAt: null, expiresAt: { gt: new Date() } },
    select: { accountId: true },
  })
  return row?.accountId ?? null
}

/** Atomically consumes a token; concurrent callers can only get one account ID. */
export async function consumeResetToken(token: string): Promise<string | null> {
  if (!/^[a-f0-9]{64}$/i.test(token)) return null
  const result = await db.passwordResetToken.updateMany({
    where: { tokenHash: hashToken(token), consumedAt: null, revokedAt: null, expiresAt: { gt: new Date() } },
    data: { consumedAt: new Date() },
  })
  if (result.count !== 1) return null
  const row = await db.passwordResetToken.findUnique({ where: { tokenHash: hashToken(token) }, select: { accountId: true } })
  return row?.accountId ?? null
}

/** Consume the token and change the password in one transaction. */
export async function consumeResetTokenAndUpdatePassword(token: string, passwordHash: string): Promise<string | null> {
  if (!/^[a-f0-9]{64}$/i.test(token)) return null
  return db.$transaction(async (tx) => {
    const result = await tx.passwordResetToken.updateMany({
      where: { tokenHash: hashToken(token), consumedAt: null, revokedAt: null, expiresAt: { gt: new Date() } },
      data: { consumedAt: new Date() },
    })
    if (result.count !== 1) return null
    const row = await tx.passwordResetToken.findUnique({ where: { tokenHash: hashToken(token) }, select: { accountId: true } })
    if (!row) return null
    await tx.account.update({
      where: { id: row.accountId },
      data: { passwordHash, sessionVersion: { increment: 1 }, refreshTokenVersion: { increment: 1 } },
    })
    return row.accountId
  })
}

export async function revokeResetTokens(accountId: string): Promise<void> {
  await db.passwordResetToken.updateMany({ where: { accountId, consumedAt: null, revokedAt: null }, data: { revokedAt: new Date() } })
}

export async function cleanupExpiredResetTokens(): Promise<number> {
  const result = await db.passwordResetToken.deleteMany({ where: { expiresAt: { lt: new Date() } } })
  return result.count
}
