import { NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { verifyPassword, createSessionToken, setSessionCookie } from "@/lib/auth"
import { applyRateLimit, getClientIP } from "@/lib/rate-limit"

const schema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1).max(128),
})

export async function POST(request: Request) {
  // Rate limit: 10 login attempts per minute per IP (brute-force protection)
  const ip = getClientIP(request)
  const limited = applyRateLimit(request, "auth", `ip:${ip}:login`)
  if (limited) return limited

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "invalid-body" }, { status: 400 })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "errInvalid" }, { status: 400 })
  }

  const { email, password } = parsed.data
  const account = await db.account.findUnique({
    where: { email },
    include: { profile: { select: { onboardingComplete: true, profileCompletion: true } } },
  })
  if (!account) {
    return NextResponse.json({ error: "errInvalid" }, { status: 401 })
  }

  const ok = await verifyPassword(password, account.passwordHash)
  if (!ok) {
    return NextResponse.json({ error: "errInvalid" }, { status: 401 })
  }

  const token = await createSessionToken(account.id)
  await setSessionCookie(token)

  return NextResponse.json({
    ok: true,
    user: { id: account.id, email: account.email, name: account.name },
    onboardingComplete: account.profile?.onboardingComplete ?? false,
    profileCompletion: account.profile?.profileCompletion ?? 0,
  })
}
