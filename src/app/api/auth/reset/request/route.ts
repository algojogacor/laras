import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { createResetToken } from "@/lib/reset-tokens"

/**
 * POST /api/auth/reset/request
 * Body: { email }
 * Always returns 200 (anti-enumeration).
 * If the email exists, a reset token is generated (in production: emailed).
 */
export async function POST(request: Request) {
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
    const token = createResetToken(account.id)
    // In production: send email with reset link containing token
    // For development, the token is available in the store
    void token // suppress unused warning
  }

  return NextResponse.json({ ok: true })
}
