import { NextResponse } from "next/server"
import { safeNextResponse } from "@/lib/authorization"
import { z } from "zod"
import { db } from "@/lib/db"
import { hashPassword, createSessionToken, setSessionCookie, createRefreshToken, setRefreshCookie } from "@/lib/auth"
import { applyRateLimit, getClientIP } from "@/lib/rate-limit"
import { createCsrfToken } from "@/lib/csrf"
import { isBetaConfigSafe, isBetaEmailAllowed } from "@/lib/private-beta"

const schema = z.object({
  name: z.string().trim().min(1).max(80),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(128),
  locale: z.enum(["id", "en"]).optional(),
})

export async function POST(request: Request) {
  // Rate limit: 5 signups per minute per IP (stricter than login — account creation abuse)
  const ip = getClientIP(request)
  const limited = applyRateLimit(request, "signup", `ip:${ip}:signup`)
  if (limited) return limited

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "invalid-body" }, { status: 400 })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    const map: Record<string, string> = {
      name: "errName",
      password: "errWeak",
      email: "errGeneric",
    }
    const key = map[issue.path[0] as string] ?? "errGeneric"
    return NextResponse.json({ error: key }, { status: 400 })
  }

  const { name, email, password, locale } = parsed.data

  if (!isBetaConfigSafe() || !isBetaEmailAllowed(email)) {
    return NextResponse.json({ error: "errInvalid" }, { status: 401 })
  }

  const existing = await db.account.findUnique({ where: { email } })
  if (existing) {
    return NextResponse.json({ error: "errExists" }, { status: 409 })
  }

  const passwordHash = await hashPassword(password)
  const account = await db.account.create({
    data: {
      email,
      name,
      passwordHash,
      profile: {
        create: {
          fullName: name,
          email,
          uiLocale: locale ?? "id",
          docLocale: locale ?? "id",
        },
      },
    },
    include: { profile: true },
  })

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
    onboardingComplete: false,
    profileCompletion: 0,
    csrfToken,
  })
  resp.headers.set("X-CSRF-Token", csrfToken)
  return resp
}
