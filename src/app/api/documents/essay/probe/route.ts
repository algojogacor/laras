import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSession } from "@/lib/auth"
import { generateEssayProbing } from "@/lib/content-engine"

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  let body: { locale?: string; essayType?: string; prompt?: string; targetOrg?: string }
  try { body = await request.json() } catch { return NextResponse.json({ error: "invalid-body" }, { status: 400 }) }

  const profile = await db.userProfile.findUnique({ where: { accountId: session.userId }, select: { docLocale: true } })
  const locale = (body.locale as "id" | "en") || (profile?.docLocale as "id" | "en") || "id"

  try {
    const questions = await generateEssayProbing({
      locale,
      essayType: body.essayType || "scholarship",
      prompt: body.prompt || "",
      targetOrg: body.targetOrg || "",
    })
    return NextResponse.json({ ok: true, questions })
  } catch (e) {
    return NextResponse.json({ error: "probe-failed", message: (e as Error).message }, { status: 502 })
  }
}
