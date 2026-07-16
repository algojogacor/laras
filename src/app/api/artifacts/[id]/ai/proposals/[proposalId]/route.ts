import { z } from "zod"
import { db } from "@/lib/db"
import { applyArtifactPatch, validateDocumentContent, type ArtifactDiff } from "@/lib/artifacts/editing"
import { requireActor, findOwnedDocument, AuthorizationError, handleAuthorizationError, safeNextResponse } from "@/lib/authorization"

const schema = z.object({ decision: z.enum(["accept", "reject"]), expectedVersion: z.number().int().positive() }).strict()
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; proposalId: string }> }) {
  try {
    const actor = await requireActor(); const { id, proposalId } = await params; const doc = await findOwnedDocument(id, actor)
    const body = schema.safeParse(await request.json().catch(() => null)); if (!body.success) throw new AuthorizationError("BAD_REQUEST")
    const proposal = await db.revisionRequest.findFirst({ where: { id: proposalId, documentId: doc.id, status: "preview" } }); if (!proposal) throw new AuthorizationError("NOT_FOUND")
    if (body.data.decision === "reject") { await db.revisionRequest.update({ where: { id: proposal.id }, data: { status: "rejected", rejectedAt: new Date() } }); return safeNextResponse({ ok: true, decision: "rejected" }) }
    if (!proposal.proposedContent || proposal.baseVersion !== body.data.expectedVersion) return safeNextResponse({ error: "stale-proposal" }, { status: 409 })
    const proposedContent = proposal.proposedContent
    const result = await db.$transaction(async (tx) => {
      const current = await tx.document.findFirst({ where: { id: doc.id, userProfileId: doc.userProfileId } }); if (!current || !current.content) throw new AuthorizationError("NOT_FOUND")
      if (current.version !== body.data.expectedVersion) throw new AuthorizationError("CONFLICT")
      let nextContent: unknown
      try { nextContent = applyArtifactPatch(JSON.parse(current.content), JSON.parse(proposedContent) as ArtifactDiff); nextContent = validateDocumentContent(current.type, nextContent) } catch { throw new AuthorizationError("CONFLICT") }
      const nextVersion = current.version + 1, parent = await tx.documentVersion.findFirst({ where: { documentId: doc.id }, orderBy: { versionNumber: "desc" }, select: { id: true } })
      const version = await tx.documentVersion.create({ data: { documentId: doc.id, versionNumber: nextVersion, content: JSON.stringify(nextContent), configSnapshot: current.config || "{}", revisionInstruction: proposal.instruction, parentVersionId: parent?.id || null } })
      await tx.document.update({ where: { id: doc.id }, data: { content: JSON.stringify(nextContent), version: nextVersion } })
      await tx.revisionRequest.update({ where: { id: proposal.id }, data: { status: "completed", acceptedAt: new Date(), resultVersionId: version.id } })
      return { version, content: nextContent }
    })
    return safeNextResponse({ ok: true, decision: "accepted", versionNumber: result.version.versionNumber, content: result.content })
  } catch (error) { return handleAuthorizationError(error) }
}
