import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { calculateScore } from "@/lib/scoring"
import {
  requireActor,
  isValidId,
  getRequiredProfileId,
  AuthorizationError,
  handleAuthorizationError,
  findOwnedEnglishSession,
} from "@/lib/authorization"

/** POST /api/english/certificate — generate certificate from a completed session. */
export async function POST(request: Request) {
  try {
    const actor = await requireActor()
    const profileId = getRequiredProfileId(actor)

    let body: { sessionId?: string }
    try {
      body = await request.json()
    } catch {
      throw new AuthorizationError("BAD_REQUEST")
    }

    const { sessionId } = body
    if (!isValidId(sessionId)) {
      throw new AuthorizationError("BAD_REQUEST")
    }

    // Authenticate session ownership and scoring status
    const eng = await findOwnedEnglishSession(sessionId, actor)
    if (eng.score === null) {
      throw new AuthorizationError("BAD_REQUEST")
    }

    // Prevent duplicate certificate generation for this session
    const existingCert = await db.englishCertificate.findFirst({
      where: {
        sessionId: eng.id,
        userProfileId: profileId,
        status: "active",
      },
    })
    if (existingCert) {
      throw new AuthorizationError("CONFLICT")
    }

    // Calculate scoring
    const questions = JSON.parse(eng.questions || "[]")
    const correct = Math.round(((eng.score ?? 0) / 100) * questions.length)
    const scoring = calculateScore(correct, questions.length, "LARAS_TOEFL_STYLE")

    // Generate unique certificate ID
    const certId = `LARAS-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`

    const disclaimer = "Bukan sertifikat resmi TOEFL/IELTS. Skor ini adalah estimasi hasil latihan di platform Laras dan tidak dapat menggantikan skor resmi dari ETS, IELTS, British Council, IDP, Cambridge, atau lembaga penguji resmi lainnya."

    const cert = await db.englishCertificate.create({
      data: {
        userProfileId: profileId,
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
  } catch (error) {
    return handleAuthorizationError(error)
  }
}

/** GET /api/english/certificates — list user's certificates. */
export async function GET() {
  try {
    const actor = await requireActor()
    const profileId = getRequiredProfileId(actor)

    const certs = await db.englishCertificate.findMany({
      where: { userProfileId: profileId, status: "active" },
      orderBy: { issuedAt: "desc" },
    })

    return NextResponse.json({ certificates: certs })
  } catch (error) {
    return handleAuthorizationError(error)
  }
}
