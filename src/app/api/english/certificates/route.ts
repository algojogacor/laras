import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSession } from "@/lib/auth"
import { calculateScore } from "@/lib/scoring"

/** POST /api/english/certificate — generate certificate from a completed session. */
export async function POST(request: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  let body: { sessionId?: string }
  try { body = await request.json() } catch { return NextResponse.json({ error: "invalid-body" }, { status: 400 }) }

  const profile = await db.userProfile.findUnique({
    where: { accountId: session.userId },
    select: { id: true, fullName: true },
  })
  if (!profile) return NextResponse.json({ error: "no-profile" }, { status: 404 })

  const eng = await db.englishSession.findFirst({
    where: { id: body.sessionId, userProfileId: profile.id, score: { not: null } },
  })
  if (!eng) return NextResponse.json({ error: "session-not-found-or-not-scored" }, { status: 404 })

  // Calculate scoring
  const questions = JSON.parse(eng.questions || "[]")
  const correct = Math.round(((eng.score ?? 0) / 100) * questions.length)
  const scoring = calculateScore(correct, questions.length, "LARAS_TOEFL_STYLE")

  // Generate unique certificate ID
  const certId = `LARAS-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`

  const disclaimer = "Bukan sertifikat resmi TOEFL/IELTS. Skor ini adalah estimasi hasil latihan di platform Laras dan tidak dapat menggantikan skor resmi dari ETS, IELTS, British Council, IDP, Cambridge, atau lembaga penguji resmi lainnya."

  const cert = await db.englishCertificate.create({
    data: {
      userProfileId: profile.id,
      sessionId: eng.id,
      certificateId: certId,
      title: "Laras Practice Score Certificate",
      testMode: eng.module,
      testSpec: "LARAS_TOEFL_STYLE",
      rawScore: correct,
      percentage: eng.score ?? 0,
      estimatedCEFR: scoring.estimatedCEFR,
      estimatedTOEFL: String(scoring.estimatedTOEFL2026),
      estimatedIELTS: scoring.estimatedIELTSBand !== null ? String(scoring.estimatedIELTSBand) : null,
      confidence: scoring.confidence,
      skillBreakdown: JSON.stringify([]),
      questionCount: questions.length,
      disclaimerText: disclaimer,
    },
  })

  return NextResponse.json({ ok: true, certificate: cert })
}

/** GET /api/english/certificates — list user's certificates. */
export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const profile = await db.userProfile.findUnique({
    where: { accountId: session.userId },
    select: { id: true },
  })
  if (!profile) return NextResponse.json({ certificates: [] })

  const certs = await db.englishCertificate.findMany({
    where: { userProfileId: profile.id, status: "active" },
    orderBy: { issuedAt: "desc" },
  })

  return NextResponse.json({ certificates: certs })
}
