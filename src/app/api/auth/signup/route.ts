import { NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { hashPassword, createSessionToken, setSessionCookie } from "@/lib/auth"

const schema = z.object({
  name: z.string().trim().min(1).max(80),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(128),
  locale: z.enum(["id", "en"]).optional(),
})

export async function POST(request: Request) {
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

  const token = await createSessionToken(account.id)
  await setSessionCookie(token)

  return NextResponse.json({
    ok: true,
    user: { id: account.id, email: account.email, name: account.name },
    onboardingComplete: false,
    profileCompletion: 0,
  })
}
