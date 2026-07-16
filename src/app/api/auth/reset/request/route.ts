import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { createResetToken } from "@/lib/reset-tokens"
import { applyRateLimit, getClientIP } from "@/lib/rate-limit"

/**
 * POST /api/auth/reset/request
 * Body: { email }
 * Always returns 200 (anti-enumeration).
 * If the email exists, a reset token is generated (in production: emailed).
 */
export async function POST(request: Request) {
  const limited = applyRateLimit(request, "auth", `ip:${getClientIP(request)}:password-reset`)
  if (limited) return limited
  let email: string | undefined
  try {
    const body = await request.json()
    email = body.email?.trim().toLowerCase()
  } catch {
    return NextResponse.json({ ok: true })
  }

  if (!email || typeof email !== "string") {
    return NextResponse.json({ ok: true })
  }

  const account = await db.account.findUnique({
    where: { email },
    select: { id: true },
  })

  if (account) {
    const token = await createResetToken(account.id)
    // In production: send email with reset link containing token
    // For development, the token is available in the store
    // Explicit local-only test transport; never enabled in production.
    if (process.env.NODE_ENV !== "production" && process.env.RESET_TOKEN_DEV_OUTPUT === "true") {
      return NextResponse.json({ ok: true, token })
    }
  }

  return NextResponse.json({ ok: true })
}
