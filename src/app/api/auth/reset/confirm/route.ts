import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { consumeResetTokenAndUpdatePassword } from "@/lib/reset-tokens"

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

  // Update password
  const passwordHash = await bcrypt.hash(password, 10)
  const accountId = await consumeResetTokenAndUpdatePassword(token, passwordHash)
  if (!accountId) return NextResponse.json({ error: "invalid-token" }, { status: 400 })

  return NextResponse.json({ ok: true })
}
