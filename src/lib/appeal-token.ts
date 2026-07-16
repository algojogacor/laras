import "server-only"
import { SignJWT, jwtVerify } from "jose"

const ALG = "HS256"

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET
  if (!secret) throw new Error("AUTH_SECRET is not set")
  return new TextEncoder().encode(secret)
}

/**
 * Create a short-lived (24h) appeal token for a suspended user.
 * This token allows the suspended user to file an appeal for a specific
 * moderation case via POST /api/appeals, even though their session is
 * invalidated.
 *
 * In production, this token should be delivered to the suspended user
 * via email notification.
 */
export async function createAppealToken(
  accountId: string,
  caseId: string
): Promise<string> {
  return new SignJWT({ sub: accountId, caseId, type: "appeal" })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(getSecret())
}

/**
 * Verify an appeal token.
 * Returns the account ID and case ID if valid, or null if invalid/expired.
 */
export async function verifyAppealToken(
  token: string
): Promise<{ sub: string; caseId: string } | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret())
    if (payload.type !== "appeal") return null
    const sub = payload.sub as string | undefined
    const caseId = payload.caseId as string | undefined
    if (!sub || !caseId) return null
    return { sub, caseId }
  } catch {
    return null
  }
}
