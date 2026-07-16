import { requireActor, findOwnedDocument, handleAuthorizationError, safeNextResponse } from "@/lib/authorization"

/**
 * Deprecated immediate-revision endpoint. Ownership is still checked so callers
 * cannot use it as an existence oracle, but AI edits must use Artifact Studio's
 * proposal -> preview -> accept/reject workflow.
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireActor(), { id } = await params
    await findOwnedDocument(id, actor)
    return safeNextResponse({ error: "artifact-preview-required", studioUrl: `/documents/${id}/studio` }, { status: 409 })
  } catch (error) { return handleAuthorizationError(error) }
}
