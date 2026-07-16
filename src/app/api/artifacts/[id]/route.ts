import { z } from "zod"
import { db } from "@/lib/db"
import { validateDocumentContent } from "@/lib/artifacts/editing"
import { requireActor, findOwnedDocument, handleAuthorizationError, safeNextResponse } from "@/lib/authorization"

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireActor(); const doc = await findOwnedDocument((await params).id, actor)
    return safeNextResponse({ document: { id: doc.id, type: doc.type, title: doc.title, version: doc.version, createdAt: doc.createdAt, updatedAt: doc.updatedAt, content: doc.content ? JSON.parse(doc.content) : null, config: doc.config ? JSON.parse(doc.config) : {} } })
  } catch (error) { return handleAuthorizationError(error) }
}

const patchSchema = z.object({ expectedUpdatedAt: z.string().datetime(), title: z.string().trim().min(1).max(200).optional(), content: z.unknown(), config: z.record(z.string(), z.unknown()).optional() }).strict()

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireActor(); const doc = await findOwnedDocument((await params).id, actor)
    const body = patchSchema.safeParse(await request.json().catch(() => null)); if (!body.success) return safeNextResponse({ error: "invalid-artifact" }, { status: 400 })
    const content = validateDocumentContent(doc.type, body.data.content)
    const result = await db.document.updateMany({ where: { id: doc.id, userProfileId: doc.userProfileId, updatedAt: new Date(body.data.expectedUpdatedAt) }, data: { content: JSON.stringify(content), ...(body.data.title ? { title: body.data.title } : {}), ...(body.data.config ? { config: JSON.stringify(body.data.config) } : {}) } })
    if (result.count !== 1) return safeNextResponse({ error: "stale-artifact", currentVersion: doc.version }, { status: 409 })
    const updated = await db.document.findUniqueOrThrow({ where: { id: doc.id }, select: { updatedAt: true, version: true, title: true } })
    return safeNextResponse({ ok: true, ...updated })
  } catch (error) { return handleAuthorizationError(error) }
}
