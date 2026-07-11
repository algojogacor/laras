import { NextResponse } from "next/server"
import ZAI from "z-ai-web-dev-sdk"
import { db } from "@/lib/db"
import { applyRateLimit } from "@/lib/rate-limit"
import { serializeProfile, type ProfileWithRelations } from "@/lib/profile"
import {
  requireActor,
  isValidId,
  getRequiredProfileId,
  AuthorizationError,
  handleAuthorizationError,
} from "@/lib/authorization"

let _zai: Awaited<ReturnType<typeof ZAI.create>> | null = null
async function getZai() {
  if (!_zai) _zai = await ZAI.create()
  return _zai
}

/**
 * Follow-up revision API (Brief Task 2).
 * Takes the previous output + user instruction → LLM revises → saves as new version.
 * NEVER overwrites — always creates a new DocumentVersion.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await requireActor()
    const { id: documentId } = await params
    if (!isValidId(documentId)) {
      throw new AuthorizationError("BAD_REQUEST")
    }
    const profileId = getRequiredProfileId(actor)

    let body: { instruction?: string; documentType?: string }
    try {
      body = await request.json()
    } catch {
      throw new AuthorizationError("BAD_REQUEST")
    }

    if (!body.instruction?.trim()) {
      throw new AuthorizationError("BAD_REQUEST")
    }

    // Rate limit: 20 revisions per minute per user (LLM cost-abuse protection)
    const limited = applyRateLimit(request, "generate", `user:${actor.accountId}:revise`)
    if (limited) return limited

    const profile = (await db.userProfile.findUnique({
      where: { id: profileId },
      include: {
        experiences: { orderBy: { order: "asc" } },
        educations: { orderBy: { order: "asc" } },
        skills: { orderBy: { order: "asc" } },
        certifications: { orderBy: { order: "asc" } },
        languages: { orderBy: { order: "asc" } },
      },
    })) as ProfileWithRelations | null
    if (!profile) {
      throw new AuthorizationError("NOT_FOUND")
    }

    // 1. Initial owner-scoped revision read before expensive generation
    const doc = await db.document.findFirst({
      where: { id: documentId, userProfileId: profileId },
      include: {
        versions: { orderBy: { versionNumber: "desc" }, take: 1 },
      },
    })
    if (!doc) {
      throw new AuthorizationError("NOT_FOUND")
    }

    const latestVersion = doc.versions[0]
    const currentContent = latestVersion?.content || doc.content || "{}"
    const config = doc.config ? JSON.parse(doc.config) : {}
    const serialized = serializeProfile(profile)

    // Build revision prompt based on document type
    const isID = config.docLocale === "id"
    const sys = isID
      ? `Kamu editor dokumen profesional. User meminta revisi dari output sebelumnya. Aturan:
  1. Pertahankan HANYA detail yang berasal dari data user — jangan mengarang detail baru.
  2. Ikuti instruksi revisi user: "${body.instruction}".
  3. Jika user meminta detail yang belum ada di profil, beri peringatan dalam field "warnings".
  4. Pertahankan format JSON yang sama dengan output sebelumnya.
  5. Bahasa ${config.docLocale || "id"}, tone ${config.tone || "professional"}.`
      : `You are a professional document editor. The user requests a revision of the previous output. Rules:
  1. Keep ONLY details that come from the user's data — do not invent new details.
  2. Follow the user's revision instruction: "${body.instruction}".
  3. If the user asks for details not in the profile, add a warning in the "warnings" field.
  4. Maintain the same JSON format as the previous output.
  5. Language: ${config.docLocale || "en"}, tone: ${config.tone || "professional"}.`

    const user = `Previous output (JSON):
  ${currentContent}
  
  User's revision instruction: ${body.instruction}
  
  User's real profile data (source of truth — do not invent beyond this):
  - Name: ${serialized.fullName || ""}
  - Experiences: ${serialized.experiences.map((e) => `${e.title} @ ${e.organization}: ${e.contextNotes || e.description || ""}`).join("; ")}
  
  Return the revised output as JSON with the SAME structure as the previous output.`

    let revisedContent: string
    try {
      const zai = await getZai()
      const completion = await zai.chat.completions.create({
        messages: [
          { role: "assistant", content: sys },
          { role: "user", content: user },
        ],
        thinking: { type: "disabled" },
      })
      const raw = completion.choices[0]?.message?.content ?? ""

      // Parse the revised content
      let s = raw.trim()
      const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i)
      if (fence) s = fence[1].trim()
      const first = s.indexOf("{")
      const last = s.lastIndexOf("}")
      if (first !== -1 && last !== -1) s = s.slice(first, last + 1)
      JSON.parse(s) // validate
      revisedContent = s
    } catch (llmError) {
      console.error("[documents/revise] LLM failed:", (llmError as Error).message)

      // Save failed revision request (as validated user owns the document)
      await db.revisionRequest.create({
        data: {
          documentId,
          instruction: body.instruction,
          status: "failed",
        },
      })

      return NextResponse.json({ error: "revision-failed" }, { status: 502 })
    }

    // 2. Transaction after generation with ownership and version revalidation
    const txResult = await db.$transaction(async (tx) => {
      const currentDoc = await tx.document.findFirst({
        where: { id: documentId, userProfileId: profileId },
        select: { id: true, version: true, config: true },
      })
      if (!currentDoc) {
        throw new AuthorizationError("NOT_FOUND")
      }

      // Verify version concurrency
      if (currentDoc.version !== doc.version) {
        throw new AuthorizationError("CONFLICT")
      }

      // Get next version number
      const versionCount = await tx.documentVersion.count({
        where: { documentId },
      })
      const newVersionNumber = versionCount + 1

      // Create new version
      const newVersion = await tx.documentVersion.create({
        data: {
          documentId,
          versionNumber: newVersionNumber,
          content: revisedContent,
          configSnapshot: currentDoc.config || "{}",
          revisionInstruction: body.instruction,
          parentVersionId: latestVersion?.id || null,
        },
      })

      // Create revision request
      await tx.revisionRequest.create({
        data: {
          documentId,
          instruction: body.instruction,
          status: "completed",
          resultVersionId: newVersion.id,
        },
      })

      // Update document's main content and version count
      await tx.document.update({
        where: { id: documentId },
        data: {
          content: revisedContent,
          version: newVersionNumber,
        },
      })

      return {
        versionId: newVersion.id,
        versionNumber: newVersionNumber,
      }
    })

    const revisedData = JSON.parse(revisedContent)
    return NextResponse.json({
      ok: true,
      versionId: txResult.versionId,
      versionNumber: txResult.versionNumber,
      content: revisedData,
    })
  } catch (error) {
    return handleAuthorizationError(error)
  }
}
