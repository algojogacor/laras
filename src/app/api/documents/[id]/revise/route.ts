import { NextResponse } from "next/server"
import ZAI from "z-ai-web-dev-sdk"
import { db } from "@/lib/db"
import { getSession } from "@/lib/auth"
import { serializeProfile, type ProfileWithRelations } from "@/lib/profile"
import {
  type GeneratedCVATS,
  type GeneratedCoverLetter,
  type GeneratedBio,
  type GeneratedEssay,
} from "@/lib/content-engine"

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
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const { id: documentId } = await params
  let body: { instruction?: string; documentType?: string }
  try { body = await request.json() } catch { return NextResponse.json({ error: "invalid-body" }, { status: 400 }) }

  if (!body.instruction?.trim()) {
    return NextResponse.json({ error: "instruction-required" }, { status: 400 })
  }

  const profile = (await db.userProfile.findUnique({
    where: { accountId: session.userId },
    include: {
      experiences: { orderBy: { order: "asc" } },
      educations: { orderBy: { order: "asc" } },
      skills: { orderBy: { order: "asc" } },
      certifications: { orderBy: { order: "asc" } },
      languages: { orderBy: { order: "asc" } },
    },
  })) as ProfileWithRelations | null
  if (!profile) return NextResponse.json({ error: "no-profile" }, { status: 404 })

  const doc = await db.document.findFirst({
    where: { id: documentId, userProfileId: profile.id },
    include: {
      versions: { orderBy: { versionNumber: "desc" }, take: 1 },
    },
  })
  if (!doc) return NextResponse.json({ error: "not-found" }, { status: 404 })

  // Get the latest content
  const latestVersion = doc.versions[0]
  const currentContent = latestVersion?.content || doc.content || "{}"
  const currentData = JSON.parse(currentContent)
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
    let revisedContent: string
    try {
      // Try to extract JSON from the response
      let s = raw.trim()
      const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i)
      if (fence) s = fence[1].trim()
      const first = s.indexOf("{")
      const last = s.lastIndexOf("}")
      if (first !== -1 && last !== -1) s = s.slice(first, last + 1)
      JSON.parse(s) // validate
      revisedContent = s
    } catch {
      // If LLM didn't return valid JSON, use raw text as content
      revisedContent = raw
    }

    // Save the revision request
    const revision = await db.revisionRequest.create({
      data: {
        documentId,
        instruction: body.instruction,
        status: "completed",
      },
    })

    // Get next version number
    const versionCount = await db.documentVersion.count({ where: { documentId } })
    const newVersionNumber = versionCount + 1

    // Create new version (never overwrite)
    const newVersion = await db.documentVersion.create({
      data: {
        documentId,
        versionNumber: newVersionNumber,
        content: revisedContent,
        configSnapshot: doc.config || "{}",
        revisionInstruction: body.instruction,
        parentVersionId: latestVersion?.id || null,
      },
    })

    // Update the revision request with result
    await db.revisionRequest.update({
      where: { id: revision.id },
      data: { resultVersionId: newVersion.id },
    })

    // Update the document's main content + version count
    await db.document.update({
      where: { id: documentId },
      data: {
        content: revisedContent,
        version: newVersionNumber,
      },
    })

    const revisedData = JSON.parse(revisedContent)
    return NextResponse.json({
      ok: true,
      versionId: newVersion.id,
      versionNumber: newVersionNumber,
      content: revisedData,
    })
  } catch (e) {
    // Mark revision as failed
    await db.revisionRequest.create({
      data: {
        documentId,
        instruction: body.instruction,
        status: "failed",
      },
    })
    return NextResponse.json({ error: "revision-failed", message: (e as Error).message }, { status: 502 })
  }
}
