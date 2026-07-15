import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import bcrypt from "bcryptjs"
import { validateResetToken, consumeResetToken } from "@/lib/reset-tokens"
import { revokeSessions } from "@/lib/auth"

/**
 * POST /api/auth/reset/confirm
 * Body: { token, password }
 * Confirms a password reset. Returns 200 on success, 400/404 on invalid token.
 * Revokes all existing sessions on password change for security.
 */
export async function POST(request: Request) {
  let body: { token?: string; password?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "bad-request" }, { status: 400 })
  }

  const token = body.token?.trim()
  const password = body.password

  if (!token || typeof token !== "string") {
    return NextResponse.json({ error: "invalid-token" }, { status: 400 })
  }

  if (!password || typeof password !== "string" || password.length < 8) {
    return NextResponse.json({ error: "weak-password" }, { status: 400 })
  }

  const accountId = validateResetToken(token)
  if (!accountId) {
    return NextResponse.json({ error: "invalid-token" }, { status: 400 })
  }

  // Update password
  const passwordHash = await bcrypt.hash(password, 10)
  await db.account.update({
    where: { id: accountId },
    data: { passwordHash },
  })

  // Consume the token so it can't be reused
  consumeResetToken(token)

  // Revoke all existing sessions for security (password changed)
  await revokeSessions(accountId)

  return NextResponse.json({ ok: true })
}
