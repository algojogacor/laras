import { z } from "zod"
import { db } from "@/lib/db"
import { requireActor, findOwnedDocument, AuthorizationError, handleAuthorizationError, safeNextResponse } from "@/lib/authorization"

const schema = z.object({ expectedVersion: z.number().int().positive() }).strict()
export async function POST(request: Request, { params }: { params: Promise<{ id: string; versionId: string }> }) {
  try {
    const actor = await requireActor(); const { id, versionId } = await params; const doc = await findOwnedDocument(id, actor)
    const body = schema.safeParse(await request.json().catch(() => null)); if (!body.success) throw new AuthorizationError("BAD_REQUEST")
    const restored = await db.$transaction(async (tx) => {
      const [current, source] = await Promise.all([tx.document.findFirst({ where: { id: doc.id, userProfileId: doc.userProfileId } }), tx.documentVersion.findFirst({ where: { id: versionId, documentId: doc.id } })])
      if (!current || !source) throw new AuthorizationError("NOT_FOUND"); if (current.version !== body.data.expectedVersion) throw new AuthorizationError("CONFLICT")
      const next = current.version + 1
      const version = await tx.documentVersion.create({ data: { documentId: doc.id, versionNumber: next, content: source.content, configSnapshot: source.configSnapshot, revisionInstruction: `Restore exact version ${source.versionNumber}`, parentVersionId: source.id } })
      await tx.document.update({ where: { id: doc.id }, data: { content: source.content, config: source.configSnapshot, version: next } })
      return version
    })
    return safeNextResponse({ ok: true, versionNumber: restored.versionNumber, content: JSON.parse(restored.content) })
  } catch (error) { return handleAuthorizationError(error) }
}
