import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSession } from "@/lib/auth"
import { applyRateLimit } from "@/lib/rate-limit"
import { generateReading, generateStructure, generateListening } from "@/lib/content-engine"
import { generateAudioEdgeTTS } from "@/lib/tts-edge"

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  // Rate limit: 20 generations per minute per user (LLM cost-abuse protection)
  const limited = applyRateLimit(request, "generate", `user:${session.userId}:english`)
  if (limited) return limited

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
    // PLAY-TIME (Brief Section 10.3): read from pre-generated bank — NEVER trigger TTS.
    // Only published questions with audioUrl are served to users.
    const bankQuestion = await db.listeningQuestion.findFirst({
      where: {
        published: true,
        audioUrl: { not: null },
        difficulty,
      },
      orderBy: { createdAt: "desc" }, // most recent first (variety)
    })

    if (bankQuestion) {
      // Serve from pre-generated bank — play-time only reads, no TTS call
      const listening = {
        title: bankQuestion.title,
        script: bankQuestion.script,
        speaker: bankQuestion.speaker,
        questions: JSON.parse(bankQuestion.questions),
        difficulty: bankQuestion.difficulty as "easy" | "medium" | "hard",
        topic: bankQuestion.topic,
      }
      const eng = await db.englishSession.create({
        data: {
          userProfileId: profile.id,
          module: "listening",
          passage: JSON.stringify({ title: listening.title, script: listening.script, speaker: listening.speaker, topic: listening.topic }),
          questions: bankQuestion.questions,
          audioUrl: bankQuestion.audioUrl,
        },
      })
      return NextResponse.json({
        ok: true,
        sessionId: eng.id,
        data: { ...listening, audioUrl: bankQuestion.audioUrl },
      })
    }

    // FALLBACK: bank is empty — generate on-the-go (dev mode only, NOT for production)
    // In production, the bank must be pre-filled via scripts/generate-listening-bank.ts
    console.warn("[listening] Bank empty — generating on-the-go (DEV ONLY, not for production)")
    const listening = await generateListening({ difficulty })
    if (!listening.script || listening.questions.length === 0) {
      return NextResponse.json({ error: "generation-failed" }, { status: 502 })
    }

    const ttsText = listening.script
      .replace(/Speaker \d+:\s*/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 1020)

    let audioUrl: string | null = null
    try {
      audioUrl = await generateAudioEdgeTTS(ttsText, "en-GB-SoniaNeural")
    } catch (e) {
      console.error("[listening] edge-tts failed:", (e as Error).message)
    }

    const eng = await db.englishSession.create({
      data: {
        userProfileId: profile.id,
        module: "listening",
        passage: JSON.stringify({ title: listening.title, script: listening.script, speaker: listening.speaker, topic: listening.topic }),
        questions: JSON.stringify(listening.questions),
        audioUrl: audioUrl,
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
