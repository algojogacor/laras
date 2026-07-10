import { NextResponse } from "next/server"
import { LOCALE_COOKIE, LOCALES, DEFAULT_LOCALE, type Locale } from "@/lib/i18n"

export async function POST(request: Request) {
  let body: { locale?: string } = {}
  try {
    body = await request.json()
  } catch {
    body = {}
  }
  const locale = (LOCALES as string[]).includes(body.locale ?? "")
    ? (body.locale as Locale)
    : DEFAULT_LOCALE
  const res = NextResponse.json({ ok: true, locale })
  res.cookies.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  })
  return res
}
