import crypto from "crypto"

// ============================================================================
// In-memory password reset token store
// In production, this should be a database table (PasswordResetToken model).
// ============================================================================

interface ResetTokenData {
  accountId: string
  expiresAt: number
}

const store = new Map<string, ResetTokenData>()
let cleanupCounter = 0

function maybeCleanup() {
  cleanupCounter++
  if (cleanupCounter % 100 === 0) {
    const now = Date.now()
    for (const [token, data] of store) {
      if (data.expiresAt < now) {
        store.delete(token)
      }
    }
  }
}

/**
 * Generate a reset token for an account and store it.
 * Returns the token string (in production, this would be emailed).
 */
export function createResetToken(accountId: string): string {
  maybeCleanup()
  const token = crypto.randomBytes(32).toString("hex")
  store.set(token, {
    accountId,
    expiresAt: Date.now() + 60 * 60 * 1000, // 1 hour
  })
  return token
}

/**
 * Validate a reset token. Returns the accountId if valid, or null if
 * expired/invalid.
 */
export function validateResetToken(token: string): string | null {
  maybeCleanup()
  const data = store.get(token)
  if (!data) return null
  if (data.expiresAt < Date.now()) {
    store.delete(token)
    return null
  }
  return data.accountId
}

/**
 * Consume (delete) a reset token after successful use.
 */
export function consumeResetToken(token: string): void {
  store.delete(token)
}
