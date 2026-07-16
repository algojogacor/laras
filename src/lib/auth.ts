import { SignJWT, jwtVerify } from "jose"
import bcrypt from "bcryptjs"
import { cookies } from "next/headers"
import { db } from "@/lib/db"

const COOKIE_NAME = "laras_session"
const REFRESH_COOKIE = "laras_refresh"
const ALG = "HS256"

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET
  if (!secret) throw new Error("AUTH_SECRET is not set")
  return new TextEncoder().encode(secret)
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export async function createSessionToken(userId: string): Promise<string> {
  // Include session version so we can revoke all sessions by incrementing it
  const account = await db.account.findUnique({
    where: { id: userId },
    select: { sessionVersion: true },
  })
  const version = account?.sessionVersion ?? 0

  return new SignJWT({ sub: userId, sv: version })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(getSecret())
}

/**
 * Create a refresh token — longer-lived token for session renewal.
 * Refresh tokens have a 90-day expiry and can be used to rotate session tokens
 * without requiring the user to log in again.
 */
export async function createRefreshToken(userId: string): Promise<string> {
  const account = await db.account.findUnique({
    where: { id: userId },
    select: { refreshTokenVersion: true },
  })
  const version = account?.refreshTokenVersion ?? 0

  return new SignJWT({ sub: userId, rtv: version, type: "refresh" })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime("90d")
    .sign(getSecret())
}

/**
 * Verify a refresh token and return the userId if valid.
 */
export async function verifyRefreshToken(token: string): Promise<{ sub: string; rtv: number } | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret())
    if (payload.type !== "refresh") return null

    // Check that the refresh token version still matches
    const account = await db.account.findUnique({
      where: { id: payload.sub as string },
      select: { refreshTokenVersion: true },
    })
    if (!account) return null
    const rtv = payload.rtv as number
    if (rtv !== account.refreshTokenVersion) return null

    return { sub: payload.sub as string, rtv }
  } catch {
    return null
  }
}

/**
 * Refresh a session: verify the refresh token, then issue new session and refresh tokens.
 * This is the core of the refresh token rotation pattern.
 */
export async function refreshSession(refreshToken: string): Promise<{
  sessionToken: string
  refreshToken: string
} | null> {
  const payload = await verifyRefreshToken(refreshToken)
  if (!payload) return null

  // Atomic rotation: use updateMany with the expected version as a predicate.
  // If another concurrent refresh already incremented the version, the WHERE
  // won't match and count will be 0 — preventing replay attacks.
  // verifyRefreshToken already loaded the expected version into payload.rtv.
  const result = await db.account.updateMany({
    where: {
      id: payload.sub,
      refreshTokenVersion: (payload as any).rtv as number,
    },
    data: { refreshTokenVersion: { increment: 1 } },
  })

  if (result.count === 0) return null // token already consumed (replay or race)

  return {
    sessionToken: await createSessionToken(payload.sub),
    refreshToken: await createRefreshToken(payload.sub),
  }
}

export async function verifySessionToken(token: string): Promise<{ sub: string; sv: number } | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret())
    const sub = payload.sub as string
    const sv = (payload.sv as number) ?? 0

    // Check that the session version still matches (revocation check)
    const account = await db.account.findUnique({
      where: { id: sub },
      select: { sessionVersion: true, suspended: true },
    })
    if (!account) return null
    if (account.sessionVersion !== sv) return null // Session revoked
    if (account.suspended) return null // Suspended user

    return { sub, sv }
  } catch {
    return null
  }
}

export async function getSession(): Promise<{ userId: string; email: string; role: string; suspended: boolean } | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  if (!token) return null
  const payload = await verifySessionToken(token)
  if (!payload) return null
  const account = await db.account.findUnique({
    where: { id: payload.sub },
    select: { id: true, email: true, role: true, suspended: true },
  })
  if (!account) return null
  if (account.suspended) return null
  return { userId: account.id, email: account.email, role: account.role, suspended: account.suspended }
}

/**
 * Revoke all active sessions for a user by incrementing the session version.
 * This invalidates all existing session tokens and refresh tokens immediately.
 *
 * Call this on: password change, account compromise, admin suspension, etc.
 */
export async function revokeSessions(userId: string): Promise<void> {
  await db.account.update({
    where: { id: userId },
    data: {
      sessionVersion: { increment: 1 },
      refreshTokenVersion: { increment: 1 },
    },
  })
}

/**
 * List active sessions for a user.
 * Since we use JWT without server-side session storage, this returns metadata
 * derived from the account record. For full session listing, a Session model
 * would be needed; this provides the essential info.
 *
 * Returns a summary of the current session state for the user.
 */
export async function listActiveSessions(userId: string): Promise<{
  currentSession: boolean
  sessionVersion: number
  refreshTokenVersion: number
  lastUpdated: Date
}> {
  const account = await db.account.findUnique({
    where: { id: userId },
    select: {
      sessionVersion: true,
      refreshTokenVersion: true,
      updatedAt: true,
    },
  })

  if (!account) {
    throw new Error("Account not found")
  }

  return {
    currentSession: true,
    sessionVersion: account.sessionVersion,
    refreshTokenVersion: account.refreshTokenVersion,
    lastUpdated: account.updatedAt,
  }
}

/**
 * Returns true ONLY for owner or admin. Moderator, user, unknown, and
 * anonymous all return false.  This is the gate for the admin UI page and
 * any code path that cannot import the server-only authorization module.
 */
export function isAdminRole(role: string | undefined | null): boolean {
  return role === "admin" || role === "owner"
}

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  })
}

/**
 * Set the refresh token cookie.
 */
export async function setRefreshCookie(token: string) {
  const cookieStore = await cookies()
  cookieStore.set(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 90, // 90 days
  })
}

export async function clearSessionCookie() {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_NAME)
  cookieStore.delete(REFRESH_COOKIE)
}

export const SESSION_COOKIE = COOKIE_NAME
export const REFRESH_COOKIE_NAME = REFRESH_COOKIE
