import { z } from "zod"
import { db } from "@/lib/db"
import { requireActor, findOwnedDocument, AuthorizationError, handleAuthorizationError, safeNextResponse } from "@/lib/authorization"

const schema = z.object({ expectedVersion: z.number().int().positive(), label: z.string().trim().min(1).max(160).optional() }).strict()
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireActor(); const doc = await findOwnedDocument((await params).id, actor)
    const body = schema.safeParse(await request.json().catch(() => null)); if (!body.success) throw new AuthorizationError("BAD_REQUEST")
    const version = await db.$transaction(async (tx) => {
      const current = await tx.document.findFirst({ where: { id: doc.id, userProfileId: doc.userProfileId }, select: { version: true, content: true, config: true } })
      if (!current || !current.content) throw new AuthorizationError("NOT_FOUND")
      if (current.version !== body.data.expectedVersion) throw new AuthorizationError("CONFLICT")
      const next = current.version + 1
      const created = await tx.documentVersion.create({ data: { documentId: doc.id, versionNumber: next, content: current.content, configSnapshot: current.config || "{}", revisionInstruction: body.data.label || "Manual checkpoint", parentVersionId: (await tx.documentVersion.findFirst({ where: { documentId: doc.id }, orderBy: { versionNumber: "desc" }, select: { id: true } }))?.id || null } })
      await tx.document.update({ where: { id: doc.id }, data: { version: next } })
      return created
    })
    return safeNextResponse({ ok: true, version: { id: version.id, versionNumber: version.versionNumber, createdAt: version.createdAt } }, { status: 201 })
  } catch (error) { return handleAuthorizationError(error) }
}
