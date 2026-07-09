import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSession } from "@/lib/auth"
import { generateReading, generateStructure } from "@/lib/content-engine"

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  let body: { module?: string; difficulty?: string; locale?: string }
  try { body = await request.json() } catch { return NextResponse.json({ error: "invalid-body" }, { status: 400 }) }

  const profile = await db.userProfile.findUnique({ where: { accountId: session.userId }, select: { id: true, docLocale: true } })
  if (!profile) return NextResponse.json({ error: "no-profile" }, { status: 404 })

  const locale = (body.locale as "id" | "en") || (profile.docLocale as "id" | "en") || "id"
  const difficulty = (body.difficulty as "easy" | "medium" | "hard") || "medium"
  const mod = body.module || "reading"

  if (mod === "reading") {
    const reading = await generateReading({ locale, difficulty })
    const eng = await db.englishSession.create({
      data: {
        userProfileId: profile.id,
        module: "reading",
        passage: JSON.stringify({ title: reading.title, passage: reading.passage, topic: reading.topic }),
        questions: JSON.stringify(reading.questions),
      },
    })
    return NextResponse.json({ ok: true, sessionId: eng.id, data: reading })
  } else if (mod === "structure") {
    const structure = await generateStructure({ difficulty })
    const eng = await db.englishSession.create({
      data: {
        userProfileId: profile.id,
        module: "structure",
        questions: JSON.stringify(structure.questions),
      },
    })
    return NextResponse.json({ ok: true, sessionId: eng.id, data: structure })
  }
  return NextResponse.json({ error: "invalid-module" }, { status: 400 })
}
