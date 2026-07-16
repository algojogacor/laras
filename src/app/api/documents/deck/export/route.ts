import crypto from "crypto"
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { serializeProfile, type ProfileWithRelations } from "@/lib/profile"
import { buildPresentationDeck } from "@/lib/deck-renderer"
import { buildPresentationArtifact } from "@/lib/artifacts/presentation-engine"
import { parsePresentationArtifact } from "@/lib/artifacts/schema"
import { requireActor, getRequiredProfileId, findOwnedDocumentOfType, handleAuthorizationError, safeNextResponse } from "@/lib/authorization"

async function exportDeck(request: Request, recordExport: boolean) {
  try {
    const actor = await requireActor(), profileId = getRequiredProfileId(actor), search = new URL(request.url).searchParams
    const requestedId = search.get("documentId"), rawVersion = search.get("version")
    if (rawVersion && !/^[1-9]\d{0,8}$/.test(rawVersion)) return safeNextResponse({ error: "invalid-version" }, { status: 400 })
    const requestedVersion = rawVersion ? Number(rawVersion) : null
    const doc = requestedId ? await findOwnedDocumentOfType(requestedId, "deck", actor) : await db.document.findFirst({ where: { userProfileId: profileId, type: "deck" }, orderBy: { updatedAt: "desc" } })
    if (!doc) {
      if (recordExport || requestedId || requestedVersion !== null) return safeNextResponse({ error: "artifact-not-found" }, { status: 404 })
      const profile = await db.userProfile.findUnique({
        where: { id: profileId },
        include: {
          experiences: { orderBy: { order: "asc" } },
          educations: { orderBy: { order: "asc" } },
          skills: { orderBy: { order: "asc" } },
          certifications: { orderBy: { order: "asc" } },
          languages: { orderBy: { order: "asc" } },
        },
      }) as ProfileWithRelations | null
      if (!profile) return safeNextResponse({ error: "no-profile" }, { status: 404 })
      const artifact = buildPresentationArtifact({ profile: serializeProfile(profile) }), buffer = await buildPresentationDeck(artifact)
      const safeName = (artifact.title || "deck").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "deck"
      return new NextResponse(buffer as unknown as BodyInit, { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation", "Content-Disposition": `attachment; filename="${safeName}-portfolio.pptx"`, "Cache-Control": "private, no-store", "X-Artifact-Version": "transient" } })
    }
    const version = requestedVersion !== null ? await db.documentVersion.findFirst({ where: { documentId: doc.id, versionNumber: requestedVersion } }) : await db.documentVersion.findFirst({ where: { documentId: doc.id }, orderBy: { versionNumber: "desc" } })
    if (requestedVersion !== null && !version) return safeNextResponse({ error: "version-not-found" }, { status: 404 })
    const content = version?.content || doc.content
    if (!content) return safeNextResponse({ error: "empty-artifact" }, { status: 422 })
    const artifact = parsePresentationArtifact(JSON.parse(content)), buffer = await buildPresentationDeck(artifact), checksum = crypto.createHash("sha256").update(buffer).digest("hex")
    if (recordExport) await db.artifactExport.create({ data: { documentId: doc.id, versionId: version?.id || null, format: "pptx", checksum } })
    const safeName = (artifact.title || "deck").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "deck"
    return new NextResponse(buffer as unknown as BodyInit, { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation", "Content-Disposition": `attachment; filename="${safeName}-portfolio.pptx"`, "Cache-Control": "private, no-store", "X-Artifact-Version": String(version?.versionNumber || doc.version) } })
  } catch (error) { return handleAuthorizationError(error) }
}

export async function GET(request: Request) { return exportDeck(request, false) }
export async function POST(request: Request) { return exportDeck(request, true) }
