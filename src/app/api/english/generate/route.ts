import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSession } from "@/lib/auth"
import { generateReading, generateStructure, generateListening } from "@/lib/content-engine"
import { generateAudioEdgeTTS } from "@/lib/tts-edge"

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
  } else if (mod === "listening") {
    // 1. Generate script + questions via LLM
    const listening = await generateListening({ difficulty })
    if (!listening.script || listening.questions.length === 0) {
      return NextResponse.json({ error: "generation-failed" }, { status: 502 })
    }

    // 2. Generate audio via TTS (z-ai-web-dev-sdk)
    //    Clean the script for TTS (remove "Speaker 1:" labels for natural speech)
    const ttsText = listening.script
      .replace(/Speaker \d+:\s*/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 1020) // TTS limit

    let audioUrl: string | null = null
    try {
      // Use edge-tts (Brief Section 10.3 fallback) instead of ZAI SDK TTS
      audioUrl = await generateAudioEdgeTTS(ttsText, "en-GB-SoniaNeural")
    } catch (e) {
      console.error("[listening] edge-tts failed:", (e as Error).message)
      // Continue without audio — user can still read the script
    }

    // 3. Persist session
    const eng = await db.englishSession.create({
      data: {
        userProfileId: profile.id,
        module: "listening",
        passage: JSON.stringify({ title: listening.title, script: listening.script, speaker: listening.speaker, topic: listening.topic }),
        questions: JSON.stringify(listening.questions),
        audioUrl: audioUrl, // file path in dev, Supabase URL in production
      },
    })

    return NextResponse.json({
      ok: true,
      sessionId: eng.id,
      data: { ...listening, audioUrl: audioUrl },
    })
  }
  return NextResponse.json({ error: "invalid-module" }, { status: 400 })
}
