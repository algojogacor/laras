import { NextResponse } from "next/server"
import { safeNextResponse } from "@/lib/authorization"
import { z } from "zod"
import { db } from "@/lib/db"
import { verifyPassword, createSessionToken, setSessionCookie, createRefreshToken, setRefreshCookie } from "@/lib/auth"
import { applyRateLimit, getClientIP } from "@/lib/rate-limit"
import { createCsrfToken } from "@/lib/csrf"
import { checkMFA } from "@/lib/mfa"
import { isBetaConfigSafe, isBetaEmailAllowed } from "@/lib/private-beta"

const schema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1).max(128),
  mfaToken: z.string().length(6).regex(/^\d{6}$/).optional(),
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

  const { email, password, mfaToken } = parsed.data
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

  // Keep the response indistinguishable from invalid credentials so the beta
  // allowlist cannot be used to enumerate invited accounts.
  if (!isBetaConfigSafe() || !isBetaEmailAllowed(account.email)) {
    return NextResponse.json({ error: "errInvalid" }, { status: 401 })
  }

  // Check MFA if enabled
  const mfaResult = await checkMFA(account.id, mfaToken)
  if (mfaResult.mfaEnabled && !mfaResult.valid) {
    return NextResponse.json({ error: "mfa-required", message: "MFA token required" }, { status: 401 })
  }

  // Create session and refresh tokens
  const token = await createSessionToken(account.id)
  await setSessionCookie(token)

  const refreshToken = await createRefreshToken(account.id)
  await setRefreshCookie(refreshToken)

  // Generate CSRF token for subsequent mutation requests
  const csrfToken = await createCsrfToken()

  const resp = safeNextResponse({
    ok: true,
    user: { id: account.id, email: account.email, name: account.name },
    onboardingComplete: account.profile?.onboardingComplete ?? false,
    profileCompletion: account.profile?.profileCompletion ?? 0,
    csrfToken,
  })
  resp.headers.set("X-CSRF-Token", csrfToken)
  return resp
}
